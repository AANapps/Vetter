import { useEffect, useState } from 'react';
import {
  DocumentData,
  Query,
  QueryConstraint,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { AppNotification, AssessmentTest, Business, FeedComment, FeedPost, JobInvitation, JobPosting, SocialState, User } from '../types';
import { db } from './firebase';
import { Company } from './accounts';
import { initialsAvatar } from '../data/seedCandidates';

/**
 * Everything people create on Vetter, kept in Firestore once accounts are on: jobs (with who they were sent to),
 * company-made tests, applications, candidates' public profiles, the feed, and notifications. Vetter's own test
 * library stays in the code. firestore.rules decides who can read and change each.
 *
 * The app changes its data the same way with or without accounts; with them, each change is compared with what
 * was there and only the difference is written (sync* below), and the snapshots here bring it back.
 */

export interface Viewer {
  uid: string;
  role: 'candidate' | 'recruiter' | 'admin';
  // Set for someone at an active company
  companyId?: string;
  email: string;
}

interface Application {
  jobId: string;
  candidateId: string;
  businessId: string;
  profileId?: string;
  appliedAt: string;
}

type StoredInvitation = JobInvitation & { jobId: string; businessId: string };
interface EmailInvite {
  email: string;
  jobId: string;
  businessId: string;
  invitedAt: string;
}

export interface CloudData {
  jobs: JobPosting[];
  // Tests made in the app; also edits the Vetter team made to library tests
  tests: AssessmentTest[];
  profiles: User[];
  businesses: Business[];
  social: SocialState;
  notifications: AppNotification[];
  // For a candidate: jobs whose tests were emailed to their address, which they're put on once signed in
  emailedJobIds: string[];
}

const kudosId = (itemId: string, uid: string) => `${encodeURIComponent(itemId)}__${uid}`;
export const applicationId = (jobId: string, uid: string) => `${jobId}__${uid}`;

// A company's public page, from its account; details it hasn't filled in yet are left blank
export const businessOf = (c: Company & Partial<Business>): Business => ({
  id: c.id,
  name: c.name,
  logo: c.logo || initialsAvatar(c.name),
  industry: c.industry ?? '',
  headquarters: c.headquarters ?? '',
  companySize: c.companySize ?? '',
  websiteUrl: c.website ?? '',
  description: c.description ?? '',
  techStack: c.techStack ?? [],
});

// Candidates' profiles are public, without their email or where they applied
export const publicProfile = (p: User) => {
  const { avatarUrl: _a, email: _e, appliedJobIds: _j, applicationProfiles: _p, ...rest } = p;
  return rest;
};

const profileFrom = (id: string, { updatedAt: _, ...data }: Partial<User> & { updatedAt?: unknown }): User =>
  ({ verifiedSkills: [], testResults: [], ...data, id, email: '', appliedJobIds: [], avatarUrl: initialsAvatar(data.name ?? '') }) as User;

// Live data for whoever is looking: everyone sees jobs, tests, profiles, companies and the feed; candidates also
// see their own applications, invitations and notifications, and companies those for their own jobs
export function useCloudData(viewer: Viewer | null, enabled: boolean, onError: (err: unknown) => void): CloudData | null {
  const [parts, setParts] = useState<Record<string, unknown[]>>({});
  const [following, setFollowing] = useState<string[]>([]);
  const key = viewer ? `${viewer.uid}:${viewer.role}:${viewer.companyId ?? ''}:${viewer.email}` : 'visitor';

  useEffect(() => {
    if (!enabled) return;
    setParts({});
    setFollowing([]);
    const stops: (() => void)[] = [];
    const watch = (name: string, source: Query<DocumentData>, ...constraints: QueryConstraint[]) =>
      stops.push(
        onSnapshot(
          query(source, ...constraints),
          (snap) => setParts((p) => ({ ...p, [name]: snap.docs.map((d) => ({ ...d.data(), id: d.id })) })),
          (err) => {
            console.error(`Loading ${name} failed`, err);
            setParts((p) => ({ ...p, [name]: p[name] ?? [] }));
            onError(err);
          }
        )
      );
    const d = db();
    watch('jobs', collection(d, 'jobs'));
    watch('tests', collection(d, 'tests'));
    watch('profiles', collection(d, 'profiles'));
    watch('companies', collection(d, 'companies'), where('status', '==', 'active'));
    watch('posts', collection(d, 'posts'));
    watch('comments', collection(d, 'comments'));
    watch('kudos', collection(d, 'kudos'));
    if (viewer) {
      // What's theirs to see: everything for the Vetter team, a company's own jobs, or a candidate's own
      const mine = (field: 'candidateId' | 'businessId'): QueryConstraint[] =>
        viewer.role === 'admin' ? [] : viewer.role === 'recruiter' ? (viewer.companyId ? [where('businessId', '==', viewer.companyId)] : [where(field, '==', '-')]) : [where(field, '==', viewer.uid)];
      watch('applications', collection(d, 'applications'), ...mine('candidateId'));
      watch('invitations', collectionGroup(d, 'invitations'), ...mine('candidateId'));
      watch('emailInvites', collectionGroup(d, 'emailInvites'), ...(viewer.role === 'candidate' ? [where('email', '==', viewer.email.toLowerCase())] : mine('businessId')));
      watch('notifications', collection(d, 'notifications'), where('userId', '==', viewer.uid));
      stops.push(
        onSnapshot(
          doc(d, 'follows', viewer.uid),
          (snap) => setFollowing((snap.data()?.following as string[]) ?? []),
          (err) => onError(err)
        )
      );
    }
    return () => stops.forEach((s) => s());
  }, [enabled, key]);

  const needed = ['jobs', 'tests', 'profiles', 'companies', 'posts', 'comments', 'kudos', ...(viewer ? ['applications', 'invitations', 'emailInvites', 'notifications'] : [])];
  if (!enabled || needed.some((n) => !parts[n])) return null;

  const applications = (parts.applications ?? []) as Application[];
  const invitations = (parts.invitations ?? []) as StoredInvitation[];
  const emailInvites = (parts.emailInvites ?? []) as EmailInvite[];
  const strip = ({ jobId: _j, businessId: _b, id: _i, ...inv }: StoredInvitation & { id?: string }): JobInvitation => inv;

  const jobs = (parts.jobs as JobPosting[]).map((j) => ({
    ...j,
    invitations: invitations.filter((i) => i.jobId === j.id).map(strip),
    invitedEmails: viewer?.role === 'candidate' ? [] : emailInvites.filter((e) => e.jobId === j.id).map((e) => e.email),
  }));

  // Where each candidate applied, as far as the viewer can see
  const profiles = (parts.profiles as (Partial<User> & { id: string })[]).map((p) => {
    const theirs = applications.filter((a) => a.candidateId === p.id);
    return {
      ...profileFrom(p.id, p),
      appliedJobIds: theirs.map((a) => a.jobId),
      applicationProfiles: Object.fromEntries(theirs.filter((a) => a.profileId).map((a) => [a.jobId, a.profileId!])),
    };
  });

  const comments: Record<string, FeedComment[]> = {};
  for (const c of (parts.comments as (FeedComment & { itemId: string })[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const { itemId, ...comment } = c;
    (comments[itemId] ??= []).push(comment);
  }
  const kudos = parts.kudos as { itemId: string; uid: string }[];
  const kudosCounts: Record<string, number> = {};
  for (const k of kudos) if (k.uid !== viewer?.uid) kudosCounts[k.itemId] = (kudosCounts[k.itemId] ?? 0) + 1;

  return {
    jobs,
    tests: parts.tests as AssessmentTest[],
    profiles,
    businesses: (parts.companies as (Company & Partial<Business>)[]).map(businessOf),
    social: {
      posts: (parts.posts as FeedPost[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      comments,
      kudosGiven: kudos.filter((k) => k.uid === viewer?.uid).map((k) => k.itemId),
      kudosCounts,
      following,
    },
    notifications: (parts.notifications ?? []) as AppNotification[],
    emailedJobIds: viewer?.role === 'candidate' ? emailInvites.map((e) => e.jobId) : [],
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const run = (writes: Promise<unknown>[], onError: (err: unknown) => void) => Promise.all(writes).catch(onError);

// Jobs: new ones and changed details, who they were sent to, and the addresses they were emailed to
export function syncJobs(prev: JobPosting[], next: JobPosting[], onError: (err: unknown) => void) {
  const d = db();
  const writes: Promise<unknown>[] = [];
  for (const job of next) {
    const old = prev.find((j) => j.id === job.id);
    if (old === job) continue;
    const { invitations, invitedEmails, ...listing } = job;
    const businessId = job.businessId ?? '';
    if (!old) writes.push(setDoc(doc(d, 'jobs', job.id), listing));
    else {
      const { invitations: _i, invitedEmails: _e, ...oldListing } = old;
      const changed = Object.fromEntries(
        Object.entries(listing).filter(([k, v]) => !same(v, oldListing[k as keyof typeof oldListing]))
      );
      if (Object.keys(changed).length) writes.push(updateDoc(doc(d, 'jobs', job.id), changed));
    }
    for (const inv of invitations) {
      const before = old?.invitations.find((i) => i.candidateId === inv.candidateId);
      if (!same(before, inv)) writes.push(setDoc(doc(d, 'jobs', job.id, 'invitations', inv.candidateId), { ...inv, jobId: job.id, businessId }, { merge: true }));
    }
    for (const email of invitedEmails ?? []) {
      if (old?.invitedEmails?.includes(email)) continue;
      writes.push(setDoc(doc(d, 'jobs', job.id, 'emailInvites', email), { email, jobId: job.id, businessId, invitedAt: new Date().toISOString().split('T')[0] }));
    }
  }
  return run(writes, onError);
}

export function syncTests(prev: AssessmentTest[], next: AssessmentTest[], onError: (err: unknown) => void) {
  const changed = next.filter((t) => prev.find((p) => p.id === t.id) !== t);
  return run(changed.map((t) => setDoc(doc(db(), 'tests', t.id), t)), onError);
}

export function syncNotifications(prev: AppNotification[], next: AppNotification[], onError: (err: unknown) => void) {
  const writes = next.flatMap((n) => {
    const old = prev.find((p) => p.id === n.id);
    if (old === n) return [];
    if (!old) return [setDoc(doc(db(), 'notifications', n.id), n)];
    return old.read !== n.read ? [updateDoc(doc(db(), 'notifications', n.id), { read: n.read })] : [];
  });
  return run(writes, onError);
}

// The feed: posts written or deleted, comments added, kudos given or taken back, and who they follow
export function syncSocial(prev: SocialState, next: SocialState, uid: string, onError: (err: unknown) => void) {
  const d = db();
  const writes: Promise<unknown>[] = [];
  for (const post of next.posts) if (!prev.posts.some((p) => p.id === post.id)) writes.push(setDoc(doc(d, 'posts', post.id), post));
  for (const post of prev.posts) if (!next.posts.some((p) => p.id === post.id)) writes.push(deleteDoc(doc(d, 'posts', post.id)));
  for (const [itemId, list] of Object.entries(next.comments))
    for (const c of list) if (!prev.comments[itemId]?.some((p) => p.id === c.id)) writes.push(setDoc(doc(d, 'comments', c.id), { ...c, itemId }));
  for (const itemId of next.kudosGiven)
    if (!prev.kudosGiven.includes(itemId)) writes.push(setDoc(doc(d, 'kudos', kudosId(itemId, uid)), { itemId, uid }));
  for (const itemId of prev.kudosGiven) if (!next.kudosGiven.includes(itemId)) writes.push(deleteDoc(doc(d, 'kudos', kudosId(itemId, uid))));
  if (!same(prev.following, next.following)) writes.push(setDoc(doc(d, 'follows', uid), { following: next.following }));
  return run(writes, onError);
}

// Applying: the application, which the company sees, and one more on the job's applicant count
export function apply(job: JobPosting, uid: string, profileId: string | undefined) {
  const d = db();
  const batch = writeBatch(d);
  const application: Application = { jobId: job.id, candidateId: uid, businessId: job.businessId ?? '', appliedAt: new Date().toISOString(), ...(profileId && { profileId }) };
  batch.set(doc(d, 'applications', applicationId(job.id, uid)), application);
  batch.update(doc(d, 'jobs', job.id), { applicantCount: increment(1) });
  return batch.commit();
}
