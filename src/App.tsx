import type { IntegrityReport } from './lib/integrity';
import { PublicTestReview } from './components/PublicTestReview';
import { AnswerRecord, saveSubmission } from './lib/submissions';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PixelDot } from './components/PixelDot';
import { CurrencyPicker } from './components/CurrencyPicker';
import { User, UserRole, Assignment, TeamMember, AssessmentTest, JobPosting, Business, SocialState, AppNotification, JobInvitation, Lead, TestDraft, TestKind, TrialResult, ResultBreakdown, hasAiTests, madeWithAI, isPublic } from './types';
import { INITIAL_RECRUITER, INITIAL_BUSINESSES, STANDARD_ASSESSMENTS } from './data/mockData';
import { loadData, saveData, clearData, createSeedData } from './lib/store';
import { getPercentile } from './lib/leaderboard';
import { initialsAvatar, withComputedPercentiles } from './data/seedCandidates';
import { buildSampleCandidates } from './data/sampleCandidates';
import { RETAKE_DAYS, addTestResult, nextAttemptAt, removeTestResults } from './lib/results';
import { getLeaderboard } from './lib/leaderboard';
import { simulateAttempt, simulateJobTestStep } from './lib/liveActivity';
import { Navigation, AppTab, NAV_TABS } from './components/Navigation';
import { CandidatePortal, CandidateSection } from './components/CandidatePortal';
import { bestProfileFor } from './lib/jobProfiles';
import { RecruiterPortal, BusinessSection } from './components/RecruiterPortal';
import { BusinessesView } from './components/BusinessesView';
import { TestRunner } from './components/TestRunner';
import { TestPage } from './components/TestPage';
import { DiscoverFeed } from './components/DiscoverFeed';
import { TopPerformers } from './components/TopPerformers';
import { RankedPage } from './components/RankedPage';
import { FollowSuggestions } from './components/DiscoverSidebar';
import { TestField } from './lib/testRoles';
import { GlobalSearch } from './components/GlobalSearch';
import { PersonProfileModal } from './components/PersonProfileModal';
import { backOr, pushPage, replacePage } from './lib/back';
import { CandidateProfilePage } from './components/CandidateProfilePage';
import { BrowseCandidates } from './components/BrowseCandidates';
import { BusinessJobs } from './components/BusinessJobs';
import { JobTestsEditor } from './components/JobTestsEditor';
import { TestGenerator } from './components/TestGenerator';
import { confirmTopUp, pounds } from './lib/aiRequest';
import { TestPlan, TestPlanDialog } from './components/TestPlanDialog';
import { JobForm } from './components/JobForm';
import { CustomIdea } from './lib/testAdvisor';
import { TestBuilder } from './components/TestBuilder';
import { attemptsAt, jobTestProgress, withAttemptFinished, withAttemptStarted, withInvitation } from './lib/jobTests';
import { CandidateHome } from './components/CandidateHome';
import { CheckCircle2 } from 'lucide-react';
import { firebaseEnabled } from './lib/firebase';
import { useAccount } from './lib/useAccount';
import { loadProfile, saveProfile } from './lib/profiles';
import { Account, accountError, signOut, updateCompanySector } from './lib/accounts';
import { Viewer, apply, syncAssignments, syncTeam, syncJobs, syncLeads, syncNotifications, syncSocial, putTestDraft, putTrial, syncTestDrafts, syncTests, useCloudData } from './lib/cloud';
import { LeadsPage } from './components/LeadsPage';
import { LeadChange } from './components/LeadsView';
import { LeadRow, buildLeadRows, updatedLead } from './lib/leads';
import { AuthDialog, AuthMode } from './components/AuthDialog';
import { AccountGate, CompanyReview, TeamRequests } from './components/AccountScreens';
import { Pulse } from './components/Pulse';
import { VisitorHome } from './components/VisitorHome';
import { isJobsIndexPath, jobIdFromPath, jobPageTitle, jobPath } from './lib/jobSeo';
import { LearnPage } from './components/LearnPage';
import { GuidesPage } from './components/GuidesPage';
import { guideBySlug, guideSlugFromPath, isGuidesPath } from './data/guides';
import { CoursePage } from './components/CoursePage';
import { COURSES, courseIdFromPath, coursePath, isLearnIndexPath, isUpskillIndexPath } from './data/courses';
import { useCourseProgress } from './lib/courseProgress';
import { BusinessHome } from './components/BusinessHome';
import { TeamPage } from './components/TeamPage';
import { TeamWork } from './components/TeamWork';
import { TrainingPage } from './components/TrainingPage';
import { PlansDialog } from './components/PlansDialog';
import { AdvisorTurn, HomeBuild, testOutline } from './lib/testAdvisor';
import { jobBrief } from './lib/testGeneration';
import { SectorId, jobInSector, loadSector, roleInSector, saveSector, sectorLabel, testInSector } from './lib/sectors';
import { SectorBar } from './components/SectorPicker';

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

// Every main page has its own address, so back and forward move between them and a refresh stays put.
// Pop-ups (a job's details, a person's profile, editors) have none
const TAB_PATHS: Record<AppTab, string> = {
  home: '/',
  profile: '/profile/',
  jobs: '/jobs/',
  tests: '/tests/',
  companies: '/companies/',
  learn: '/learn/',
  upskill: '/upskill/',
  'business-home': '/business/',
  'business-jobs': '/business/jobs/',
  'business-tests': '/business/tests/',
  'business-candidates': '/business/candidates/',
  'business-team': '/business/team/',
  'business-training': '/business/training/',
  ranked: '/ranked/',
  guides: '/guides/',
};

