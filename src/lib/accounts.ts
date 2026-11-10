import {
  GoogleAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import { domainOf, isFreeEmail } from './emailDomains';
import type { SectorId } from './sectors';

// What a company sign-up gives before its email is verified, kept on the account until the company is made
export interface CompanySetup {
  name: string;
  website: string;
  noWorkEmail: boolean;
  // The sector it hires in
  sector?: SectorId;
}

/**
 * Accounts, kept in Firestore. firestore.rules enforces the same rules on the server, so none of this can be
 * skipped from the browser.
 *
 * - Candidates sign up with any email and are active once they verify it.
 * - Companies sign up with a work email. Once it's verified, the first person from a domain creates the company
 *   (its id is the domain) and runs it; colleagues from the same domain ask to join and the owner approves them.
 * - Sign-ups without a work email go to the Vetter team for review.
 */

export type AccountRole = 'candidate' | 'recruiter' | 'admin';
// setup: a company sign-up waiting on email verification before its company is created or joined
export type AccountStatus = 'setup' | 'active' | 'pending-approval' | 'pending-review' | 'rejected';

export interface Account {
  uid: string;
  email: string;
  name: string;
  role: AccountRole;
  status: AccountStatus;
  companyId?: string;
  // What a company sign-up entered, used once the email is verified
  companySetup?: CompanySetup;
}

export interface Company {
  id: string;
  name: string;
  website: string;
  // The email domain it belongs to; companies under review have none
  domain?: string;
  ownerUid: string;
  ownerName: string;
  // Only for the Vetter team's review queue, from the owner's account; companies' records are public, so it isn't kept there
  ownerEmail?: string;
  status: 'active' | 'pending-review' | 'rejected';
  // The sector it hires in, picked at sign-up and changed on Your jobs
  sector?: SectorId;
  // The plan it pays for, set by the Vetter team
  plan?: 'free' | 'per-job' | 'growth' | 'scale';
}

export interface MemberRequest {
  uid: string;
  name: string;
  email: string;
  status: 'pending-approval' | 'active' | 'rejected';
}

const userRef = (uid: string) => doc(db(), 'users', uid);
const companyRef = (id: string) => doc(db(), 'companies', id);
const memberRef = (companyId: string, uid: string) => doc(db(), 'companies', companyId, 'members', uid);

// Firebase's messages, in plain words
export function accountError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'There is already an account with this email. Sign in instead.',
    'auth/invalid-email': "That doesn't look like an email address.",
    'auth/weak-password': 'Use a password of at least 8 characters.',
    'auth/invalid-credential': "That email and password don't match an account.",
    'auth/wrong-password': "That email and password don't match an account.",
    'auth/user-not-found': "That email and password don't match an account.",
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': "Couldn't reach Vetter. Check your connection.",
    'permission-denied': "You don't have permission to do that.",
    'auth/popup-closed-by-user': 'The Google window was closed before signing in finished.',
    'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for Vetter and try again.',
    'auth/account-exists-with-different-credential': 'This email already has a Vetter password. Sign in with your password instead.',
  };
  return messages[code] ?? (err instanceof Error ? err.message : 'Something went wrong. Try again.');
}

export async function signUp(input: {
  role: 'candidate' | 'recruiter';
  name: string;
  email: string;
  password: string;
  company?: CompanySetup;
}) {
  if (input.password.length < 8) throw Object.assign(new Error(), { code: 'auth/weak-password' });
  const { user } = await createUserWithEmailAndPassword(auth(), input.email.trim(), input.password);
  await updateProfile(user, { displayName: input.name.trim() });
  await createAccount(user, input);
  await sendEmailVerification(user);
}

// The Vetter account for someone just signed up: a candidate, or a company sign-up waiting to set up its company
export const createAccount = (
  user: FirebaseUser,
  input: { role: 'candidate' | 'recruiter'; name: string; company?: CompanySetup }
) =>
  setDoc(userRef(user.uid), {
    email: user.email,
    name: input.name.trim(),
    role: input.role,
    status: input.role === 'candidate' ? 'active' : 'setup',
    ...(input.company && { companySetup: input.company }),
    createdAt: serverTimestamp(),
  });

// Signing in or up with a Google account. Its email comes verified; whether there's a Vetter account yet is returned
export async function continueWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const { user } = await signInWithPopup(auth(), provider);
  const hasAccount = (await getDoc(userRef(user.uid))).exists();
  return { user, hasAccount };
}

export const signedInWithGoogle = (user: FirebaseUser) => user.providerData.some((p) => p.providerId === 'google.com');

export const signIn = (email: string, password: string) => signInWithEmailAndPassword(auth(), email.trim(), password);
export const signOut = () => firebaseSignOut(auth());
export const resetPassword = (email: string) => sendPasswordResetEmail(auth(), email.trim());
export const resendVerification = () => sendEmailVerification(auth().currentUser!);

// After the link in the email is clicked: refresh, so the server sees the address as verified
export async function refreshVerification(user: FirebaseUser) {
  await user.reload();
  if (auth().currentUser?.emailVerified) await auth().currentUser!.getIdToken(true);
  return !!auth().currentUser?.emailVerified;
}

