import React, { useEffect, useRef, useState } from 'react';
import { User, UserRole, AssessmentTest, JobPosting, Business, SocialState, AppNotification, JobInvitation } from './types';
import { INITIAL_RECRUITER, INITIAL_BUSINESSES, STANDARD_ASSESSMENTS } from './data/mockData';
import { loadData, saveData, clearData, createSeedData } from './lib/store';
import { getPercentile } from './lib/leaderboard';
import { initialsAvatar, withComputedPercentiles } from './data/seedCandidates';
import { addTestResult } from './lib/results';
import { simulateAttempt, simulateJobTestStep } from './lib/liveActivity';
import { Navigation, AppTab, NAV_TABS } from './components/Navigation';
import { CandidatePortal, CandidateSection } from './components/CandidatePortal';
import { bestProfileFor } from './lib/jobProfiles';
import { RecruiterPortal, BusinessSection } from './components/RecruiterPortal';
import { BusinessesView } from './components/BusinessesView';
import { TestRunner } from './components/TestRunner';
import { TestPage } from './components/TestPage';
import { DiscoverFeed } from './components/DiscoverFeed';
import { LiveLeaderboards } from './components/LiveLeaderboards';
import { FollowSuggestions } from './components/DiscoverSidebar';
import { TestField } from './lib/testRoles';
import { GlobalSearch } from './components/GlobalSearch';
import { PersonProfileModal } from './components/PersonProfileModal';
import { BusinessJobs } from './components/BusinessJobs';
import { JobTestsEditor } from './components/JobTestsEditor';
import { TestGenerator } from './components/TestGenerator';
import { TestBuilder } from './components/TestBuilder';
import { jobTestProgress, withInvitation } from './lib/jobTests';
import { CandidateHome } from './components/CandidateHome';
import { CheckCircle2 } from 'lucide-react';
import { firebaseEnabled } from './lib/firebase';
import { useAccount } from './lib/useAccount';
import { loadProfile, saveProfile } from './lib/profiles';
import { Account, accountError, signOut } from './lib/accounts';
import { Viewer, apply, syncJobs, syncNotifications, syncSocial, syncTests, useCloudData } from './lib/cloud';
import { AuthDialog, AuthMode } from './components/AuthDialog';
import { AccountGate, CompanyReview, TeamRequests } from './components/AccountScreens';
import { Pulse } from './components/Pulse';
import { BusinessLanding } from './components/BusinessLanding';
import { isJobsIndexPath, jobIdFromPath, jobPageTitle, jobPath } from './lib/jobSeo';

const CANDIDATE_SECTIONS: Partial<Record<AppTab, CandidateSection>> = {
  profile: 'profile',
  jobs: 'jobs',
  tests: 'tests',
};

const BUSINESS_SECTIONS: Partial<Record<AppTab, BusinessSection>> = {
  'business-tests': 'tests',
  'business-candidates': 'candidates',
};

// Vetter's own talent team, who post and fill jobs on companies' behalf
const VETTER_TEAM: User = {
  ...INITIAL_RECRUITER,
  id: 'vetter-team',
  name: 'Vetter Talent Team',
  email: 'talent@vetter.dev',
  role: 'admin',
  avatarUrl: initialsAvatar('Vetter Team'),
  title: 'Talent Partner, Vetter',
  businessId: undefined,
};

const today = () => new Date().toISOString().split('T')[0];

// A new candidate account's profile, empty until they take tests
const profileFor = (account: Account): User => ({
  id: account.uid,
  name: account.name,
  email: account.email,
  role: 'candidate',
  avatarUrl: initialsAvatar(account.name),
  title: '',
  location: '',
  yearsExperience: 0,
  workPreference: 'Remote',
  bio: '',
  verifiedSkills: [],
  testResults: [],
  appliedJobIds: [],
});

// Who visitors are shown as, with accounts on: nobody yet, with no results
const VISITOR: User = { ...profileFor({ uid: 'visitor', name: 'Visitor', email: '' } as Account), id: 'visitor' };

// Test pages live at #/tests/<id> so they can be linked to and the back button works
const idFromHash = (kind: 'tests' | 'jobs' | 'exams') => {
  const match = window.location.hash.match(new RegExp(`^#/${kind}/([^?]+)`));
  return match ? decodeURIComponent(match[1]) : null;
};

// Job pages have real addresses (/jobs/<title>-<company>-<id>/) so search engines can list them. Older #/jobs/<id> links
// still open, and so do links to the assessments jobs used to have (#/exams/<id>), which open their job
const LEGACY_EXAM_JOBS: Record<string, string> = { 'exam-001': 'job-004', 'exam-002': 'job-006', 'exam-003': 'job-005' };
const jobIdFromUrl = () => {
  const examId = idFromHash('exams');
  if (examId) return LEGACY_EXAM_JOBS[examId] ?? examId.replace(/^exam-/, '');
  return jobIdFromPath(window.location.pathname) ?? idFromHash('jobs');
};

const SITE_TITLE = 'Vetter - Skills-Based Hiring';

// A company's link to a test carries ?ref=<business id>, like an affiliate link
const refFromHash = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('ref');