// A company's own job, at /business/jobs/<id>/
const businessJobIdFromPath = () => {
  const match = window.location.pathname.match(/^\/business\/jobs\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
};

// A candidate's profile as a company sees it, at /business/candidates/<id>/
const businessCandidateIdFromPath = () => {
  const match = window.location.pathname.match(/^\/business\/candidates\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
};

// The pages each side has; companies is on both
const SIDE_TABS: Record<'candidate' | 'staff', AppTab[]> = {
  candidate: ['home', 'tests', 'jobs', 'ranked', 'learn', 'upskill', 'profile', 'companies', 'guides'],
  staff: ['business-home', 'business-jobs', 'business-tests', 'business-candidates', 'business-training', 'business-team', 'companies', 'guides'],
};
const sideOf = (role: UserRole) => (role === 'candidate' ? 'candidate' : 'staff');

// The page the address is for. A test page sits under each side's Tests; a course opened from Upskill keeps Upskill
const tabFromUrl = (role: UserRole, current?: AppTab): AppTab => {
  const { pathname, hash } = window.location;
  // The home page's hiring side, and older links to the business page and its pricing
  if (hash === '#/business' || hash === '#/pricing') return 'home';
  if (idFromHash('tests')) return role === 'candidate' ? 'tests' : 'business-tests';
  if (jobIdFromUrl() || isJobsIndexPath(pathname)) return role === 'candidate' ? 'jobs' : 'business-jobs';
  if (courseIdFromPath(pathname)) return current === 'upskill' ? 'upskill' : 'learn';
  if (isLearnIndexPath(pathname)) return 'learn';
  if (isUpskillIndexPath(pathname)) return 'upskill';
  if (isGuidesPath(pathname)) return 'guides';
  if (businessJobIdFromPath()) return 'business-jobs';
  if (businessCandidateIdFromPath()) return 'business-candidates';
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return (Object.entries(TAB_PATHS).find(([, p]) => p === path)?.[0] as AppTab | undefined) ?? 'home';
};
const initialTab = (): AppTab => tabFromUrl('candidate');
const isHiringHash = () => window.location.hash === '#/business' || window.location.hash === '#/pricing';

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('candidate');
  const [currentTab, setCurrentTab] = useState<AppTab>(initialTab);
  // Read when the address changes, which happens outside React
  const roleRef = useRef(activeRole);
  roleRef.current = activeRole;
  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;

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
          ...(company.sector && { sector: company.sector }),
          ...(company.plan && { plan: company.plan }),
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
  const [localLeads, setLocalLeads] = useState<Lead[]>(initialData.leads);
  const [localTestDrafts, setLocalTestDrafts] = useState<TestDraft[]>(initialData.testDrafts);
  const [localTrials, setLocalTrials] = useState<TrialResult[]>(initialData.trials);
  const [localTeam, setLocalTeam] = useState<TeamMember[]>(initialData.team);
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(initialData.assignments);

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
  const leads = cloud ? cloud.leads : localLeads;
  const testDrafts = cloud ? cloud.testDrafts : localTestDrafts;
  const trials = cloud ? cloud.trials : localTrials;
  const team = cloud ? cloud.team : localTeam;
  const assignments = cloud ? cloud.assignments : localAssignments;
  const teamRef = useRef(team);
  teamRef.current = team;
  const assignmentsRef = useRef(assignments);
  assignmentsRef.current = assignments;
  const testDraftsRef = useRef(testDrafts);
  testDraftsRef.current = testDrafts;
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
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
  const setLeads = (update: Update<Lead[]>) =>
    firebaseEnabled ? syncLeads(leadsRef.current, update(leadsRef.current), reportCloudError) : setLocalLeads(update);
  const setTeam = (update: Update<TeamMember[]>) =>
    firebaseEnabled ? syncTeam(teamRef.current, update(teamRef.current), reportCloudError) : setLocalTeam(update);
  const setAssignments = (update: Update<Assignment[]>) =>
    firebaseEnabled ? syncAssignments(assignmentsRef.current, update(assignmentsRef.current), reportCloudError) : setLocalAssignments(update);
  const setTestDrafts = (update: Update<TestDraft[]>) =>
    firebaseEnabled ? syncTestDrafts(testDraftsRef.current, update(testDraftsRef.current), reportCloudError) : setLocalTestDrafts(update);

  // The signed-in candidate, when there is one; visitors and companies aren't among the candidates
  const isCandidateAccount = firebaseEnabled && !!viewer && viewer.role === 'candidate' && candidate.id === viewer.uid;
  // On the live site, five sample candidates join the real ones (src/data/sampleCandidates.ts)
  const samples = useMemo(() => buildSampleCandidates(STANDARD_ASSESSMENTS), []);
  const otherCandidates = cloud ? [...cloud.profiles.filter((p) => p.id !== candidate.id), ...samples] : localOthers;
  const othersRef = useRef(otherCandidates);
  othersRef.current = otherCandidates;

  useEffect(() => {
    if (firebaseEnabled) return;
    saveData({ candidate, otherCandidates, jobs, tests, social, notifications, leads, testDrafts, trials, team, assignments });
  }, [candidate, otherCandidates, jobs, tests, social, notifications, leads, testDrafts, trials, team, assignments]);

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

  const courseProgress = useCourseProgress();
  const [testPageId, setTestPageId] = useState<string | null>(() => idFromHash('tests'));
  const [jobPageId, setJobPageId] = useState<string | null>(jobIdFromUrl);
  // The company's job open on its side, at /business/jobs/<id>/
  const [selectedJobId, setSelectedJobId] = useState<string | null>(businessJobIdFromPath);
  // A candidate's profile open on the company side, as a page at /business/candidates/<id>/
  const [candidatePageId, setCandidatePageId] = useState<string | null>(businessCandidateIdFromPath);
  // Each course has its own page at /learn/<id>/
  const [coursePageId, setCoursePageId] = useState<string | null>(() => courseIdFromPath(window.location.pathname));
  // The home page's hiring side, at /#/business (and older #/pricing links): for companies, where candidates see theirs
  const [hiringHome, setHiringHome] = useState(isHiringHash);
  // Each guide has its own page at /guides/<slug>/
  const [guideSlug, setGuideSlug] = useState<string | null>(() => guideSlugFromPath(window.location.pathname));
  const syncPagesFromUrl = () => {
    setHiringHome(isHiringHash());
    setGuideSlug(guideSlugFromPath(window.location.pathname));
    setTestPageId(idFromHash('tests'));
    setJobPageId(jobIdFromUrl());
    setCoursePageId(courseIdFromPath(window.location.pathname));
    setSelectedJobId(businessJobIdFromPath());
    setCandidatePageId(businessCandidateIdFromPath());
    const role = roleRef.current;
    const tab = tabFromUrl(role, currentTabRef.current);
    // An address for the other side's page (e.g. back to Home after signing in as a company): your side's first page
    if (!SIDE_TABS[sideOf(role)].includes(tab)) {
      const home = SIDE_TABS[sideOf(role)][0];
      replacePage(TAB_PATHS[home]);
      setCurrentTab(home);
      return;
    }
    setCurrentTab(tab);
  };
  // Opening the page already open adds nothing to the history
  // replace: a redirect rather than a step, so back doesn't land on it
  const navigateTo = (url: string, replace = false) => {
    const here = window.location.pathname + window.location.search + window.location.hash;
    if (url !== here) (replace ? replacePage : pushPage)(url);
    syncPagesFromUrl();
  };
  // A new page starts at the top, however it was reached: a link, a tab, back or forward
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTab, testPageId, jobPageId, coursePageId, selectedJobId, guideSlug, candidatePageId]);
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
    const course = COURSES.find((c) => c.id === coursePageId);
    const guide = guideBySlug(guideSlug);
    document.title = job
      ? jobPageTitle(job)
      : course
        ? `${course.title} | Vetter Learn`
        : guide
          ? `${guide.title} | Vetter Guides`
          : currentTab === 'guides'
            ? 'How-to guides | Vetter'
            : currentTab === 'ranked'
            ? 'Leaderboards | Vetter'
            : SITE_TITLE;
    if (job && /^#\/(jobs|exams)\//.test(window.location.hash)) replacePage(jobPath(job));
  }, [jobPageId, coursePageId, guideSlug, currentTab, jobs]);

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

  // Companies opening a job's link land on that job's results, at its own address on their side
  useEffect(() => {
    if (!jobPageId || activeRole === 'candidate') return;
    replacePage(`/business/jobs/${encodeURIComponent(jobPageId)}/`);
    syncPagesFromUrl();
  }, [jobPageId, activeRole]);
  // Choosing a job's tests: the job (or every job, when sending a test from its page) and any tests to add
  const [editingTests, setEditingTests] = useState<{ jobId?: string; addTestIds: string[] } | null>(null);

  // When a candidate takes one of a job's tests from the job, the job they're applying to
  const [activeTestJobId, setActiveTestJobId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<AssessmentTest | null>(null);
  // Which try at the job's test this is, and the job's limit, when it has one
  const [activeAttempt, setActiveAttempt] = useState<{ number: number; limit?: number } | null>(null);
  // A company or the Vetter team taking a test themselves, as a candidate would; the score is saved for their team
  const [trialTest, setTrialTest] = useState<{ test: AssessmentTest; jobId?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Asking Vetter's AI for tests, for a job or on their own; and the builder opened on what it wrote
  // seed: a first message ready to send, e.g. to rebuild a library test in depth
  // autoSend: the seed is sent as the chat opens, so building starts at once
  // editTestId: a saved test reopened in the chat, to change it by asking
  const [generator, setGenerator] = useState<{ jobId?: string; resume?: TestDraft; seed?: string; autoSend?: boolean; editTestId?: string; kind?: TestKind; fromHome?: boolean; background?: string } | null>(null);
  // What the creator saved while it was open from the home chat, reported in the chat when it closes
  const builtInCreator = useRef<{ test: AssessmentTest; kind: TestKind; testId?: string; draft?: boolean } | null>(null);
  // What a company took from the home chat (ready-made picks, AI tests built or started, the reply's other AI ideas)
  // and the brief of the AI test being built for it. A test saved while one is being built is marked built on the
  // plan; moving from the AI chat to the builder keeps it. The plan then asks whether to create a job for them all
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [planBuilding, setPlanBuilding] = useState<string | null>(null);
  // Back to the chat hides the plan without losing it (or the AI tests built for it)
  const [planOpen, setPlanOpen] = useState(false);
  // The job being created from the plan, with its tests already ticked
  const [planJobTests, setPlanJobTests] = useState<string[] | null>(null);
  const planToBuilder = useRef(false);
  const markPlanBuilt = (testId: string) => {
    if (planBuilding === null) return;
    const brief = planBuilding;
    setTestPlan((p) => (p ? { ...p, ideas: p.ideas.map((x) => (x.idea.brief === brief ? { ...x, testId } : x)) } : p));
    setPlanBuilding(null);
  };
  // draft: what the builder starts from; none for a blank test written by hand
  const [draftBuilder, setDraftBuilder] = useState<{ draft?: AssessmentTest; isCopy?: boolean; jobId?: string; alsoAdd: string[]; record?: TestDraft } | null>(null);
  // The company home's chat with Vetter, kept while moving between pages
  const [advisorTurns, setAdvisorTurns] = useState<AdvisorTurn[]>([]);
  // The test the home chat is building or changing, and something to start the chat with from elsewhere
  const [homeBuild, setHomeBuild] = useState<HomeBuild | null>(null);
  const [homeSeed, setHomeSeed] = useState<{ text: string; jobId?: string } | undefined>(undefined);
  // Plans, shown when AI test creation is asked for without one
  const [plansOpen, setPlansOpen] = useState(false);
  // What the candidate's Tests page is narrowed to, e.g. a field picked on Home
  const [testField, setTestField] = useState<TestField | null>(null);
  // The sector the candidate browses: tests, jobs, leaderboards, the feed and courses all narrow to it
  const [sector, setSectorState] = useState<SectorId>(loadSector);
  const setSector = (next: SectorId) => {
    setSectorState(next);
    saveSector(next);
    // A role or field picked on the Tests page goes when it's outside the new sector
    if (testField && !testField.roles.some(roleInSector(next))) setTestField(null);
  };
  // Opened from search
  const [profilePersonId, setProfilePersonId] = useState<string | null>(null);
  const [companiesQuery, setCompaniesQuery] = useState('');

  // The Vetter team in the company view picks a real company to see it as (the demo company isn't one on the live
  // site), kept on this device
  const adminAsCompany = firebaseEnabled && account?.role === 'admin';
  const [adminCompanyId, setAdminCompanyIdState] = useState(() => {
    try {
      return localStorage.getItem('vetter.adminCompany') ?? '';
    } catch {
      return '';
    }
  });
  const setAdminCompanyId = (id: string) => {
    setAdminCompanyIdState(id);
    try {
      localStorage.setItem('vetter.adminCompany', id);
    } catch {
      // Private windows can refuse storage; the pick then lasts for the visit
    }
  };
  // None while a new company is still being set up
  const recruiterBusiness: Business | undefined = adminAsCompany
    ? businesses.find((b) => b.id === adminCompanyId) ?? businesses.find((b) => b.id === recruiter.businessId) ?? businesses[0]
    : businesses.find((b) => b.id === recruiter.businessId);

  // The home chat is kept on this device per company, so a reload doesn't lose what was said and picked. Library tests in
  // it are stored by id and looked up again
  const homeChatKey = activeRole === 'recruiter' && recruiterBusiness ? `vetter.homeChat.${recruiterBusiness.id}` : null;
  const homeChatLoaded = useRef<string | null>(null);
  useEffect(() => {
    if (!homeChatKey || homeChatLoaded.current === homeChatKey || !tests.length) return;
    homeChatLoaded.current = homeChatKey;
    try {
      const saved = JSON.parse(localStorage.getItem(homeChatKey) ?? 'null') as (AdvisorTurn & { existingIds?: { testId: string; reason: string }[] })[] | null;
      if (!saved?.length) return;
      setAdvisorTurns(
        saved.map(({ existingIds, ...t }) => ({
          ...t,
          ...(existingIds && { existing: existingIds.flatMap(({ testId, reason }) => tests.filter((x) => x.id === testId).map((test) => ({ test, reason }))) }),
        }))
      );
    } catch {
      // Storage refused or the saved chat is unreadable: start a new one
    }
  }, [homeChatKey, tests.length]);
  useEffect(() => {
    if (!homeChatKey || homeChatLoaded.current !== homeChatKey) return;
    try {
      const slim = advisorTurns.slice(-40).map(({ existing, ...t }) => ({ ...t, ...(existing?.length && { existingIds: existing.map((e) => ({ testId: e.test.id, reason: e.reason })) }) }));
      localStorage.setItem(homeChatKey, JSON.stringify(slim));
    } catch {
      // Private windows can refuse storage; the chat then lasts for this visit
    }
  }, [advisorTurns, homeChatKey]);
  // Tests written by AI come with a paid plan; the Vetter team always has them. Everything else is free
  // For now every company gets AI test creation, whatever its plan; set to false to put it back behind paid plans
  const AI_TESTS_FOR_ALL = true;
  const aiAllowed = AI_TESTS_FOR_ALL || activeRole === 'admin' || hasAiTests(recruiterBusiness);
  // A company's own test made with Vetter's AI is edited in the test chat (asking, editing by hand, the full builder);
  // one made by hand is edited in the builder, and enhanced with AI to move it to the chat. Without AI tests on the
  // plan, everything is by hand
  const editOwnTest = (testId: string, jobId?: string) => {
    const test = tests.find((t) => t.id === testId);
    if (!test) return;
    if (aiAllowed && madeWithAI(test)) return enhanceTest(testId, jobId);
    setDraftBuilder({ draft: test, jobId, alsoAdd: [] });
  };
  // The test chat on a saved test, picking up changes saved as a draft earlier where they were left
  const enhanceTest = (testId: string, jobId?: string) => {
    const pending = testDrafts.find((d) => d.editsTestId === testId);
    if (pending) openGenerator({ jobId: pending.jobId ?? jobId, resume: pending });
    else editInChat(testId);
  };

  // Tests are made and changed in the home chat: this starts it with a message (and the job the test is for)
  const startInChat = (text: string, jobId?: string) => {
    if (!aiAllowed) return setPlansOpen(true);
    if (homeBuild?.working) return showToast('Vetter is still building a test in the chat. Wait for it, or press Stop there.');
    setHomeSeed({ text, ...(jobId && { jobId }) });
    goToTab('business-home');
  };
  // A saved test opened in the home chat to change by asking
  const editInChat = (testId: string) => {
    const test = tests.find((t) => t.id === testId);
    if (!test) return;
    if (!aiAllowed) return setPlansOpen(true);
    if (homeBuild?.working) return showToast('Vetter is still building a test in the chat. Wait for it, or press Stop there.');
    const kind = test.purpose === 'training' ? 'training' : test.scenario ? 'simulation' : 'test';
    setHomeBuild({ chat: { messages: [], existing: [], draft: test }, kind, testId, working: false });
    setAdvisorTurns((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: `What would you like to change in "${test.title}"? Tell me here and I'll change it and save it.`,
        created: {
          title: test.title,
          kind,
          testId,
          questions: test.questions.filter((q) => q.type !== 'case').length,
          apps: test.questions.filter((q) => q.type === 'app').length,
          description: test.description,
          outline: testOutline(test),
        },
      },
    ]);
    goToTab('business-home');
  };

  const openGenerator = (g: { jobId?: string; resume?: TestDraft; seed?: string; autoSend?: boolean; editTestId?: string; kind?: TestKind; fromHome?: boolean; background?: string }) => {
    if (!aiAllowed) return setPlansOpen(true);
    // One build at a time: a minimised one would be lost if another replaced it
    if (generator) return showToast("You've got one being built already. Open it from the tab in the corner, and close it before starting another.");
    builtInCreator.current = null;
    setGenerator(g);
  };
  // The home chat as the creator is told it: what the company said and picked, in order, and what Vetter asked
  const homeChatSummary = (turns: AdvisorTurn[]) =>
    turns
      .slice(-16)
      .map((t) => (t.role === 'user' ? `Company: ${t.text}` : `Vetter: ${t.text}${t.brief ? `\n(The role: ${t.brief})` : ''}`))
      .join('\n')
      .slice(-5000);
  // Back in the home chat after the creator: one short message saying what was made and where it is, then simply asking
  // what they'd like to do next; whatever they say goes to the chat as usual
  const reportBuild = () => {
    const built = builtInCreator.current;
    builtInCreator.current = null;
    if (!built) return;
    const { test, kind, testId, draft } = built;
    const apps = test.questions.filter((q) => q.type === 'app').length;
    const what = kind === 'standalone' ? 'interactive simulation' : kind === 'training' ? 'training' : 'job simulation test';
    const turn: AdvisorTurn = {
      role: 'assistant',
      text: draft
        ? `Your ${what} "${test.title}" is saved as a draft, so you can pick it up any time from your test library. What would you like to do next?`
        : `Done! Your ${what} "${test.title}" is saved in your test library. What would you like to do next?`,
      created: { title: test.title, kind, testId, draft, questions: test.questions.filter((q) => q.type !== 'case').length, apps },
    };
    setAdvisorTurns((prev) => [...prev, turn]);
  };
  // Builds one of the home chat's AI ideas straight away; the test plan opens with it once it's saved (or closed)
  const startPlanBuild = (idea: CustomIdea) => {
    setPlanBuilding(idea.brief);
    setPlanOpen(true);
    openGenerator({ seed: idea.brief, autoSend: true });
  };
  const ourJobs = activeRole === 'admin' ? jobs : jobs.filter((j) => j.businessId === recruiterBusiness?.id);

  // Until it's known who's looking and the app is on their side, the menu shows only the logo, so a page load never
  // flashes the signed-out, candidate or business menu before the right one
  const [roleSettledFor, setRoleSettledFor] = useState<string | null>(null);
  // A signed-in account sees its own side of Vetter; the Vetter team keeps the view switcher
  // Once it's known who's looking, the address is checked against their side: another side's page sends them to their own
  useEffect(() => {
    if (firebaseEnabled && accountLoading) return;
    const role: UserRole = !firebaseEnabled
      ? activeRole
      : !account
      ? 'candidate'
      : account.role === 'recruiter'
      ? 'recruiter'
      : account.role === 'admin'
      ? 'admin'
      : 'candidate';
    if (role !== activeRole) handleRoleChange(role);
    else syncPagesFromUrl();
    setRoleSettledFor(user?.uid ?? '');
  }, [accountLoading, account?.role, user?.uid]);
  const expectedRole: UserRole = account?.role === 'recruiter' ? 'recruiter' : account?.role === 'admin' ? 'admin' : 'candidate';
  const navPending =
    firebaseEnabled &&
    (accountLoading ||
      roleSettledFor !== (user?.uid ?? '') ||
      (!!user && (!account || (account.role !== 'admin' && expectedRole !== activeRole))));

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
      // Signed in, but the app hasn't switched to their side yet: wait, rather than show the other side's page
      (navPending && !!account) ||
      !cloud ||
      (candidateAccountUid && profileSync?.uid !== candidateAccountUid) ||
      (user?.emailVerified && account?.role === 'recruiter' && account.status === 'active' && company?.status !== 'active')) ? (
      <div className="flex justify-center py-16">
        <Pulse label="Loading" />
      </div>
    ) : firebaseEnabled && user && (!user.emailVerified || !account || account.status !== 'active') ? (
      <AccountGate user={user} account={account} company={company} />
    ) : null;
  const startTest = (test: AssessmentTest) =>
    activeRole !== 'candidate'
      ? setTrialTest({ test })
      : requireAccount('Create a free account to take this test and get a verified score.', () => {
          // A library test can be taken again once the retake gap has passed since the last start
          const next = isPublic(test) ? nextAttemptAt(candidate, test.id) : null;
          if (next) return showToast(`You can take "${test.title}" again from ${next.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. Each library test can be taken once every ${RETAKE_DAYS} days.`);
          setActiveTest(test);
        });
  // Pressing Begin on a library test is an attempt, finished or not
  const recordTestStart = (test: AssessmentTest) =>
    setCandidate((prev) => ({ ...prev, testStarts: [...(prev.testStarts ?? []), { testId: test.id, startedAt: new Date().toISOString() }] }));
  // Where a score would place them on a library test's board, against everyone else's best
  const rankFor = (testId: string, score: number) => {
    const others = getLeaderboard(testId, allCandidates.filter((c) => c.id !== candidate.id));
    return { rank: others.filter((e) => e.score > score).length + 1, of: others.length + 1 };
  };

  const showToast = (message: string, ms = 4000) => {
    setToast(message);
    setTimeout(() => setToast(null), ms);
  };

  // Back from paying for AI credit (Stripe opened in its own tab): the payment is confirmed and credited, and the
  // company told it can go back to the tab it was working in. Once signed in, since the credit is the company's
  const creditReturn = useRef(new URLSearchParams(window.location.search));
  useEffect(() => {
    const params = creditReturn.current;
    const status = params.get('credits');
    if (!status || (firebaseEnabled && !user)) return;
    creditReturn.current = new URLSearchParams();
    const url = new URL(window.location.href);
    url.searchParams.delete('credits');
    url.searchParams.delete('session_id');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    const sessionId = params.get('session_id');
    if (status !== 'paid' || !sessionId) return showToast('Payment cancelled. Nothing was charged.');
    confirmTopUp(sessionId).then((c) =>
      showToast(
        c.error ? c.error : c.added ? `${pounds(c.added)} of AI credit added. Close this tab and carry on where you were.` : "Your payment is still going through. It'll show in a minute.",
        10000
      )
    );
  }, [user?.uid]);

  const goToTab = (tab: AppTab, replace = false) => {
    const path = TAB_PATHS[tab];
    navigateTo(tab === 'home' ? '/' + window.location.search : path, replace);
    setCurrentTab(tab);
  };

  // One of a company's jobs, or the list of them
  // Companies open a candidate's profile as a page of its own; candidates see each other's in a pop-up
  const openPerson = (personId: string) => {
    if (roleRef.current === 'candidate') return setProfilePersonId(personId);
    navigateTo(`/business/candidates/${encodeURIComponent(personId)}/`);
  };
  // Back to wherever they opened it from, or to Candidates from a shared link
  const closeCandidatePage = () => backOr(() => navigateTo(TAB_PATHS['business-candidates']));

  const openBusinessJob = (jobId: string | null) => {
    navigateTo(jobId ? `/business/jobs/${encodeURIComponent(jobId)}/` : TAB_PATHS['business-jobs']);
    window.scrollTo(0, 0);
  };

  const openTestPage = (testId: string) => {
    navigateTo(`/#/tests/${encodeURIComponent(testId)}`);
    window.scrollTo(0, 0);
  };

  // A course opened from Upskill keeps that tab, so back returns there
  const openCoursePage = (courseId: string) => {
    const course = COURSES.find((c) => c.id === courseId);
    navigateTo(course ? coursePath(course) : '/learn/');
    window.scrollTo(0, 0);
  };
  const trainTeam = () => {
    navigateTo('/#/business');
    window.scrollTo(0, 0);
  };

  const openJobPage = (jobId: string) => {
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
    // A team invitation or team work: they're answered and started from the home page
    if (id.startsWith('team:')) {
      goToTab('home');
      window.scrollTo(0, 0);
      return;
    }
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
  // A page the new side has stays open, so signing in or refreshing keeps your place; otherwise its first page
  const handleRoleChange = (nextRole: UserRole) => {
    setActiveRole(nextRole);
    roleRef.current = nextRole;
    const here = tabFromUrl(nextRole, currentTabRef.current);
    const onPage = window.location.pathname !== '/' || window.location.hash;
    if (onPage && SIDE_TABS[sideOf(nextRole)].includes(here)) syncPagesFromUrl();
    else goToTab(NAV_TABS[nextRole === 'candidate' ? 'candidate' : 'recruiter'][0].id, true);
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
  const handleCompleteTest = (testId: string, finalScore: number, durationSeconds: number, integrity?: IntegrityReport, breakdown?: ResultBreakdown, answers?: AnswerRecord[]) => {
    const completedTest = tests.find((t) => t.id === testId);
    if (!completedTest) return;

    // Taken for a job, or from a company's link to the test: that company gets the result
    const jobAsWas = activeTestJobId ? jobs.find((j) => j.id === activeTestJobId) : undefined;
    // The job's record of this try is marked submitted, so the company no longer sees it as left unfinished
    const finishedAttempts = jobAsWas && withAttemptFinished(jobAsWas.invitations.find((i) => i.candidateId === candidate.id), testId, new Date().toISOString());
    if (jobAsWas && finishedAttempts) updateInvitation(jobAsWas.id, candidate.id, { attempts: finishedAttempts });
    const job = jobAsWas && finishedAttempts ? withInvitation(jobAsWas, candidate.id, { attempts: finishedAttempts }, today()) : jobAsWas;
    const referredBy = job?.businessId ?? candidate.testReferrals?.filter((r) => r.testId === testId).at(-1)?.businessId;
    const updatedCandidate = addTestResult(candidate, completedTest, {
      testId,
      score: finalScore,
      completedAt: today(),
      completedTime: new Date().toISOString(),
      durationSeconds,
      referredBy,
      ...(integrity && { integrity }),
      ...(breakdown && { breakdown }),
    });

    // Taken for a company: it can read the answers behind the score, privately (src/lib/submissions.ts)
    if (referredBy && answers?.length) {
      const completedAt = new Date().toISOString();
      saveSubmission({
        id: `${testId}__${candidate.id}__${Date.now()}`,
        candidateId: candidate.id,
        candidateName: candidate.name,
        businessId: referredBy,
        ...(job && { jobId: job.id }),
        testId,
        testTitle: completedTest.title,
        score: finalScore,
        completedAt,
        answers,
      }).catch((err) => console.error("Couldn't keep the answers for the company", err));
    }

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
        const canRetake = job.testIds.some((id) => attemptsAt(job, updatedCandidate, id).left !== 0);
        showToast(
          `You averaged ${progress.score}/100. ${job.title} needs ${job.testPassingScore}.${canRetake ? ' You can retake a test.' : ' You have no attempts left.'}`
        );
      } else {
        showToast(`You scored ${finalScore}/100. ${progress.done} of ${progress.total} of ${job.title}'s tests done.`);
      }
      // Started from the job's own page: stay there
      if (!jobPageId) goToTab('jobs');
    } else if (!testPageId) {
      // Started from a test page: stay there so the candidate sees where they now rank
      goToTab(isPublic(completedTest) ? 'profile' : 'jobs');
    }

    // The runner stays open on the result (saved already); closing it clears these
  };

  // Whose trials these are: the company's, or the Vetter team's
  const trialOwner = activeRole === 'admin' ? VETTER_TEAM.id : recruiterBusiness?.id;
  const ourTrials = trialOwner ? trials.filter((t) => t.businessId === trialOwner) : [];
  // The team's tries as a candidate's results, so a job seen as a candidate shows the team's scores on its tests
  const trialUser: User = {
    ...VISITOR,
    id: 'company-trial',
    name: staffUser.name,
    testResults: ourTrials.map((t) => ({ testId: t.testId, score: t.score, completedAt: t.completedAt.split('T')[0], durationSeconds: t.durationSeconds })),
  };
  const saveTrial = (testId: string, score: number, durationSeconds: number, jobId?: string) => {
    if (!trialOwner) return showToast('Your score couldn’t be saved until your company is set up.');
    const now = new Date();
    const trial: TrialResult = {
      id: `trial-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      businessId: trialOwner,
      testId,
      ...(jobId ? { jobId } : {}),
      score,
      completedAt: now.toISOString(),
      durationSeconds,
      takenBy: account?.uid ?? staffUser.id,
      takenByName: staffUser.name,
    };
    if (firebaseEnabled) putTrial(trial, reportCloudError);
    else setLocalTrials((prev) => [trial, ...prev]);
    showToast(`You scored ${score}/100. Saved to your team's trials.`);
  };

  // A company's team: people it invited, and the work it sends them (src/components/TeamPage.tsx)
  const ourTeam = recruiterBusiness ? team.filter((m) => m.businessId === recruiterBusiness.id) : [];
  const ourAssignments = recruiterBusiness ? assignments.filter((a) => a.businessId === recruiterBusiness.id) : [];
  const inviteToTeam = (invitee: { uid: string; name: string } | { email: string }) => {
    if (!recruiterBusiness) return showToast('Your company needs to be set up before you can invite your team.');
    const key = 'uid' in invitee ? invitee.uid : invitee.email;
    const id = `${recruiterBusiness.id}__${key}`;
    const existing = team.find((m) => m.id === id);
    if (existing && existing.status !== 'declined') return showToast(existing.status === 'active' ? 'They’re already on your team.' : 'They’ve already been invited.');
    const member: TeamMember = {
      id,
      businessId: recruiterBusiness.id,
      companyName: recruiterBusiness.name,
      ...('uid' in invitee ? { uid: invitee.uid, name: invitee.name } : { email: invitee.email, name: invitee.email }),
      status: 'invited',
      invitedAt: new Date().toISOString(),
    };
    // Asked again after declining: a fresh invitation
    if (existing && firebaseEnabled) syncTeam([existing], [], reportCloudError).then(() => setTeam((prev) => [...prev.filter((m) => m.id !== id), member]));
    else setTeam((prev) => [...prev.filter((m) => m.id !== id), member]);
    showToast(
      'email' in invitee
        ? `Invited ${invitee.email}. They'll see it on their Vetter home and in their notifications once they sign in with that address.`
        : `Invited ${member.name}. They'll see it on their Vetter home and in their notifications.`
    );
  };
  const assignWork = (members: TeamMember[], test: AssessmentTest, dueDate?: string, note?: string) => {
    if (!recruiterBusiness) return;
    const now = new Date();
    const made: Assignment[] = members
      .filter((m) => m.uid)
      .map((m, i) => ({
        id: `asg-${now.getTime()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        businessId: recruiterBusiness.id,
        companyName: recruiterBusiness.name,
        memberId: m.id,
        uid: m.uid!,
        testId: test.id,
        assignedAt: now.toISOString(),
        ...(dueDate && { dueDate }),
        ...(note && { note }),
      }));
    setAssignments((prev) => [...made, ...prev]);
    showToast(`Sent "${test.title}" to ${made.length} ${made.length === 1 ? 'person' : 'people'}.`);
  };

  // Someone's own side of it: companies that asked them to join, and the work sent to them
  const myEmail = (account?.email ?? candidate.email ?? '').toLowerCase();
  const myTeamInvites = activeRole === 'candidate' && !isVisitor ? team.filter((m) => m.status === 'invited' && (m.uid === candidate.id || (!!myEmail && m.email === myEmail))) : [];
  const myTeams = activeRole === 'candidate' && !isVisitor ? team.filter((m) => m.status === 'active' && m.uid === candidate.id) : [];
  const myAssignments = activeRole === 'candidate' && !isVisitor ? assignments.filter((a) => a.uid === candidate.id && myTeams.some((m) => m.id === a.memberId)) : [];
  const respondToTeam = (member: TeamMember, accept: boolean) => {
    setTeam((prev) =>
      prev.map((m) =>
        m.id === member.id
          ? { ...m, uid: candidate.id, name: candidate.name, status: accept ? 'active' : 'declined', ...(accept && { joinedAt: new Date().toISOString() }) }
          : m
      )
    );
    showToast(accept ? `You've joined ${member.companyName}'s team.` : `Declined ${member.companyName}'s invitation.`);
  };
  // Work from the team being done now; its result goes to the company only
  const [assignmentRun, setAssignmentRun] = useState<{ assignment: Assignment; test: AssessmentTest } | null>(null);
  const updateAssignment = (id: string, change: Partial<Assignment>) => setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...change } : a)));
  const finishAssignment = (assignment: Assignment, test: AssessmentTest, score: number, durationSeconds: number, answers?: AnswerRecord[]) => {
    const completedAt = new Date().toISOString();
    // Passing training earns a certificate, kept from the first pass even if a later go scores lower
    const certifies = test.purpose === 'training' && score >= test.passingScore && !assignment.certifiedAt;
    updateAssignment(assignment.id, { completedAt, score, durationSeconds, ...(certifies && { certifiedAt: completedAt, certificateScore: score }) });
    if (answers?.length)
      saveSubmission({
        id: `${test.id}__${candidate.id}__${Date.now()}`,
        candidateId: candidate.id,
        candidateName: candidate.name,
        businessId: assignment.businessId,
        testId: test.id,
        testTitle: test.title,
        score,
        completedAt,
        answers,
      }).catch((err) => console.error("Couldn't keep the answers for the company", err));
    showToast(
      certifies
        ? `You passed with ${score}/100 and earned a certificate. Find it under Training on your home.`
        : test.purpose === 'training' && score < test.passingScore
        ? `You scored ${score}/100. ${test.passingScore} passes; have another go when you're ready.`
        : `You scored ${score}/100. ${assignment.companyName} can see how you got on.`
    );
  };

  // A candidate starting one of a job's tests from the job: the company sees them on the job from now
  const startJobTest = (test: AssessmentTest, jobId: string) => {
    if (activeRole !== 'candidate') {
      setTrialTest({ test, jobId });
      return;
    }
    if (isVisitor) {
      setAuthDialog({ mode: 'sign-up', reason: 'Create a free account to take this job’s tests and apply.' });
      return;
    }
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const { used, limit, left } = attemptsAt(job, candidate, test.id);
    if (left === 0) {
      showToast(`You've used all ${limit} ${limit === 1 ? 'attempt' : 'attempts'} ${job.companyName} allows at "${test.title}".`);
      return;
    }
    setActiveTest(test);
    setActiveTestJobId(jobId);
    setActiveAttempt({ number: used + 1, limit });
  };

  // The candidate signed and pressed Begin on one of a job's tests: the try counts from now, finished or not
  const recordJobTestStart = (test: AssessmentTest, jobId: string) => {
    const invitation = jobsRef.current.find((j) => j.id === jobId)?.invitations.find((i) => i.candidateId === candidate.id);
    const now = new Date().toISOString();
    updateInvitation(jobId, candidate.id, { attempts: withAttemptStarted(invitation, test.id, now), ...(invitation?.startedAt ? {} : { startedAt: now }) });
  };

  // A new job is in its company's sector unless it was given one
  const handleCreateJob = (newJob: JobPosting) => {
    const companySector = businesses.find((b) => b.id === newJob.businessId)?.sector;
    setJobs((prev) => [{ ...(companySector && { sector: companySector }), ...newJob }, ...prev]);
  };

  const handleSaveJobTests = (jobId: string, change: Pick<JobPosting, 'testIds' | 'testPassingScore' | 'testsRequired' | 'maxAttempts'>) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...change } : j)));
  };

  // Moves a lead to a stage or changes its rating, note, tags or date, starting from what's stored now
  const handleUpdateLead = (row: LeadRow, change: LeadChange) =>
    setLeads((prev) => {
      const next = updatedLead({ ...row, lead: prev.find((l) => l.id === row.id) }, change);
      return [...prev.filter((l) => l.id !== row.id), next];
    });

  const handleUpdateJobRequirements = (jobId: string, requirements: JobPosting['requirements']) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, requirements } : j)));
  };

  const handleUpdateJobSector = (jobId: string, sector: SectorId) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, sector } : j)));
    showToast(`Listed under ${sectorLabel(sector)}.`);
  };

  const handleCreateTest = (newTest: AssessmentTest) => {
    setTests((prev) => [newTest, ...prev]);
  };

  // A test's content changed: its place in the public library stays with it, except that a company's change to an
  // approved test sends it back for the Vetter team to approve again (firestore.rules insists on it)
  const handleUpdateTest = (test: AssessmentTest) => {
    const before = tests.find((t) => t.id === test.id);
    const recheck = before?.publicStatus === 'approved' && activeRole !== 'admin';
    const kept: AssessmentTest = {
      ...test,
      publicStatus: recheck ? 'pending' : before?.publicStatus,
      publicAskedAt: recheck ? new Date().toISOString() : before?.publicAskedAt,
      publicNote: before?.publicNote,
    };
    setTests((prev) => prev.map((t) => (t.id === test.id ? kept : t)));
    if (recheck) showToast(`"${test.title}" was changed, so it's waiting for Vetter to approve it again before it's public.`);
  };

  // The public library: a company offers its test (filed under the roles the library's tests of its category are
  // for, as its own has none), takes it back, and the Vetter team decides
  const setPublic = (testId: string, change: (t: AssessmentTest) => AssessmentTest) => setTests((prev) => prev.map((t) => (t.id === testId ? change(t) : t)));
  const askToPublish = (testId: string) => {
    const test = tests.find((t) => t.id === testId);
    if (!test) return;
    const roles = test.roles?.length ? test.roles : [...new Set(tests.filter((t) => t.type === 'standard' && t.category === test.category).flatMap((t) => t.roles ?? []))];
    setPublic(testId, (t) => ({ ...t, roles, publicStatus: 'pending', publicAskedAt: new Date().toISOString(), publicNote: undefined }));
    showToast(`"${test.title}" is waiting for Vetter to approve it. Once approved, other companies can use it and candidates can take it.`);
  };
  const withdrawPublic = (testId: string) => {
    setPublic(testId, (t) => ({ ...t, publicStatus: undefined, publicAskedAt: undefined, publicNote: undefined }));
    showToast('Taken out of the public library. Only your company can use it now.');
  };
  const decidePublic = (testId: string, approve: boolean, note?: string) =>
    setPublic(testId, (t) => ({ ...t, publicStatus: approve ? 'approved' : 'rejected', publicNote: approve ? undefined : note?.trim() || undefined }));

  // Who a new test belongs to: the job's company, or the company signed in, or the Vetter library
  const testOwnerFor = (jobId?: string) => {
    const job = jobId ? jobs.find((j) => j.id === jobId) : undefined;
    if (job) return businesses.find((b) => b.id === job.businessId);
    return activeRole === 'admin' ? undefined : recruiterBusiness;
  };

  const saveNewTest = (test: AssessmentTest) => {
    const id = `test-${test.type === 'custom' ? 'custom' : 'vetter'}-${Date.now()}`;
    const saved = { ...test, id };
    const write = setTests((prev) => [saved, ...prev]);
    // On Firebase the test only shows once the database has it; if the write is refused, it would vanish without a
    // word, so it's kept as a draft instead and the company is told
    if (firebaseEnabled)
      Promise.resolve(write).then((done) => {
        if (done !== undefined) return;
        const businessId = saved.businessId ?? recruiterBusiness?.id ?? '';
        putTestDraft({ id: `draft-${Date.now()}`, businessId, test: saved, kind: saved.purpose === 'training' ? 'training' : 'simulation', updatedAt: new Date().toISOString() })
          .then(() => showToast(`"${saved.title}" couldn't be saved to your tests, so it's been kept as a draft under Tests. Open it from there and save it again.`))
          .catch((err) => showToast(`"${saved.title}" couldn't be saved, and keeping it as a draft failed too: ${accountError(err)}`));
      });
    return id;
  };

  // Drafts: saved (or saved again) and thrown away
  // Resolves true once the draft is really kept; on failure the editor stays open so nothing is lost
  const saveTestDraft = async (record: TestDraft): Promise<boolean> => {
    const saved = { ...record, updatedAt: new Date().toISOString() };
    if (firebaseEnabled) {
      try {
        await putTestDraft(saved);
      } catch (err) {
        const why = (err as { code?: string })?.code === 'draft/too-large' ? 'it is too big to store. Remove a question or two and try again.' : accountError(err);
        showToast(`Couldn't save the draft: ${why} It's still open, so nothing is lost.`);
        return false;
      }
    } else setLocalTestDrafts((prev) => [saved, ...prev.filter((d) => d.id !== saved.id)]);
    showToast(`"${record.test.title}" saved as a draft. Find it under Tests, where you can reopen it.`);
    return true;
  };
  const deleteTestDraft = (id?: string) => {
    if (id && testDraftsRef.current.some((d) => d.id === id)) setTestDrafts((prev) => prev.filter((d) => d.id !== id));
  };
  // A company's drafts; the Vetter team sees every one
  // Training drafts live with the training, not the tests
  const isTrainingDraft = (d: TestDraft) => d.kind === 'training' || d.test.purpose === 'training';
  const visibleDrafts = (activeRole === 'admin' ? testDrafts : testDrafts.filter((d) => d.businessId === recruiterBusiness?.id)).filter((d) => !isTrainingDraft(d));
  const trainingDrafts = testDrafts.filter((d) => d.businessId === recruiterBusiness?.id && isTrainingDraft(d));

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
  const coursePage = COURSES.find((c) => c.id === coursePageId);
  // What the candidate's browsing pages list, in the sector picked
  const sectorTests = sector === 'all' ? tests : tests.filter(testInSector(sector));
  const sectorJobs = sector === 'all' ? jobs : jobs.filter(jobInSector(sector, tests));
  // A test page replaces the tab's own content
  const detailPage = testPageTest;
  // The company home: a chat that fills the window (src/components/BusinessHome.tsx)
  const chatHome = !detailPage && activeRole !== 'candidate' && currentTab === 'business-home';
  // Companies and the Vetter team get the chat-app layout: the menu down the left (Navigation's StaffNav)
  const staffLayout = !navPending && !isVisitor && activeRole !== 'candidate';
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
  // Invitations to join a company's team, and work a team sent, at the top of the bell until answered or done
  const teamNotifications = [
    ...myTeamInvites.map((m) => ({
      id: `team:${m.id}`,
      text: `${m.companyName} invited you to join its team`,
      detail: 'Open your home to join or decline',
      when: new Date(m.invitedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      read: false,
    })),
    ...myAssignments
      .filter((a) => !a.completedAt)
      .map((a) => ({
        id: `team:${a.id}`,
        text: `${a.companyName} sent you "${tests.find((t) => t.id === a.testId)?.title ?? 'some work'}"`,
        detail: a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Open your home to start it',
        when: new Date(a.assignedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        read: !!a.startedAt,
      })),
  ];
  const candidateSection = CANDIDATE_SECTIONS[currentTab];
  // The sector picker sits on the pages a candidate browses: Home's feed, Tests, Jobs, Ranked and Career switch
  const showSectorBar =
    activeRole === 'candidate' &&
    !detailPage &&
    !jobPageId &&
    (['tests', 'jobs', 'ranked'].includes(currentTab) || (currentTab === 'home' && !isVisitor && !hiringHome) || (currentTab === 'learn' && !coursePage));
  const profilePerson = profilePersonId ? allCandidates.find((c) => c.id === profilePersonId) : undefined;
  const candidatePagePerson = activeRole !== 'candidate' && candidatePageId ? allCandidates.find((c) => c.id === candidatePageId) : undefined;
  // A candidate's page is titled after them; runs after the title effect above, so it wins while the page is open
  useEffect(() => {
    if (candidatePagePerson) document.title = `${candidatePagePerson.name} | Vetter`;
  }, [candidatePagePerson?.id, currentTab]);
  const businessSection = BUSINESS_SECTIONS[currentTab];
  // A company's leads across its own jobs; the Vetter team's across every company's
  const leadsBusiness = activeRole === 'admin' ? undefined : recruiterBusiness;
  const leadsJobs = leadsBusiness ? jobs.filter((j) => j.businessId === leadsBusiness.id) : jobs;
  const leadRows = activeRole === 'candidate' ? [] : buildLeadRows(leadsJobs, allCandidates, leads, Object.fromEntries(tests.map((t) => [t.id, t.title])));
  const openJobLeads = (jobId: string) => {
    openBusinessJob(jobId);
    // Once the job's page is drawn, jump to its pipeline
    setTimeout(() => document.getElementById('job-leads')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <div className={`min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white ${staffLayout ? 'lg:pl-64' : ''}`}>
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCompaniesQuery('');
          goToTab(tab);
        }}
        activeRole={activeRole}
        pending={navPending}
        onNewChat={() => setAdvisorTurns([])}
        onRoleChange={handleRoleChange}
        accounts={
          firebaseEnabled
            ? {
                signedIn: !!user,
                email: user?.email ?? undefined,
                canSwitchViews: account?.role === 'admin',
                onSignIn: () => setAuthDialog({ mode: 'sign-in' }),
                onJoin: () => setAuthDialog({ mode: 'sign-up' }),
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
        notifications={activeRole === 'candidate' && !isVisitor ? [...teamNotifications, ...candidateNotifications] : undefined}
        visitor={
          isVisitor
            ? {
                onSignIn: () => setAuthDialog({ mode: 'sign-in' }),
                // From the home page's hiring side, sign-up starts as a company
                onJoin: () => setAuthDialog({ mode: 'sign-up', role: hiringHome ? 'recruiter' : undefined }),
              }
            : undefined
        }
        onOpenNotification={openNotification}
        renderSearch={(mobile) => (
          <GlobalSearch
            people={allCandidates}
            tests={tests}
            // Companies are hidden for now, so search leaves them out
            businesses={[]}
            onOpenPerson={openPerson}
            onOpenTest={openTestPage}
            onOpenCompany={openCompany}
            onClose={mobile?.onClose}
            autoFocus={!!mobile}
          />
        )}
      />

      {/* Room for the phone tab bar, which visitors don't have */}
      <div className={`flex-1 min-w-0 flex flex-col ${isVisitor || staffLayout ? '' : 'pb-14 md:pb-0'}`}>
        {/* The company home is a full-window chat: no room below it, and no footer */}
        <main className={`flex-1 bg-white ${chatHome ? '' : 'pb-16'}`}>
          {accountGate ?? (
          <>
          {showSectorBar && <SectorBar sector={sector} onChange={setSector} wide={currentTab !== 'learn'} />}
          {activeRole === 'recruiter' && company && account && company.ownerUid === account.uid && companyBusiness && <TeamRequests company={company} />}
          {activeRole === 'admin' && firebaseEnabled && account?.role === 'admin' && <CompanyReview />}
          {activeRole === 'admin' && !testPageTest && <PublicTestReview tests={tests} onOpen={openTestPage} onDecide={decidePublic} />}
          {!testPageTest && (currentTab === 'learn' || currentTab === 'upskill') && coursePage && (
            <CoursePage
              course={coursePage}
              tests={tests}
              jobs={jobs}
              candidate={activeRole === 'candidate' && !isVisitor ? candidate : undefined}
              uid={account?.uid}
              progress={courseProgress.progress}
              onOpenTest={openTestPage}
              onOpenJob={openJobPage}
              onOpenCourse={openCoursePage}
              onTrainTeam={trainTeam}
              onBack={() => backOr(() => goToTab(currentTab))}
            />
          )}
          {!testPageTest && (currentTab === 'learn' || currentTab === 'upskill') && !coursePage && (
            <LearnPage
              key={currentTab}
              track={currentTab === 'upskill' ? 'upskill' : 'switch'}
              sector={sector}
              progress={courseProgress.progress} onOpenCourse={openCoursePage} onTrainTeam={trainTeam} />
          )}
          {currentTab === 'ranked' && !testPageTest && (
            <RankedPage tests={sectorTests} allCandidates={allCandidates} viewerId={isVisitor ? '' : candidate.id} onOpenTest={openTestPage} />
          )}
          {currentTab === 'guides' && <GuidesPage slug={guideSlug} onOpen={(slug) => navigateTo(slug ? `/guides/${slug}/` : '/guides/')} />}
          {testPageTest && (
            <TestPage
              test={testPageTest}
              tests={tests}
              candidates={allCandidates}
              jobs={jobs}
              viewerRole={activeRole}
              viewerBusinessId={recruiterBusiness?.id}
              currentCandidateId={activeRole === 'candidate' ? candidate.id : undefined}
              referredByCompany={
                activeRole === 'candidate'
                  ? businesses.find((b) => b.id === candidate.testReferrals?.filter((r) => r.testId === testPageTest.id).at(-1)?.businessId)
                  : undefined
              }
              onSend={activeRole === 'candidate' ? undefined : () => setEditingTests({ addTestIds: [testPageTest.id] })}
              onCustomize={
                // Any test in the library, Vetter's or another company's approved one, can start a test of their own
                activeRole === 'recruiter' &&
                recruiterBusiness &&
                (testPageTest.type === 'standard' || (testPageTest.publicStatus === 'approved' && testPageTest.businessId !== recruiterBusiness.id))
                  ? () => setDraftBuilder({ draft: testPageTest, isCopy: true, alsoAdd: [] })
                  : undefined
              }
              {...((activeRole === 'admin' || account?.role === 'admin') && testPageTest.type !== 'custom' && {
                // Any library test, for the Vetter team (in either view): back to the AI chat if made with AI, else the builder
                onEdit: () => (madeWithAI(testPageTest) ? enhanceTest(testPageTest.id) : setDraftBuilder({ draft: testPageTest, alsoAdd: [] })),
              })}
              {...(activeRole === 'recruiter' && recruiterBusiness && testPageTest.type === 'custom' && testPageTest.businessId === recruiterBusiness.id && {
                // The company's own test: back to the AI chat if made with AI, else the builder
                onEdit: () => (madeWithAI(testPageTest) ? enhanceTest(testPageTest.id) : setDraftBuilder({ draft: testPageTest, alsoAdd: [] })),
              })}
              {...(activeRole === 'recruiter' && recruiterBusiness && testPageTest.type === 'custom' && testPageTest.businessId === recruiterBusiness.id && {
                onAskToPublish: () => askToPublish(testPageTest.id),
                onWithdrawPublic: () => withdrawPublic(testPageTest.id),
              })}
              onStartTest={startTest}
              onOpenJob={activeRole === 'candidate' ? openJobPage : undefined}
              onOpenTest={openTestPage}
              onBack={() => backOr(() => goToTab(activeRole === 'candidate' ? 'tests' : 'business-tests'))}
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
              onUpdateExperience={(details) => {
                setCandidate((prev) => ({ ...prev, ...details }));
                showToast('Experience saved.');
              }}
              onUpdateSkills={(skills) => setCandidate((prev) => ({ ...prev, skills }))}
              onToggleHidden={(testId) => {
                const hidden = (candidate.hiddenTestIds ?? []).includes(testId);
                setCandidate((prev) => ({
                  ...prev,
                  hiddenTestIds: hidden ? (prev.hiddenTestIds ?? []).filter((id) => id !== testId) : [...(prev.hiddenTestIds ?? []), testId],
                }));
                showToast(hidden ? 'Shown on your public profile again.' : 'Hidden from your public profile. Companies still see it.');
              }}
              jobPageId={jobPageId}
              onOpenJob={openJobPage}
              testField={testField}
              onTestFieldChange={setTestField}
              sector={sector}
              canApply={() => {
                if (isVisitor) setAuthDialog({ mode: 'sign-up', reason: 'Create a free account to apply. Your verified scores go with your application.' });
                return !isVisitor;
              }}
            />
          )}

          {/* Home in three columns: what companies sent you, Discover in the widest middle, and live leaderboards with
              people and companies to follow on the right. Stacked on smaller screens, with the right column above the feed */}
          {!detailPage && (isVisitor || hiringHome) && activeRole === 'candidate' && currentTab === 'home' && (
            <VisitorHome
              audience={hiringHome ? 'business' : 'candidates'}
              onAudienceChange={(a) => navigateTo(a === 'business' ? '/#/business' : '/')}
              tests={tests}
              jobs={jobs}
              onOpenTest={openTestPage}
              onOpenJob={openJobPage}
              onGoTo={(tab) => {
                goToTab(tab);
                window.scrollTo(0, 0);
              }}
              onJoin={(reason) => setAuthDialog({ mode: 'sign-up', role: hiringHome ? 'recruiter' : undefined, reason })}
              onOpenGuide={(slug) => navigateTo(slug ? `/guides/${slug}/` : '/guides/')}
            />
          )}
          {!detailPage && !isVisitor && !hiringHome && activeRole === 'candidate' && currentTab === 'home' && (myTeamInvites.length > 0 || myTeams.length > 0) && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 -mb-8">
              <TeamWork
                invitations={myTeamInvites}
                memberships={myTeams}
                assignments={myAssignments}
                tests={tests}
                onRespond={respondToTeam}
                onLeave={(m) => (setTeam((prev) => prev.filter((x) => x.id !== m.id)), showToast(`You've left ${m.companyName}'s team.`))}
                onStart={(assignment, test) => setAssignmentRun({ assignment, test })}
                personName={candidate.name}
              />
            </div>
          )}
          {!detailPage && !isVisitor && !hiringHome && activeRole === 'candidate' && currentTab === 'home' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,280px)] gap-6 items-start">
              <CandidateHome
                candidate={candidate}
                jobs={jobs}
                tests={sectorTests}
                businesses={businesses}
                onOpenJob={openJobPage}
                onStartTest={startTest}
                onOpenTest={openTestPage}
                onGoTo={goToTab}
                visitor={isVisitor ? { onJoin: () => setAuthDialog({ mode: 'sign-up' }), onSignIn: () => setAuthDialog({ mode: 'sign-in' }) } : undefined}
              />
              <div className="space-y-4 lg:col-start-3 lg:row-start-1">
                <TopPerformers tests={sectorTests} allCandidates={allCandidates} onOpenTest={openTestPage} onOpenRanked={() => goToTab('ranked')} />
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
                tests={sectorTests}
                jobs={sectorJobs}
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

          {!detailPage && activeRole !== 'candidate' && currentTab === 'business-home' && (
            <BusinessHome
              business={activeRole === 'admin' ? undefined : recruiterBusiness}
              jobs={activeRole === 'admin' ? jobs : jobs.filter((j) => j.businessId === recruiterBusiness?.id)}
              tests={tests}
              ownTestCount={tests.filter((t) => (activeRole === 'admin' ? t.type === 'standard' : t.type === 'custom' && t.businessId === recruiterBusiness?.id && t.purpose !== 'training')).length}
              draftCount={testDrafts.filter((d) => d.businessId === (activeRole === 'admin' ? '' : recruiterBusiness?.id)).length}
              aiAllowed={aiAllowed}
              planName={
                activeRole === 'admin'
                  ? 'Vetter team'
                  : hasAiTests(recruiterBusiness)
                  ? `${recruiterBusiness!.plan!.replace('-', ' ').replace(/^./, (c) => c.toUpperCase())} plan`
                  : 'Free plan'
              }
              turns={advisorTurns}
              onTurns={setAdvisorTurns}
              build={homeBuild}
              onBuild={setHomeBuild}
              onSaveTest={(test) => {
                const id = saveNewTest(test);
                showToast(test.purpose === 'training' ? `"${test.title}" saved to your training.` : `"${test.title}" saved to your tests.`);
                return id;
              }}
              onUpdateTest={(test) => {
                // A change keeps the saved test's place: its id, owner, level family and kind
                const before = tests.find((t) => t.id === test.id);
                handleUpdateTest(
                  before
                    ? { ...before, ...test, id: before.id, type: before.type, ...(before.familyId && { familyId: before.familyId }), ...(before.businessId && { businessId: before.businessId, companyName: before.companyName }), ...(before.purpose && { purpose: before.purpose }) }
                    : test
                );
              }}
              seed={homeSeed}
              onSeedUsed={() => setHomeSeed(undefined)}
              onAddToJob={addTestsToJob}
              candidates={allCandidates}
              onInvite={(jobId, candidateId) => {
                handleInviteToJob(jobId, [candidateId]);
                const job = jobs.find((j) => j.id === jobId);
                showToast(`Sent ${job?.title ?? 'the job'}'s tests. They'll see the request when they next sign in.`);
              }}
              renderProfile={(personId, close) => {
                const person = allCandidates.find((c) => c.id === personId);
                return person ? (
                  <CandidateProfilePage
                    popup
                    person={person}
                    tests={tests}
                    candidates={allCandidates}
                    businesses={businesses}
                    business={leadsBusiness}
                    jobs={leadsJobs}
                    leadRows={leadRows}
                    onBack={close}
                    onOpenPage={() => {
                      close();
                      openPerson(personId);
                    }}
                    onOpenTest={(testId) => {
                      close();
                      openTestPage(testId);
                    }}
                    onOpenJob={(jobId) => {
                      close();
                      openBusinessJob(jobId);
                    }}
                  />
                ) : null;
              }}
              onContinue={(ready) => {
                // AI tests already built stay on the plan
                setTestPlan((prev) => ({ readyIds: ready.map((t) => t.id), ideas: prev?.ideas ?? [], suggestions: prev?.suggestions ?? [] }));
                setPlanOpen(true);
              }}
              onBuildIdea={(idea, picked, others) => {
                setTestPlan((prev) => ({
                  readyIds: picked.map((t) => t.id),
                  ideas: prev?.ideas.some((x) => x.idea.brief === idea.brief) ? prev.ideas : [...(prev?.ideas ?? []), { idea }],
                  suggestions: others,
                }));
                startPlanBuild(idea);
              }}
              onEditCopy={(test) => setDraftBuilder({ draft: test, isCopy: true, alsoAdd: [] })}
              onBuildWithAI={(brief, kind) =>
                // Everything is settled in the chat by now (the role, the kind, what to focus on), so building starts at
                // once, and Vetter is told what was said so it doesn't ask again
                openGenerator({ ...(brief && { seed: brief, autoSend: true }), ...(kind && { kind }), fromHome: true, background: homeChatSummary(advisorTurns) })
              }
              onCreateOwn={() => setDraftBuilder({ alsoAdd: [] })}
              onSeePlans={() => setPlansOpen(true)}
              onOpenTest={openTestPage}
              onGoTo={goToTab}
            />
          )}

          {!detailPage && activeRole !== 'candidate' && currentTab === 'business-training' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
              {recruiterBusiness ? (
                <TrainingPage
                  business={recruiterBusiness}
                  training={tests.filter((t) => t.purpose === 'training' && t.businessId === recruiterBusiness.id)}
                  drafts={trainingDrafts}
                  team={ourTeam}
                  assignments={ourAssignments}
                  candidates={otherCandidates.concat(activeRole === 'recruiter' && !firebaseEnabled ? [candidate] : [])}
                  aiAllowed={aiAllowed}
                  onCreate={() => startInChat('I want to create training for my team.')}
                  onSeePlans={() => setPlansOpen(true)}
                  onContinueDraft={(d) => openGenerator({ resume: d })}
                  onTry={(test) => setTrialTest({ test })}
                  onEdit={(test) => editOwnTest(test.id)}
                  onAssign={assignWork}
                  onGoToTeam={() => goToTab('business-team')}
                />
              ) : (
                <p className="text-sm text-slate-500">Training belongs to a company. Switch to a company's view to make and send training.</p>
              )}
            </div>
          )}

          {!detailPage && activeRole !== 'candidate' && currentTab === 'business-team' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
              {recruiterBusiness ? (
                <TeamPage
                  business={recruiterBusiness}
                  team={ourTeam}
                  assignments={ourAssignments}
                  tests={tests}
                  // The live site's sample candidates aren't real people, so they can't be invited
                  candidates={otherCandidates.filter((c) => !(firebaseEnabled && c.id.startsWith('cand-sample-'))).concat(activeRole === 'recruiter' && !firebaseEnabled ? [candidate] : [])}
                  aiAllowed={aiAllowed}
                  onInviteEmail={(email) => inviteToTeam({ email })}
                  onInviteCandidate={(c) => inviteToTeam({ uid: c.id, name: c.name })}
                  onRemoveMember={(m) => setTeam((prev) => prev.filter((x) => x.id !== m.id))}
                  onAssign={assignWork}
                  onUnassign={(a) => setAssignments((prev) => prev.filter((x) => x.id !== a.id))}
                  onCreateTraining={() => startInChat('I want to create training for my team.')}
                  onSeePlans={() => setPlansOpen(true)}
                  onOpenTest={openTestPage}
                  onViewPerson={setProfilePersonId}
                />
              ) : (
                <p className="text-sm text-slate-500">Teams belong to a company. Switch to a company's view to invite people and send them training.</p>
              )}
            </div>
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
              onSelect={openBusinessJob}
              onCreateJob={handleCreateJob}
              onEditTests={(jobId) => setEditingTests({ jobId, addTestIds: [] })}
              onSuggestTests={(jobId) => {
                const job = jobs.find((j) => j.id === jobId);
                if (job) startInChat(`Create a test for this job:\n\n${jobBrief(job)}`, jobId);
              }}
              onEditTest={(jobId, testId) => editOwnTest(testId, jobId)}
              onUpdateJobRequirements={handleUpdateJobRequirements}
              onUpdateJobSector={handleUpdateJobSector}
              onUpdateCompanySector={
                // The owner's to change, saved on the company's record
                activeRole === 'recruiter' && company && account && company.ownerUid === account.uid
                  ? (next) =>
                      updateCompanySector(company.id, next).then(
                        () => showToast(`Your sector is now ${sectorLabel(next)}. New jobs start in it.`),
                        (err) => showToast(accountError(err))
                      )
                  : undefined
              }
              onEmail={handleEmailJob}
              onInvite={handleInviteToJob}
              onOpenPerson={openPerson}
              onOpenTest={openTestPage}
              leadRows={leadRows}
              onUpdateLead={handleUpdateLead}
              onTryTest={startJobTest}
              trials={ourTrials}
              trialUser={trialUser}
              onDeleteJob={(jobId) => {
                const job = jobs.find((j) => j.id === jobId);
                setJobs((prev) => prev.filter((j) => j.id !== jobId));
                if (selectedJobId === jobId) openBusinessJob(null);
                if (job) showToast(`${job.title} deleted.`);
              }}
            />
          )}

          {!detailPage && candidatePagePerson && (
            <CandidateProfilePage
              key={candidatePagePerson.id}
              person={candidatePagePerson}
              tests={tests}
              candidates={allCandidates}
              businesses={businesses}
              business={leadsBusiness}
              jobs={leadsJobs}
              leadRows={leadRows}
              onBack={closeCandidatePage}
              onOpenTest={openTestPage}
              onOpenJob={openBusinessJob}
            />
          )}

          {!detailPage && !candidatePagePerson && activeRole !== 'candidate' && businessSection && (
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
              onDeleteTest={(testId) => {
                const test = tests.find((t) => t.id === testId);
                setTests((prev) => prev.filter((t) => t.id !== testId));
                // No job keeps asking for a test that's gone
                setJobs((prev) => prev.map((j) => (j.testIds.includes(testId) ? { ...j, testIds: j.testIds.filter((id) => id !== testId) } : j)));
                if (test) showToast(`${test.title} deleted.`);
              }}
              onGenerateTest={(seed) => startInChat(seed || 'I want to create a test.')}
              drafts={visibleDrafts}
              onSaveDraft={saveTestDraft}
              onDeleteDraft={deleteTestDraft}
              onContinueDraft={(d) => openGenerator({ jobId: d.jobId, resume: d })}
              onEditDraftByHand={(d) => setDraftBuilder({ draft: d.test, jobId: d.jobId, alsoAdd: [], record: d })}
              onEditOwnTest={editOwnTest}
              {...(adminAsCompany && activeRole === 'recruiter' && { companyPicker: { onPick: setAdminCompanyId } })}
              onEditWithAI={(testId) => enhanceTest(testId)}
              onEditByHand={(testId) => {
                const test = tests.find((t) => t.id === testId);
                if (test) setDraftBuilder({ draft: test, alsoAdd: [] });
              }}
              browse={<BrowseCandidates candidates={allCandidates} onOpenPerson={openPerson} />}
              leads={
                <LeadsPage
                  business={leadsBusiness}
                  jobs={leadsJobs}
                  rows={leadRows}
                  onUpdateLead={handleUpdateLead}
                  onOpenPerson={openPerson}
                  onOpenJobLeads={openJobLeads}
                />
              }
            />
          )}
          </>
          )}
        </main>

        {!chatHome && <footer className="border-t border-slate-200 bg-white py-6 px-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight">VETTER<PixelDot /></span>
            <span>&middot; Skills-based hiring</span>
            <CurrencyPicker className="ml-auto" />
            {!firebaseEnabled && (
              <button onClick={handleResetData} className="ml-4 text-slate-400 hover:text-slate-700 transition-colors">
                Reset demo data
              </button>
            )}
          </div>
        </footer>}
      </div>

      {authDialog && <AuthDialog initialMode={authDialog.mode} reason={authDialog.reason} initialRole={authDialog.role} onClose={() => setAuthDialog(null)} />}

      {plansOpen && <PlansDialog onClose={() => setPlansOpen(false)} />}

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
            openBusinessJob(jobId);
          }}
          onCancel={() => setEditingTests(null)}
        />
      )}

      {/* The test plan shows on the company home, and steps aside while a test is built, viewed or added to a job */}
      {testPlan && planOpen && !generator && !draftBuilder && !editingTests && !planJobTests && !detailPage && currentTab === 'business-home' && (
        <TestPlanDialog
          plan={testPlan}
          tests={tests}
          hasJobs={ourJobs.length > 0}
          onChange={setTestPlan}
          onBuild={(idea) => {
            setTestPlan((p) => (p && !p.ideas.some((x) => x.idea.brief === idea.brief) ? { ...p, ideas: [...p.ideas, { idea }] } : p));
            startPlanBuild(idea);
          }}
          onOpenTest={openTestPage}
          onCreateJob={setPlanJobTests}
          onAddToJob={(ids) => {
            setEditingTests({ addTestIds: ids });
            setTestPlan(null);
            setPlanOpen(false);
          }}
          onBack={() => setPlanOpen(false)}
        />
      )}

      {planJobTests && (
        <JobForm
          businesses={recruiterBusiness && activeRole !== 'admin' ? [recruiterBusiness] : businesses}
          postedBy={activeRole === 'admin' ? 'vetter' : 'company'}
          tests={tests}
          initialTestIds={planJobTests}
          onSave={(job) => {
            handleCreateJob(job);
            setPlanJobTests(null);
            setTestPlan(null);
            setPlanOpen(false);
            showToast(`"${job.title}" is posted with ${job.testIds.length} ${job.testIds.length === 1 ? 'test' : 'tests'}.`);
            openBusinessJob(job.id);
          }}
          onCancel={() => setPlanJobTests(null)}
        />
      )}

      {generator && (
        <TestGenerator
          job={generator.jobId ? jobs.find((j) => j.id === generator.jobId) : undefined}
          business={testOwnerFor(generator.jobId)}
          tests={tests}
          onOpenTest={(testId) => {
            setGenerator(null);
            if (generator.fromHome) reportBuild();
            openTestPage(testId);
          }}
          resume={generator.resume}
          editing={generator.editTestId ? tests.find((t) => t.id === generator.editTestId) : undefined}
          onUpdateTest={(test) => {
            handleUpdateTest(test);
            deleteTestDraft(generator.resume?.id);
            showToast(`Changes to "${test.title}" saved.`);
          }}
          seed={generator.seed}
          autoSend={generator.autoSend}
          background={generator.background}
          kind={generator.kind}
          onSaveDraft={async (record) => {
            const ok = await saveTestDraft(record);
            if (ok && !record.editsTestId) builtInCreator.current = { test: record.test, kind: record.kind ?? generator.kind ?? 'simulation', draft: true };
            return ok;
          }}
          onSaveTest={(test, kind) => {
            const id = saveNewTest(test);
            builtInCreator.current = { test, kind, testId: id };
            deleteTestDraft(generator.resume?.id);
            if (!generator.jobId) showToast(test.purpose === 'training' ? `"${test.title}" saved to your training.` : `"${test.title}" saved to your tests.`);
            markPlanBuilt(id);
            return id;
          }}
          onAddToJob={addTestsToJob}
          onEditDraft={(draft, alsoAdd, record) => {
            planToBuilder.current = true;
            setDraftBuilder({ draft, jobId: generator.jobId, alsoAdd, record });
          }}
          onClose={() => {
            setGenerator(null);
            if (generator.fromHome) reportBuild();
            if (!planToBuilder.current) setPlanBuilding(null);
            planToBuilder.current = false;
          }}
        />
      )}

      {draftBuilder && (
        <TestBuilder
          business={testOwnerFor(draftBuilder.jobId)}
          draft={draftBuilder.draft}
          isCopy={draftBuilder.isCopy}
          onSaveDraft={async (test) => {
            const base = draftBuilder.record;
            const record = base ? { ...base, test } : { id: `draft-${Date.now()}`, businessId: testOwnerFor(draftBuilder.jobId)?.id ?? '', ...(draftBuilder.jobId && { jobId: draftBuilder.jobId }), test, updatedAt: '' };
            if (await saveTestDraft(record)) setDraftBuilder(null);
          }}
          onSave={(test) => {
            // Changes to a saved test, carried over from the chat, go over it rather than beside it
            if (tests.some((t) => t.id === test.id)) {
              handleUpdateTest(test);
              deleteTestDraft(draftBuilder.record?.id);
              showToast(`Changes to "${test.title}" saved.`);
              setDraftBuilder(null);
              return;
            }
            handleCreateTest(test);
            deleteTestDraft(draftBuilder.record?.id);
            if (draftBuilder.jobId) addTestsToJob(draftBuilder.jobId, [test.id, ...draftBuilder.alsoAdd]);
            else showToast(draftBuilder.isCopy ? `"${test.title}" saved as a new test of your own. The library's test is unchanged.` : `"${test.title}" saved to your tests.`);
            markPlanBuilt(test.id);
            setDraftBuilder(null);
          }}
          onCancel={() => (setDraftBuilder(null), setPlanBuilding(null))}
          // A company's saved test, however it was made: to the test chat with whatever's been changed here
          onEnhance={(() => {
            const saved = tests.find((t) => t.id === draftBuilder.draft?.id);
            const companys = saved?.type === 'custom' && !!saved.businessId && saved.businessId === recruiterBusiness?.id;
            // The Vetter team's own library tests, made in the app, too
            const vetters = (activeRole === 'admin' || account?.role === 'admin') && !!saved && saved.type !== 'custom';
            if (!saved || draftBuilder.isCopy || !(companys || vetters)) return undefined;
            return (test: AssessmentTest) => {
              if (!aiAllowed) return setPlansOpen(true);
              const jobId = draftBuilder.jobId;
              setDraftBuilder(null);
              setGenerator({ jobId, resume: { id: `draft-${Date.now()}`, businessId: saved.businessId ?? '', ...(jobId && { jobId }), editsTestId: saved.id, test: { ...test, id: saved.id }, updatedAt: '' } });
            };
          })()}
        />
      )}

      {activeTest && (
        <TestRunner
          test={activeTest}
          onClose={() => {
            setActiveTest(null);
            setActiveTestJobId(null);
            setActiveAttempt(null);
          }}
          onBegin={activeTestJobId ? () => recordJobTestStart(activeTest, activeTestJobId) : isPublic(activeTest) ? () => recordTestStart(activeTest) : undefined}
          getRankFor={isPublic(activeTest) ? (score) => rankFor(activeTest.id, score) : undefined}
          retakeDays={!activeTestJobId && isPublic(activeTest) ? RETAKE_DAYS : undefined}
          attempt={activeAttempt ?? undefined}
          onComplete={handleCompleteTest}
          getPercentileFor={(score) => getPercentile(score, activeTest.id, allCandidates, candidate.id)}
        />
      )}

      {assignmentRun && (
        <TestRunner
          test={assignmentRun.test}
          training={assignmentRun.test.purpose === 'training'}
          savedNote={`Shared with ${assignmentRun.assignment.companyName} only. It isn't on your profile or any leaderboard.`}
          onClose={() => setAssignmentRun(null)}
          onBegin={() => !assignmentRun.assignment.startedAt && updateAssignment(assignmentRun.assignment.id, { startedAt: new Date().toISOString() })}
          onComplete={(_testId, score, durationSeconds, _integrity, _breakdown, answers) => finishAssignment(assignmentRun.assignment, assignmentRun.test, score, durationSeconds, answers)}
          getPercentileFor={(score) => getPercentile(score, assignmentRun.test.id, allCandidates, candidate.id)}
        />
      )}

      {trialTest && (
        <TestRunner
          test={trialTest.test}
          training={trialTest.test.purpose === 'training'}
          savedNote="Saved for your team as a trial. It isn't on any leaderboard or among any job's candidates."
          onClose={() => setTrialTest(null)}
          onComplete={(testId, score, durationSeconds) => {
            saveTrial(testId, score, durationSeconds, trialTest.jobId);
          }}
          getPercentileFor={(score) => getPercentile(score, trialTest.test.id, allCandidates, '')}
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
          team={
            activeRole === 'recruiter' && recruiterBusiness && !(firebaseEnabled && profilePerson.id.startsWith('cand-sample-'))
              ? (() => {
                  const m = ourTeam.find((x) => x.uid === profilePerson.id && x.status !== 'declined');
                  return { status: m ? (m.status === 'active' ? 'member' : 'invited') : 'none', onInvite: () => inviteToTeam({ uid: profilePerson.id, name: profilePerson.name }) };
                })()
              : undefined
          }
          companyResultsFor={
            activeRole === 'admin' || (activeRole === 'candidate' && profilePerson.id === candidate.id)
              ? 'all'
              : activeRole === 'recruiter'
              ? recruiterBusiness?.id ?? null
              : null
          }
          showIntegrity={activeRole === 'recruiter' || activeRole === 'admin'}
          onOpenTest={openTestPage}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 left-6 sm:left-auto z-50 p-4 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl flex items-center gap-3 max-w-md`}>
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="text-xs font-medium">{toast}</div>
        </div>
      )}
    </div>
  );
}