// A company sign-up's next step once their email is verified: create the company, ask to join it, or go to review
export async function finishCompanySetup(account: Account) {
  const setup = account.companySetup ?? { name: '', website: '', noWorkEmail: true };
  const batch = writeBatch(db());
  if (setup.noWorkEmail || isFreeEmail(account.email)) {
    const id = `review-${account.uid}`;
    batch.set(companyRef(id), {
      name: setup.name,
      website: setup.website,
      ...(setup.sector && { sector: setup.sector }),
      ownerUid: account.uid,
      ownerName: account.name,
      status: 'pending-review',
      createdAt: serverTimestamp(),
    });
    batch.update(userRef(account.uid), { status: 'pending-review', companyId: id });
    return batch.commit();
  }

  const domain = domainOf(account.email);
  const existing = await getDoc(companyRef(domain));
  if (existing.exists()) {
    batch.set(memberRef(domain, account.uid), { name: account.name, email: account.email, status: 'pending-approval', requestedAt: serverTimestamp() });
    batch.update(userRef(account.uid), { status: 'pending-approval', companyId: domain });
  } else {
    batch.set(companyRef(domain), {
      name: setup.name,
      website: setup.website,
      ...(setup.sector && { sector: setup.sector }),
      domain,
      ownerUid: account.uid,
      ownerName: account.name,
      status: 'active',
      createdAt: serverTimestamp(),
    });
    batch.update(userRef(account.uid), { status: 'active', companyId: domain });
  }
  return batch.commit();
}

// The company an email domain already belongs to, to tell a sign-up they'll be joining it
export async function companyForDomain(domain: string): Promise<Company | null> {
  const snap = await getDoc(companyRef(domain));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Company) : null;
}

export function watchAccount(uid: string, onChange: (account: Account | null) => void) {
  return onSnapshot(userRef(uid), (snap) => onChange(snap.exists() ? ({ uid, ...snap.data() } as Account) : null));
}

// The owner changing the sector the company hires in
export const updateCompanySector = (companyId: string, sector: SectorId) => updateDoc(companyRef(companyId), { sector });

export function watchCompany(id: string, onChange: (company: Company | null) => void) {
  return onSnapshot(companyRef(id), (snap) => onChange(snap.exists() ? ({ id, ...snap.data() } as Company) : null));
}

// The company owner's view of colleagues asking to join
export function watchMemberRequests(companyId: string, onChange: (requests: MemberRequest[]) => void) {
  return onSnapshot(collection(db(), 'companies', companyId, 'members'), (snap) =>
    onChange(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as MemberRequest))
  );
}

export async function decideMember(companyId: string, uid: string, approve: boolean) {
  const status = approve ? 'active' : 'rejected';
  const batch = writeBatch(db());
  batch.update(memberRef(companyId, uid), { status });
  batch.update(userRef(uid), { status });
  return batch.commit();
}

// The Vetter team's queue: companies that signed up without a work email. Taken from both sides, so nobody waiting is
// missed: companies marked for review, and accounts marked for review whatever state their company record is in
// (missing, or out of step). `needsFix` says which record the approval has to repair
export type ReviewCompany = Company & { needsFix?: 'missing-company' | 'company-status' };

export async function companiesInReview(): Promise<ReviewCompany[]> {
  const [companies, accounts] = await Promise.all([
    getDocs(query(collection(db(), 'companies'), where('status', '==', 'pending-review'))),
    getDocs(query(collection(db(), 'users'), where('status', '==', 'pending-review'))),
  ]);
  const queue: ReviewCompany[] = companies.docs.map((d) => ({ id: d.id, ...d.data() }) as Company);
  const owners = new Map(accounts.docs.map((d) => [d.id, { uid: d.id, ...d.data() } as Account]));
  for (const owner of owners.values()) {
    if (owner.role !== 'recruiter' || queue.some((c) => c.ownerUid === owner.uid)) continue;
    const id = owner.companyId ?? `review-${owner.uid}`;
    const snap = await getDoc(companyRef(id));
    queue.push(
      snap.exists()
        ? ({ id, ...snap.data(), needsFix: 'company-status' } as ReviewCompany)
        : {
            id,
            name: owner.companySetup?.name || owner.name,
            website: owner.companySetup?.website ?? '',
            ownerUid: owner.uid,
            ownerName: owner.name,
            status: 'pending-review',
            needsFix: 'missing-company',
          }
    );
  }
  return Promise.all(
    queue.map(async (c) => ({ ...c, ownerEmail: owners.get(c.ownerUid)?.email ?? (await getDoc(userRef(c.ownerUid))).data()?.email }))
  );
}

export async function decideCompany(company: ReviewCompany, approve: boolean) {
  const status = approve ? 'active' : 'rejected';
  const batch = writeBatch(db());
  if (company.needsFix === 'missing-company')
    batch.set(companyRef(company.id), {
      name: company.name,
      website: company.website,
      ownerUid: company.ownerUid,
      ownerName: company.ownerName,
      status,
      createdAt: serverTimestamp(),
    });
  else batch.update(companyRef(company.id), { status });
  batch.update(userRef(company.ownerUid), { status, companyId: company.id });
  return batch.commit();
}

export const renameAccount = (uid: string, name: string) => updateDoc(userRef(uid), { name: name.trim() });