// Home is the tests companies sent you; a company starts on its jobs
const initialTab = (): AppTab =>
  window.location.hash === '#/business' || window.location.hash === '#/pricing'
    ? 'for-business'
    : jobIdFromUrl() || isJobsIndexPath(window.location.pathname) ? 'jobs' : idFromHash('tests') ? 'tests' : 'home';

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('candidate');
  const [currentTab, setCurrentTab] = useState<AppTab>(initialTab);

  // Core data: candidates, jobs, tests and companies, loaded from the store and saved on every change
  const [initialData] = useState(loadData);
  const [candidate, setCandidate] = useState<User>(firebaseEnabled ? VISITOR : initialData.candidate);
  const [localOthers, setOtherCandidates] = useState<User[]>(initialData.otherCandidates);
  const candidateRef = useRef(candidate);
  candidateRef.current = candidate;
  // Accounts, when Firebase is set up: who's signed in decides what they see. Without it, Vetter is a demo with a view switcher
  const { loading: accountLoading, user, account, company } = useAccount();
  const [authDialog, setAuthDialog] = useState<{ mode: AuthMode; reason?: string; role?: 'candidate' | 'recruiter' } | null>(null);
  const isVisitor = firebaseEnabled && !user;
  // Runs the action for someone signed in; asks a visitor to create an account first
  const requireAccount = (reason: string, action: () => void) => {
    if (isVisitor) setAuthDialog({ mode: 'sign-up', reason });
    else action();
  };
  const companyBusiness: Business | undefined =
    firebaseEnabled && account?.role === 'recruiter' && account.status === 'active' && company
      ? {
          id: company.id,
          name: company.name,
          logo: initialsAvatar(company.name),
          industry: '',
          headquarters: '',
          companySize: '',
          websiteUrl: company.website,
          description: '',
          techStack: [],
        }
      : undefined;
  const recruiter: User =
    companyBusiness && account
      ? { ...INITIAL_RECRUITER, id: account.uid, name: account.name, email: account.email, avatarUrl: initialsAvatar(account.name), title: `Hiring at ${company!.name}`, businessId: companyBusiness.id }
      : INITIAL_RECRUITER;
  const [localJobs, setLocalJobs] = useState<JobPosting[]>(initialData.jobs);
  const [localTests, setLocalTests] = useState<AssessmentTest[]>(initialData.tests);
  const [localSocial, setLocalSocial] = useState<SocialState>(initialData.social);
  const [localNotifications, setLocalNotifications] = useState<AppNotification[]>(initialData.notifications);

  // With accounts on, everything real comes from Firebase (src/lib/cloud.ts) and changes are written back there;
  // without them, the demo's example data lives in this browser
  const viewer: Viewer | null =
    firebaseEnabled && user?.emailVerified && account?.status === 'active'
      ? { uid: account.uid, role: account.role, companyId: companyBusiness?.id, email: account.email }
      : null;
  const reportCloudError = (err: unknown) => showToast(`Couldn't save or load: ${accountError(err)}`);
  const cloud = useCloudData(viewer, firebaseEnabled && !accountLoading, reportCloudError);
  const jobs = cloud ? cloud.jobs : localJobs;
  // Vetter's library is in the code; the Vetter team's edits to it and tests made in the app come from Firebase
  const tests = cloud
    ? [...STANDARD_ASSESSMENTS.map((t) => cloud.tests.find((c) => c.id === t.id) ?? t), ...cloud.tests.filter((c) => !STANDARD_ASSESSMENTS.some((t) => t.id === c.id))]
    : localTests;
  const cloudBusinesses = cloud ? cloud.businesses : INITIAL_BUSINESSES;
  const businesses: Business[] = companyBusiness
    ? [...cloudBusinesses.filter((b) => b.id !== companyBusiness.id), { ...companyBusiness, ...cloudBusinesses.find((b) => b.id === companyBusiness.id) }]
    : cloudBusinesses;
  const social = cloud ? cloud.social : localSocial;
  const notifications = cloud ? cloud.notifications : localNotifications;
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const testsRef = useRef(tests);
  testsRef.current = tests;
  const socialRef = useRef(social);
  socialRef.current = social;
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  type Update<T> = (prev: T) => T;
  const setJobs = (update: Update<JobPosting[]>) =>
    firebaseEnabled ? syncJobs(jobsRef.current, update(jobsRef.current), reportCloudError) : setLocalJobs(update);
  const setTests = (update: Update<AssessmentTest[]>) =>
    firebaseEnabled ? syncTests(testsRef.current, update(testsRef.current), reportCloudError) : setLocalTests(update);
  const setSocial = (update: Update<SocialState>) =>
    firebaseEnabled
      ? viewer && syncSocial(socialRef.current, update(socialRef.current), viewer.uid, reportCloudError)
      : setLocalSocial(update);
  const setNotifications = (update: Update<AppNotification[]>) =>
    firebaseEnabled ? syncNotifications(notificationsRef.current, update(notificationsRef.current), reportCloudError) : setLocalNotifications(update);

  // The signed-in candidate, when there is one; visitors and companies aren't among the candidates
  const isCandidateAccount = firebaseEnabled && !!viewer && viewer.role === 'candidate' && candidate.id === viewer.uid;
  const otherCandidates = cloud ? cloud.profiles.filter((p) => p.id !== candidate.id) : localOthers;
  const othersRef = useRef(otherCandidates);
  othersRef.current = otherCandidates;

  useEffect(() => {
    if (firebaseEnabled) return;
    saveData({ candidate, otherCandidates, jobs, tests, social, notifications });
  }, [candidate, otherCandidates, jobs, tests, social, notifications]);

  // Changes one person's invitation to a job's tests, adding it if they don't have one yet
  const updateInvitation = (jobId: string, candidateId: string, change: Partial<JobInvitation>) =>
    setJobs((prev) => prev.map((j) => (j.id === jobId ? withInvitation(j, candidateId, change, today()) : j)));

  // Other people keep taking tests while the page is open, every few seconds, so scores and ranks shift live,
  // and work through the jobs' tests companies sent them, so companies see results come in
  useEffect(() => {
    if (firebaseEnabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const recordAttempt = (attempt: { candidateId: string; test: AssessmentTest; result: User['testResults'][number] }) => {
      const updated = othersRef.current.map((c) => (c.id === attempt.candidateId ? addTestResult(c, attempt.test, attempt.result) : c));
      setOtherCandidates(withComputedPercentiles([candidateRef.current, ...updated]).slice(1));
      setCandidate((prev) => withComputedPercentiles([prev, ...updated])[0]);
    };
    const tick = () => {
      if (document.visibilityState === 'visible') {
        const step = Math.random() < 0.5 ? simulateJobTestStep(jobsRef.current, othersRef.current, tests) : null;
        if (step?.kind === 'attempt') recordAttempt(step);
        else if (step) updateInvitation(step.jobId, step.candidateId, { openedAt: new Date().toISOString() });
        else {
          const attempt = simulateAttempt(othersRef.current, tests);
          if (attempt) recordAttempt(attempt);
        }
      }
      timer = setTimeout(tick, 4000 + Math.random() * 6000);
    };
    timer = setTimeout(tick, 3000);
    return () => clearTimeout(timer);
  }, [tests]);

  const [testPageId, setTestPageId] = useState<string | null>(() => idFromHash('tests'));
  const [jobPageId, setJobPageId] = useState<string | null>(jobIdFromUrl);
  const syncPagesFromUrl = () => {
    setTestPageId(idFromHash('tests'));
    setJobPageId(jobIdFromUrl());
  };
  const navigateTo = (url: string) => {
    history.pushState(null, '', url);
    syncPagesFromUrl();
  };
  useEffect(() => {
    window.addEventListener('hashchange', syncPagesFromUrl);
    window.addEventListener('popstate', syncPagesFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncPagesFromUrl);
      window.removeEventListener('popstate', syncPagesFromUrl);
    };
  }, []);

  // A job's page is titled after the job, and an old #/jobs/<id> link moves to the job's real address
  useEffect(() => {
    const job = jobPageId ? jobs.find((j) => j.id === jobPageId) : undefined;
    document.title = job ? jobPageTitle(job) : SITE_TITLE;
    if (job && /^#\/(jobs|exams)\//.test(window.location.hash)) history.replaceState(null, '', jobPath(job));
  }, [jobPageId, jobs]);

  // Following a company's link to a test ties the candidate's results on it back to that company
  useEffect(() => {
    const ref = refFromHash();
    if (!testPageId || !ref || !businesses.some((b) => b.id === ref)) return;
    setCandidate((prev) =>
      prev.testReferrals?.some((r) => r.testId === testPageId && r.businessId === ref)
        ? prev
        : { ...prev, testReferrals: [...(prev.testReferrals ?? []), { testId: testPageId, businessId: ref, at: today() }] }
    );
  }, [testPageId, businesses]);

  // Someone sent a job's tests opening the job: the company sees who opened it and when
  useEffect(() => {
    if (!jobPageId || activeRole !== 'candidate') return;
    const invitation = jobsRef.current.find((j) => j.id === jobPageId)?.invitations.find((i) => i.candidateId === candidateRef.current.id);
    if (invitation && !invitation.openedAt) updateInvitation(jobPageId, candidateRef.current.id, { openedAt: new Date().toISOString() });
  }, [jobPageId, activeRole]);

  // Companies opening a job's link land on that job's results
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  useEffect(() => {
    if (!jobPageId || activeRole === 'candidate') return;
    setSelectedJobId(jobPageId);
    setCurrentTab('business-jobs');
  }, [jobPageId, activeRole]);
  // Choosing a job's tests: the job (or every job, when sending a test from its page) and any tests to add
  const [editingTests, setEditingTests] = useState<{ jobId?: string; addTestIds: string[] } | null>(null);

  // When a candidate takes one of a job's tests from the job, the job they're applying to
  const [activeTestJobId, setActiveTestJobId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<AssessmentTest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Asking Vetter's AI for tests, for a job or on their own; and the builder opened on what it wrote
  const [generator, setGenerator] = useState<{ jobId?: string } | null>(null);
  const [draftBuilder, setDraftBuilder] = useState<{ draft: AssessmentTest; jobId?: string; alsoAdd: string[] } | null>(null);
  // What the candidate's Tests page is narrowed to, e.g. a field picked on Home
  const [testField, setTestField] = useState<TestField | null>(null);
  // Opened from search
  const [profilePersonId, setProfilePersonId] = useState<string | null>(null);
  const [companiesQuery, setCompaniesQuery] = useState('');

  // None while a new company is still being set up
  const recruiterBusiness: Business | undefined = businesses.find((b) => b.id === recruiter.businessId);

  // A signed-in account sees its own side of Vetter; the Vetter team keeps the view switcher
  useEffect(() => {
    if (!firebaseEnabled) return;
    const role: UserRole = !account ? 'candidate' : account.role === 'recruiter' ? 'recruiter' : account.role === 'admin' ? 'admin' : 'candidate';
    if (role !== activeRole) handleRoleChange(role);
    // The business page is for visitors: someone who signs in there goes to their own side
    else if (user && currentTab === 'for-business') goToTab(NAV_TABS[role === 'candidate' ? 'candidate' : 'recruiter'][0].id);
  }, [account?.role, user?.uid]);

  // A candidate account's profile and progress come from their account, so they follow them to any device. Until
  // it has loaded, nothing is saved back (a blank profile mustn't overwrite theirs); saving stays off if it can't load
  const [profileSync, setProfileSync] = useState<{ uid: string; canSave: boolean } | null>(null);
  const candidateAccountUid =
    firebaseEnabled && user?.emailVerified && account?.role === 'candidate' && account.status === 'active' ? account.uid : null;
  useEffect(() => {
    if (!candidateAccountUid || !account) return;
    let cancelled = false;
    loadProfile(candidateAccountUid)
      .then((saved) => {
        if (cancelled) return;
        // Progress made in this browser before it was saved to their account is kept
        const local = candidateRef.current.id === candidateAccountUid ? candidateRef.current : null;
        setCandidate({ ...(saved ?? local ?? profileFor(account)), name: account.name, email: account.email, avatarUrl: initialsAvatar(account.name) });
        setProfileSync({ uid: candidateAccountUid, canSave: true });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Loading profile failed', err);
        if (candidateRef.current.id !== candidateAccountUid) setCandidate(profileFor(account));
        setProfileSync({ uid: candidateAccountUid, canSave: false });
        showToast("Couldn't load your saved progress. Refresh to try again; changes made now won't be saved.");
      });
    return () => {
      cancelled = true;
    };
  }, [candidateAccountUid]);

  // Their name follows the account
  useEffect(() => {
    if (!account || candidate.id !== account.uid || candidate.name === account.name) return;
    setCandidate((prev) => ({ ...prev, name: account.name, avatarUrl: initialsAvatar(account.name) }));
  }, [account?.name]);

  // Saving to their account, a moment after the last change
  const lastSavedProfile = useRef('');
  useEffect(() => {
    if (!profileSync?.canSave || candidate.id !== profileSync.uid) return;
    const json = JSON.stringify(candidate);
    if (json === lastSavedProfile.current) return;
    const timer = setTimeout(() => {
      saveProfile(candidate)
        .then(() => (lastSavedProfile.current = json))
        .catch((err) => {
          console.error('Saving profile failed', err);
          showToast("Couldn't save your progress. Check your connection.");
        });
    }, 800);
    return () => clearTimeout(timer);
  }, [candidate, profileSync]);

  // Signed out, nothing of theirs is left on screen
  useEffect(() => {
    if (!firebaseEnabled || accountLoading || user) return;
    setProfileSync(null);
    lastSavedProfile.current = '';
    if (candidateRef.current.id !== VISITOR.id) setCandidate(VISITOR);
  }, [user, accountLoading]);

  // Where they've applied is kept with each application; it comes back with them on any device
  const ownApplications = cloud?.profiles.find((p) => p.id === candidate.id);
  useEffect(() => {
    if (!isCandidateAccount || !ownApplications) return;
    setCandidate((prev) => {
      const appliedJobIds = [...new Set([...(prev.appliedJobIds ?? []), ...ownApplications.appliedJobIds])];
      const applicationProfiles = { ...ownApplications.applicationProfiles, ...prev.applicationProfiles };
      return appliedJobIds.length === prev.appliedJobIds?.length && Object.keys(applicationProfiles).length === Object.keys(prev.applicationProfiles ?? {}).length
        ? prev
        : { ...prev, appliedJobIds, applicationProfiles };
    });
  }, [isCandidateAccount, JSON.stringify(ownApplications?.appliedJobIds)]);

  // Jobs whose tests were emailed to them before they had an account: they're on the job now, and told about it
  const claimedEmailInvites = useRef(new Set<string>());
  useEffect(() => {
    if (!isCandidateAccount || !cloud) return;
    const jobIds = cloud.emailedJobIds.filter(
      (id) => !claimedEmailInvites.current.has(id) && cloud.jobs.find((j) => j.id === id && !j.invitations.some((i) => i.candidateId === candidate.id))
    );
    if (!jobIds.length) return;
    jobIds.forEach((id) => {
      claimedEmailInvites.current.add(id);
      updateInvitation(id, candidate.id, { via: 'email' });
    });
    notifyInvited(jobIds[0], [candidate.id]);
    jobIds.slice(1).forEach((id) => notifyInvited(id, [candidate.id]));
  }, [isCandidateAccount, cloud?.emailedJobIds.join(), cloud?.jobs.length]);

  // Before a signed-in person can use Vetter: verifying their email, and for companies, being let in
  const accountGate =
    firebaseEnabled &&
    (accountLoading ||
      !cloud ||
      (candidateAccountUid && profileSync?.uid !== candidateAccountUid) ||
      (user?.emailVerified && account?.role === 'recruiter' && account.status === 'active' && company?.status !== 'active')) ? (
      <div className="flex justify-center py-16">
        <Pulse label="Loading" />
      </div>
    ) : firebaseEnabled && user && (!user.emailVerified || !account || account.status !== 'active') ? (
      <AccountGate user={user} account={account} company={company} />
    ) : null;
  const startTest = (test: AssessmentTest) => requireAccount('Create a free account to take this test and get a verified score.', () => setActiveTest(test));

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const goToTab = (tab: AppTab) => {
    if (window.location.hash || window.location.pathname !== '/') navigateTo('/' + window.location.search);
    if (tab === 'for-business') history.replaceState(null, '', '/#/business');
    if (tab === 'business-jobs') setSelectedJobId(null);
    setCurrentTab(tab);
  };

  const openTestPage = (testId: string) => {
    setCurrentTab(activeRole === 'candidate' ? 'tests' : 'business-tests');
    navigateTo(`/#/tests/${encodeURIComponent(testId)}`);
    window.scrollTo(0, 0);
  };

  const openJobPage = (jobId: string) => {
    setCurrentTab('jobs');
    const job = jobs.find((j) => j.id === jobId);
    navigateTo(job ? jobPath(job) : `/jobs/${encodeURIComponent(jobId)}/`);
    window.scrollTo(0, 0);
  };

  // Sending a job's tests to people on Vetter emails them at their login address, puts the job on their Home and notifies them
  const handleInviteToJob = (jobId: string, candidateIds: string[]) => {
    const emailOf = (id: string) => allCandidates.find((c) => c.id === id)?.email || undefined;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              invitations: [
                ...j.invitations,
                ...candidateIds.map((candidateId) => ({ candidateId, invitedAt: today(), via: 'invite' as const, emailedTo: emailOf(candidateId) })),
              ],
            }
          : j
      )
    );
    notifyInvited(jobId, candidateIds);
  };

  // Emailing the link: people with a Vetter account are tracked from now, the rest once they sign up
  const handleEmailJob = (jobId: string, emails: string[]) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const already = new Set(job.invitations.map((i) => i.candidateId));
    const withAccounts = allCandidates.filter((c) => emails.includes(c.email.toLowerCase()) && !already.has(c.id)).map((c) => c.id);
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              invitedEmails: [...new Set([...(j.invitedEmails ?? []), ...emails])],
              invitations: [...j.invitations, ...withAccounts.map((candidateId) => ({ candidateId, invitedAt: today(), via: 'email' as const }))],
            }
          : j
      )
    );
    notifyInvited(jobId, withAccounts);
  };

  const notifyInvited = (jobId: string, candidateIds: string[]) => {
    const now = new Date();
    setNotifications((prev) => [
      ...candidateIds.map((userId, i) => ({
        id: `note-${now.getTime()}-${i}`,
        userId,
        kind: 'job-invite' as const,
        jobId,
        createdAt: now.toISOString(),
        read: false,
      })),
      ...prev,
    ]);
  };

  const openNotification = (id: string) => {
    const note = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (note) openJobPage(note.jobId);
  };

  // A company from search: the Companies page, filtered to it
  const openCompany = (businessId: string) => {
    setCompaniesQuery(businesses.find((b) => b.id === businessId)?.name ?? '');
    goToTab('companies');
    window.scrollTo(0, 0);
  };

  const toggleFollow = (id: string) =>
    setSocial((prev) => ({
      ...prev,
      following: prev.following.includes(id) ? prev.following.filter((f) => f !== id) : [...prev.following, id],
    }));

  // Switch between the candidate, business and Vetter team views
  const handleRoleChange = (nextRole: UserRole) => {
    setActiveRole(nextRole);
    goToTab(NAV_TABS[nextRole === 'candidate' ? 'candidate' : 'recruiter'][0].id);
  };
  // The business and Vetter team views share the same pages
  const staffUser = activeRole === 'admin' ? VETTER_TEAM : recruiter;

  const handleResetData = () => {
    clearData();
    window.location.reload();
  };

  // When candidate applies for a job
  // Sent with one of their job profiles: by default the one that best covers the job
  const handleApplyJob = (jobId: string, profileId?: string) => {
    if (candidate.appliedJobIds?.includes(jobId)) return;
    const job = jobs.find((j) => j.id === jobId);
    const sentWith = profileId ?? (job ? bestProfileFor(candidate, job).id : undefined);

    setCandidate((prev) => ({
      ...prev,
      appliedJobIds: [...(prev.appliedJobIds || []), jobId],
      applicationProfiles: sentWith ? { ...prev.applicationProfiles, [jobId]: sentWith } : prev.applicationProfiles,
    }));

    // Increment job applicants count
    if (firebaseEnabled) {
      if (job && viewer) apply(job, viewer.uid, sentWith).catch(reportCloudError);
      return;
    }
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j))
    );
  };

  // Complete a test in the runner
  const handleCompleteTest = (testId: string, finalScore: number, durationSeconds: number) => {
    const completedTest = tests.find((t) => t.id === testId);
    if (!completedTest) return;

    // Taken for a job, or from a company's link to the test: that company gets the result
    const job = activeTestJobId ? jobs.find((j) => j.id === activeTestJobId) : undefined;
    const referredBy = job?.businessId ?? candidate.testReferrals?.filter((r) => r.testId === testId).at(-1)?.businessId;
    const updatedCandidate = addTestResult(candidate, completedTest, {
      testId,
      score: finalScore,
      completedAt: today(),
      completedTime: new Date().toISOString(),
      durationSeconds,
      referredBy,
    });

    // A new score shifts everyone's standing on this test
    const everyone = withComputedPercentiles([updatedCandidate, ...otherCandidates]);
    setCandidate(everyone[0]);
    setOtherCandidates(everyone.slice(1));

    // Taken for a job: once every one of its tests is done, a pass sends the application (when the tests are required to apply)
    if (job) {
      const progress = jobTestProgress(job, updatedCandidate);
      const applied = candidate.appliedJobIds?.includes(job.id);
      if (progress.status === 'passed' && job.testsRequired && !applied) {
        handleApplyJob(job.id);
        showToast(`You passed ${job.title}'s tests with ${progress.score}/100. Your application to ${job.companyName} has been sent.`);
      } else if (progress.status === 'passed') {
        showToast(`You passed ${job.title}'s tests with ${progress.score}/100.`);
      } else if (progress.status === 'failed') {
        showToast(`You averaged ${progress.score}/100. ${job.title} needs ${job.testPassingScore}. You can retake a test.`);
      } else {
        showToast(`You scored ${finalScore}/100. ${progress.done} of ${progress.total} of ${job.title}'s tests done.`);
      }
      // Started from the job's own page: stay there
      if (!jobPageId) goToTab('jobs');
    } else if (!testPageId) {
      // Started from a test page: stay there so the candidate sees where they now rank
      goToTab(completedTest.type === 'standard' ? 'profile' : 'jobs');
    }

    setActiveTestJobId(null);
    setActiveTest(null);
  };

  // A candidate starting one of a job's tests from the job: the company sees them on the job from now
  const startJobTest = (test: AssessmentTest, jobId: string) => {
    if (isVisitor) {
      setAuthDialog({ mode: 'sign-up', reason: 'Create a free account to take this job’s tests and apply.' });
      return;
    }
    const invitation = jobs.find((j) => j.id === jobId)?.invitations.find((i) => i.candidateId === candidate.id);
    if (!invitation?.startedAt) updateInvitation(jobId, candidate.id, { startedAt: new Date().toISOString() });
    setActiveTest(test);
    setActiveTestJobId(jobId);
  };

  const handleCreateJob = (newJob: JobPosting) => {
    setJobs((prev) => [newJob, ...prev]);
  };

  const handleSaveJobTests = (jobId: string, change: Pick<JobPosting, 'testIds' | 'testPassingScore' | 'testsRequired'>) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...change } : j)));
  };

  const handleUpdateJobRequirements = (jobId: string, requirements: JobPosting['requirements']) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, requirements } : j)));
  };

  const handleCreateTest = (newTest: AssessmentTest) => {
    setTests((prev) => [newTest, ...prev]);
  };

  const handleUpdateTest = (test: AssessmentTest) => {
    setTests((prev) => prev.map((t) => (t.id === test.id ? test : t)));
  };

  // Who a new test belongs to: the job's company, or the company signed in, or the Vetter library
  const testOwnerFor = (jobId?: string) => {
    const job = jobId ? jobs.find((j) => j.id === jobId) : undefined;
    if (job) return businesses.find((b) => b.id === job.businessId);
    return activeRole === 'admin' ? undefined : recruiterBusiness;
  };

  const saveNewTest = (test: AssessmentTest) => {
    const id = `test-${test.type === 'custom' ? 'custom' : 'vetter'}-${Date.now()}`;
    setTests((prev) => [{ ...test, id }, ...prev]);
    return id;
  };

  const addTestsToJob = (jobId: string, testIds: string[]) => {
    const job = jobs.find((j) => j.id === jobId);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, testIds: [...new Set([...j.testIds, ...testIds])] } : j)));
    if (job) showToast(`Added ${testIds.length} ${testIds.length === 1 ? 'test' : 'tests'} to ${job.title}.`);
  };

  // With accounts on, standings are worked out from everyone's real results; visitors and companies aren't candidates
  const allCandidates = firebaseEnabled
    ? withComputedPercentiles(isCandidateAccount ? [candidate, ...otherCandidates] : otherCandidates)
    : [candidate, ...otherCandidates];
  const testPageTest = testPageId ? tests.find((t) => t.id === testPageId) : undefined;
  // A test page replaces the tab's own content
  const detailPage = testPageTest;
  const candidateNotifications = notifications
    .filter((n) => n.userId === candidate.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((n) => {
      const job = jobs.find((j) => j.id === n.jobId);
      if (!job) return [];
      return [
        {
          id: n.id,
          text: `${job.companyName} invited you to take the tests for ${job.title}`,
          detail: `${job.testIds.length} ${job.testIds.length === 1 ? 'test' : 'tests'}${job.closingDate ? ` · closes ${new Date(job.closingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`,
          when: new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          read: n.read,
        },
      ];
    });
  const candidateSection = CANDIDATE_SECTIONS[currentTab];
  const profilePerson = profilePersonId ? allCandidates.find((c) => c.id === profilePersonId) : undefined;
  const businessSection = BUSINESS_SECTIONS[currentTab];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCompaniesQuery('');
          goToTab(tab);
        }}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        accounts={
          firebaseEnabled
            ? {
                signedIn: !!user,
                email: user?.email ?? undefined,
                canSwitchViews: account?.role === 'admin',
                onSignIn: () => setAuthDialog({ mode: 'sign-in' }),
                // From the business page, sign-up starts as a company
                onJoin: () => setAuthDialog({ mode: 'sign-up', role: currentTab === 'for-business' ? 'recruiter' : undefined }),
                onSignOut: () => {
                  signOut();
                  goToTab('home');
                },
              }
            : undefined
        }
        userAvatar={activeRole === 'candidate' ? candidate.avatarUrl : staffUser.avatarUrl}
        userName={activeRole === 'candidate' ? candidate.name : staffUser.name}
        userTitle={
          activeRole === 'candidate'
            ? candidate.title
            : activeRole === 'admin'
            ? staffUser.title
            : recruiterBusiness
            ? `${recruiter.title} · ${recruiterBusiness.name}`
            : recruiter.title
        }
        notifications={activeRole === 'candidate' && !isVisitor ? candidateNotifications : undefined}
        visitorSwitch={isVisitor}
        onOpenNotification={openNotification}
        renderSearch={(mobile) => (
          <GlobalSearch
            people={allCandidates}
            tests={tests}
            // Companies are hidden for now, so search leaves them out
            businesses={[]}
            onOpenPerson={setProfilePersonId}
            onOpenTest={openTestPage}
            onOpenCompany={openCompany}
            onClose={mobile?.onClose}
            autoFocus={!!mobile}
          />
        )}
      />

      <div className="flex-1 min-w-0 flex flex-col pb-14 md:pb-0">
        <main className="flex-1 pb-16 bg-white">
          {accountGate ?? (
          <>
          {activeRole === 'recruiter' && company && account && company.ownerUid === account.uid && companyBusiness && <TeamRequests company={company} />}
          {activeRole === 'admin' && firebaseEnabled && account?.role === 'admin' && <CompanyReview />}
          {currentTab === 'for-business' && <BusinessLanding onJoin={(reason) => setAuthDialog({ mode: 'sign-up', role: 'recruiter', reason })} />}
          {testPageTest && (
            <TestPage
              test={testPageTest}
              tests={tests}
              candidates={allCandidates}
              jobs={jobs}
              viewerRole={activeRole}
              currentCandidateId={activeRole === 'candidate' ? candidate.id : undefined}
              referredByCompany={
                activeRole === 'candidate'
                  ? businesses.find((b) => b.id === candidate.testReferrals?.filter((r) => r.testId === testPageTest.id).at(-1)?.businessId)
                  : undefined
              }
              onSend={activeRole === 'candidate' ? undefined : () => setEditingTests({ addTestIds: [testPageTest.id] })}
              onStartTest={startTest}
              onOpenJob={activeRole === 'candidate' ? openJobPage : undefined}
              onOpenTest={openTestPage}
              onBack={() => goToTab(activeRole === 'candidate' ? 'tests' : 'business-tests')}
            />
          )}

          {!detailPage && activeRole === 'candidate' && candidateSection && (
            <CandidatePortal
              section={candidateSection}
              onNavigate={(section) => goToTab(section)}
              candidate={candidate}
              allCandidates={allCandidates}
              onOpenTest={openTestPage}
              tests={tests}
              jobs={jobs}
              businesses={businesses}
              onStartTest={startTest}
              onStartJobTest={startJobTest}
              onApplyJob={handleApplyJob}
              onUpdateProfiles={(jobProfiles, activeProfileId) =>
                setCandidate((prev) => ({ ...prev, jobProfiles, activeProfileId }))
              }
              onUpdateStudies={(studies) => setCandidate((prev) => ({ ...prev, ...studies }))}
              jobPageId={jobPageId}
              onOpenJob={openJobPage}
              testField={testField}
              onTestFieldChange={setTestField}
              canApply={() => {
                if (isVisitor) setAuthDialog({ mode: 'sign-up', reason: 'Create a free account to apply. Your verified scores go with your application.' });
                return !isVisitor;
              }}
            />
          )}

          {/* Home in three columns: what companies sent you, Discover in the widest middle, and live leaderboards with
              people and companies to follow on the right. Stacked on smaller screens, with the right column above the feed */}
          {!detailPage && activeRole === 'candidate' && currentTab === 'home' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,280px)] gap-6 items-start">
              <CandidateHome
                candidate={candidate}
                jobs={jobs}
                tests={tests}
                businesses={businesses}
                onOpenJob={openJobPage}
                onStartTest={startTest}
                onOpenTest={openTestPage}
                onGoTo={goToTab}
                visitor={isVisitor ? { onJoin: () => setAuthDialog({ mode: 'sign-up' }), onSignIn: () => setAuthDialog({ mode: 'sign-in' }) } : undefined}
              />
              <div className="space-y-4 lg:col-start-3 lg:row-start-1">
                <LiveLeaderboards tests={tests} allCandidates={allCandidates} viewerId={isVisitor ? '' : candidate.id} onOpenTest={openTestPage} />
                <FollowSuggestions
                  viewer={candidate}
                  allCandidates={allCandidates}
                  businesses={businesses}
                  following={social.following}
                  onToggleFollow={(id) => requireAccount('Join Vetter to follow people and companies.', () => toggleFollow(id))}
                />
              </div>
              <DiscoverFeed
                candidate={candidate}
                allCandidates={allCandidates}
                tests={tests}
                jobs={jobs}
                businesses={businesses}
                social={social}
                onSocialChange={setSocial}
                onOpenTest={openTestPage}
                onOpenJob={openJobPage}
                onJoin={isVisitor ? () => setAuthDialog({ mode: 'sign-up', reason: 'Join Vetter to post, comment and follow people.' }) : undefined}
                onOpenField={(field) => {
                  setTestField(field);
                  goToTab('tests');
                  window.scrollTo(0, 0);
                }}
              />
            </div>
          )}

          {!detailPage && currentTab === 'companies' && (
            <BusinessesView
              key={companiesQuery}
              businesses={businesses}
              jobs={jobs}
              tests={tests}
              onSelectJob={activeRole === 'candidate' ? openJobPage : undefined}
              initialQuery={companiesQuery}
            />
          )}

          {!detailPage && activeRole !== 'candidate' && currentTab === 'business-jobs' && (
            <BusinessJobs
              key={activeRole}
              business={activeRole === 'admin' ? undefined : recruiterBusiness}
              businesses={businesses}
              jobs={jobs}
              tests={tests}
              candidates={allCandidates}
              selectedJobId={selectedJobId}
              onSelect={(id) => {
                setSelectedJobId(id);
                window.scrollTo(0, 0);
              }}
              onCreateJob={handleCreateJob}
              onEditTests={(jobId) => setEditingTests({ jobId, addTestIds: [] })}
              onSuggestTests={(jobId) => setGenerator({ jobId })}
              onUpdateJobRequirements={handleUpdateJobRequirements}
              onEmail={handleEmailJob}
              onInvite={handleInviteToJob}
              onOpenPerson={setProfilePersonId}
              onOpenTest={openTestPage}
            />
          )}

          {!detailPage && activeRole !== 'candidate' && businessSection && (
            <RecruiterPortal
              key={activeRole}
              section={businessSection}
              onOpenTest={openTestPage}
              recruiter={staffUser}
              business={activeRole === 'admin' ? undefined : recruiterBusiness}
              businesses={businesses}
              jobs={jobs}
              allCandidates={allCandidates}
              tests={tests}
              onCreateTest={handleCreateTest}
              onUpdateTest={handleUpdateTest}
              onGenerateTest={() => setGenerator({})}
            />
          )}
          </>
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 px-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight">VETTER</span>
            <span>&middot; Skills-based hiring</span>
            {!firebaseEnabled && (
              <button onClick={handleResetData} className="ml-auto text-slate-400 hover:text-slate-700 transition-colors">
                Reset demo data
              </button>
            )}
          </div>
        </footer>
      </div>

      {authDialog && <AuthDialog initialMode={authDialog.mode} reason={authDialog.reason} initialRole={authDialog.role} onClose={() => setAuthDialog(null)} />}

      {editingTests && (
        <JobTestsEditor
          jobs={jobs.filter((j) =>
            editingTests.jobId ? j.id === editingTests.jobId : activeRole === 'admin' || j.businessId === recruiterBusiness?.id
          )}
          tests={tests}
          addTestIds={editingTests.addTestIds}
          onSave={(jobId, change) => {
            handleSaveJobTests(jobId, change);
            setEditingTests(null);
            goToTab('business-jobs');
            setSelectedJobId(jobId);
            window.scrollTo(0, 0);
          }}
          onCancel={() => setEditingTests(null)}
        />
      )}

      {generator && (
        <TestGenerator
          job={generator.jobId ? jobs.find((j) => j.id === generator.jobId) : undefined}
          business={testOwnerFor(generator.jobId)}
          tests={tests}
          onOpenTest={(testId) => {
            setGenerator(null);
            openTestPage(testId);
          }}
          onSaveTest={(test) => {
            const id = saveNewTest(test);
            if (!generator.jobId) showToast(`"${test.title}" saved to your tests.`);
            return id;
          }}
          onAddToJob={addTestsToJob}
          onEditDraft={(draft, alsoAdd) => setDraftBuilder({ draft, jobId: generator.jobId, alsoAdd })}
          onClose={() => setGenerator(null)}
        />
      )}

      {draftBuilder && (
        <TestBuilder
          business={testOwnerFor(draftBuilder.jobId)}
          draft={draftBuilder.draft}
          onSave={(test) => {
            handleCreateTest(test);
            if (draftBuilder.jobId) addTestsToJob(draftBuilder.jobId, [test.id, ...draftBuilder.alsoAdd]);
            else showToast(`"${test.title}" saved to your tests.`);
            setDraftBuilder(null);
          }}
          onCancel={() => setDraftBuilder(null)}
        />
      )}

      {activeTest && (
        <TestRunner
          test={activeTest}
          onClose={() => {
            setActiveTest(null);
            setActiveTestJobId(null);
          }}
          onComplete={handleCompleteTest}
          getPercentileFor={(score) => getPercentile(score, activeTest.id, allCandidates, candidate.id)}
        />
      )}

      {profilePerson && (
        <PersonProfileModal
          person={profilePerson}
          isYou={activeRole === 'candidate' && profilePerson.id === candidate.id}
          isFollowing={social.following.includes(profilePerson.id)}
          onToggleFollow={activeRole === 'candidate' ? () => toggleFollow(profilePerson.id) : undefined}
          onClose={() => setProfilePersonId(null)}
          tests={tests}
          candidates={allCandidates}
          businesses={businesses}
          companyResultsFor={
            activeRole === 'admin' || (activeRole === 'candidate' && profilePerson.id === candidate.id)
              ? 'all'
              : activeRole === 'recruiter'
              ? recruiterBusiness?.id ?? null
              : null
          }
          onOpenTest={openTestPage}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 p-4 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl flex items-center gap-3 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="text-xs font-medium">{toast}</div>
        </div>
      )}
    </div>
  );
}
