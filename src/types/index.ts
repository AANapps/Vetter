import type { IntegrityReport } from '../lib/integrity';
export type UserRole = 'candidate' | 'recruiter' | 'admin';

// The skill a test verifies
export type SkillCategory =
  | 'Databases'
  | 'Algorithms'
  | 'System Architecture'
  | 'Frontend'
  | 'Backend APIs'
  | 'Data Analysis'
  | 'Quality Assurance'
  | 'Consulting'
  | 'Finance'
  | 'Marketing'
  | 'Sales'
  | 'Healthcare'
  | 'Project Management'
  | 'Software Development'
  | 'Data Science'
  | 'Cyber Security'
  | 'AI Engineering'
  | 'AI Strategy';

// The jobs a test is relevant to; grouped by industry on the Tests page
export type TestRole =
  | 'Frontend Engineer'
  | 'Backend Engineer'
  | 'Full Stack Engineer'
  | 'Platform & DevOps'
  | 'QA Engineer'
  | 'Data Analyst'
  | 'Data Engineer'
  | 'Consultant'
  | 'Business Analyst'
  | 'Financial Analyst'
  | 'Accountant'
  | 'Digital Marketer'
  | 'Sales Representative'
  | 'Healthcare Professional'
  | 'Project Manager'
  | 'Software Developer'
  | 'Data Scientist'
  | 'SOC Analyst'
  | 'AI Engineer'
  | 'AI Consultant';

export interface VerifiedSkill {
  skillId: string;
  skillName: string;
  category: SkillCategory;
  score: number; // 0 - 100
  percentile: number; // e.g. 96th percentile
  verifiedAt: string;
  testId: string;
  level: 'Junior' | 'Mid' | 'Senior' | 'Staff / Lead';
  history: {
    date: string;
    score: number;
    testName: string;
  }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  title: string;
  businessId?: string; // Set for business users: the company they hire for
  location: string;
  yearsExperience: number;
  workPreference: 'Remote' | 'Hybrid' | 'On-site';
  bio: string;
  // Where they are in their career and what they study or studied; companies filter on these when sending tests
  careerStage?: CareerStage;
  studySubject?: string; // e.g. "Computer Science"
  university?: string;
  verifiedSkills: VerifiedSkill[];
  testResults: TestResult[];
  appliedJobIds: string[];
  // Company links the candidate followed to a test; their results on it are shared with that company
  testReferrals?: TestReferral[];
  // Profiles for different kinds of work (data, customer service, retail...); the one shown is activeProfileId
  jobProfiles?: JobProfile[];
  activeProfileId?: string;
  // The profile each application was sent with, by job id
  applicationProfiles?: Record<string, string>;
  // What they've done, in their own words: jobs, most recent first. Skills aren't typed in; Vetter's tests verify them
  experience?: WorkExperience[];
  // Where to see more of them: LinkedIn, GitHub, a portfolio
  links?: ProfileLink[];
}

export interface WorkExperience {
  id: string;
  role: string;
  company: string;
  start: string; // YYYY-MM
  end?: string; // YYYY-MM; unset while they still work there
  summary?: string;
}

export interface ProfileLink {
  label: string;
  url: string;
}

export type CareerStage = 'Student' | 'Graduate' | 'Working';

// How a candidate presents themselves for one kind of work: a headline, an about and the skills it features
export interface JobProfile {
  id: string;
  name: string; // e.g. "Data", "Customer service"
  title: string;
  bio: string;
  skillIds: string[];
}

export interface TestReferral {
  testId: string;
  businessId: string;
  at: string; // ISO date
}

// Every test a candidate completes, Vetter-made or company-made
// A company (or the Vetter team) taking a test themselves to see it as a candidate would. Saved for their team,
// never on a leaderboard or among a job's candidates
export interface TrialResult {
  id: string;
  businessId: string;
  testId: string;
  // The job it was taken from, when it was
  jobId?: string;
  score: number;
  completedAt: string;
  durationSeconds: number;
  takenBy: string;
  takenByName: string;
}

export interface TestResult {
  testId: string;
  score: number;
  completedAt: string;
  // The moment it was finished; seeded results only have the day
  completedTime?: string;
  durationSeconds?: number;
  // The company whose link the candidate took the test from
  referredBy?: string;
  // What the integrity monitor saw while they took it (src/lib/integrity.ts)
  integrity?: IntegrityReport;
  // Module tests: the score in each core area, and the highest level passed all the way up from Beginner
  breakdown?: ResultBreakdown;
}

export interface ResultBreakdown {
  aspects: { id: string; name: string; score: number }[];
  tiers: { tier: TestDifficulty; score: number }[];
  // Unset when even the Beginner questions fell short
  levelReached?: TestDifficulty;
}

// 'choice' is multiple choice, for roles where writing code isn't the job;
// 'schema' is CREATE TABLE statements, graded by inserts that must be accepted or rejected
// How a question is answered: written code or SQL run against checks, or an answer picked, typed or arranged.
// multi: tick every right option; text: a short typed answer; order: drag items into sequence; match: drag each answer onto its prompt.
// sheet and database are worked in a spreadsheet or a database window, and marked on what the candidate leaves behind
// written: an extended answer marked on its rubric; case: a case study to read, with sub-questions and no answer of its own
export type QuestionType = 'sql' | 'code' | 'scenario' | 'choice' | 'schema' | 'multi' | 'text' | 'written' | 'order' | 'match' | 'case' | 'sheet' | 'database' | 'app' | 'email' | 'assistant';

// A table of sample data: the starting tables of a database task
export interface DataTable {
  name: string;
  columns: string[];
  rows: Record<string, string | number | null>[];
}

// A file handed to the candidate with a scenario, to download or import into the spreadsheet or database
export interface CaseFile {
  name: string;
  content: string;
}

// The situation a whole test plays out in: who the candidate works for, what's been asked, and the files they get
export interface TestScenario {
  company: string;
  role: string;
  brief: string;
  files?: CaseFile[];
  // Who the candidate works with at the company, the same people in every email and question of the test
  people?: EmailContact[];
}

// Someone at (or around) the company in a job simulation, who emails can come from and go to
export interface EmailContact {
  name: string;
  role: string;
  email: string;
}

// One email in a thread the candidate reads
export interface EmailMessage {
  from: string;
  to: string[];
  cc: string[];
  date: string;
  subject: string;
  body: string;
}

// An AI-assisted task: the candidate prompts an AI assistant through a piece of work and hands in the result. Marked on
// the result and on how they used the assistant: the context they gave it, whether they checked what it said
export interface AssistantTask {
  // What the candidate is handed to work from (notes, figures, a draft), shown to them and known to the assistant
  material: string;
  // The assistant's own notes, never shown to the candidate: what it knows, and the weakness it has (a wrong assumption
  // it makes unless it's given the right context or asked to check), so relying on it blindly shows
  brief: string;
  // What good use of the assistant looks like here, each an equal share of the process marks
  process: string[];
}

// An email task: a thread lands in the candidate's inbox and they write the reply, choosing who it goes to and who is
// copied in. Marked on the recipients (to, cc, and anyone it must not go to) and on what the reply says (rubric)
export interface EmailTask {
  thread: EmailMessage[];
  // The address book the candidate picks recipients from
  contacts: EmailContact[];
  to: string[];
  cc: string[];
  // People the reply must not go to, e.g. a customer on an internal matter
  avoid: string[];
}

export interface TestCase {
  id: string;
  description: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  prompt: string;
  contextData?: string; // e.g., table schema or system architecture diagram description
  starterCode: string;
  solutionCode?: string;
  // Multiple choice only: the answers to pick from and the index of the right one
  options?: string[];
  correctOption?: number;
  // Select all that apply: the indexes of every right option
  correctOptions?: number[];
  // Short answer: every answer accepted, compared ignoring case, spacing and punctuation
  acceptedAnswers?: string[];
  // Drag to order: the items in their right order (candidates see them shuffled)
  items?: string[];
  // Drag to match: each prompt on the left with the answer that belongs to it
  pairs?: { left: string; right: string }[];
  // Written answers: the points a strong answer makes, each worth an equal share (the model answer is in solutionCode)
  rubric?: string[];
  // Hidden code run after the candidate's, whose check(input) function grades each test case.
  // Lets a task grade code that isn't a pure function, such as tests the candidate writes.
  harness?: string;
  // Show what the code returns as a chart, for tasks that build visualisations
  preview?: 'chart';
  // Database tasks: the tables the database starts with. Spreadsheet tasks keep their starting workbook in starterCode
  tables?: DataTable[];
  // App simulations: the simulated product as one HTML page (its name is in contextData). Checks read its saved state
  appHtml?: string;
  // Email tasks: the thread, the address book and who the reply should go to (its marking points are in rubric)
  email?: EmailTask;
  // AI-assisted tasks: the candidate works with an AI assistant to get the job done (the final work's marking points
  // are in rubric)
  assistant?: AssistantTask;
  // A question about a hands-on task (a spreadsheet, database or app question) or a case study: its id. It's asked
  // beside the task's window or the case's material, about what the candidate did, found or read there
  taskId?: string;
  testCases: TestCase[];
  timeLimitMinutes: number;
  weight: number;
  // Tests built on a module skeleton: the core area of the skill it tests (an id from the test's aspects) and the
  // level it belongs to. A test at one level asks every level up to its own, so a Senior pass covers Beginner too
  aspect?: string;
  tier?: TestDifficulty;
  // A short typed answer that counts as a quick check, not a long task, when levels are built
  quick?: boolean;
}

// One core area of a module, such as CSS & Layout in Frontend. Every level of the module tests every area
export interface TestAspect {
  id: string;
  name: string;
  summary: string;
}

export type TestDifficulty = 'Beginner' | 'Junior' | 'Professional' | 'Senior';

// In the public library, for every company to use and every candidate to take: Vetter's own tests, and companies'
// tests the Vetter team approved
export const isPublic = (test: Pick<AssessmentTest, 'type' | 'publicStatus'>) => test.type === 'standard' || test.publicStatus === 'approved';

// Whether a test is changed by asking Vetter (made in the test chat) or by hand. Tests saved before this was recorded
// are told apart by what only the chat leaves: a blueprint (which the builder used to drop on saving), or question ids
// from the chat's id maker, q-<time>-<5 characters>; the builder's have 4
const CHAT_QUESTION_ID = /^q-[a-z0-9]+-[a-z0-9]{5}$/;
export const madeWithAI = (test: AssessmentTest) =>
  (test.madeWith ?? (test.blueprint?.length || test.questions.some((q) => CHAT_QUESTION_ID.test(q.id)) ? 'ai' : 'hand')) === 'ai';

// The minutes a candidate has for a test, or null when it has no time limit
export const timerOf = (test: { timeLimit?: number | 'none'; estimatedMinutes: number }): number | null =>
  test.timeLimit === 'none' ? null : test.timeLimit ?? test.estimatedMinutes;

// The levels tests come in. Beginner is no longer offered; tests saved at it are treated as Junior
export const TEST_DIFFICULTIES: TestDifficulty[] = ['Junior', 'Professional', 'Senior'];

// The name a level is shown by: Professional is called Mid-level
export const levelName = (level: TestDifficulty | string) => (level === 'Professional' ? 'Mid-level' : level);

export interface AssessmentTest {
  id: string;
  title: string;
  category: SkillCategory;
  difficulty: TestDifficulty;
  // 'standard' tests are made by Vetter; 'custom' tests are made by a company for its own jobs
  type: 'standard' | 'custom';
  // Versions of one test at different levels share a familyId: the id of its main version
  familyId?: string;
  businessId?: string;
  companyName?: string;
  description: string;
  estimatedMinutes: number;
  // The timer the company set: minutes for the whole test, or 'none' for no time limit. Without it the timer is
  // estimatedMinutes, what the questions add up to
  timeLimit?: number | 'none';
  // Written (or since enhanced) in the test chat with Vetter's AI, or in the builder by hand
  madeWith?: 'ai' | 'hand';
  // A company's test offered to everyone: the company asks (pending), the Vetter team approves it or turns it down
  // (with why). Approved, it's in every company's library and on the candidates' Tests page. Changing it sends it back
  // for approval
  publicStatus?: 'pending' | 'approved' | 'rejected';
  publicAskedAt?: string;
  publicNote?: string;
  passingScore: number;
  totalQuestions: number;
  questions: Question[];
  skillsTested: string[];
  roles?: TestRole[];
  // Simulations: one scenario that every question plays out in
  scenario?: TestScenario;
  // Module tests: the core areas every level covers; each question names one. Companies can add their own questions
  // to any area at any level
  aspects?: TestAspect[];
  // Training: written to teach employees a piece of software or a way of working, not to hire. Never on leaderboards or
  // profiles; a company assigns it to its team, and each person sees feedback on every task when they finish
  purpose?: 'training';
  // What the hire needs, worked out before the questions were written: each competency, why it matters, how the test
  // proves it, and its share of the marks
  blueprint?: BlueprintItem[];
}

export interface BlueprintItem {
  skill: string;
  why: string;
  how: string;
  weight: number;
}

export interface SubmissionResult {
  id: string;
  testId: string;
  testTitle: string;
  candidateId: string;
  candidateName: string;
  submittedAt: string;
  overallScore: number;
  percentile: number;
  durationSeconds: number;
  questionResults: {
    questionId: string;
    questionTitle: string;
    passed: boolean;
    score: number;
    testCasesPassed: number;
    totalTestCases: number;
    executionTimeMs: number;
    codeSubmitted: string;
    feedback: string;
  }[];
  integrityMetric: {
    tabSwitches: number;
    focusPercentage: number;
    flagged: boolean;
  };
}

export interface Business {
  id: string;
  name: string;
  logo: string;
  industry: string;
  headquarters: string;
  companySize: string;
  websiteUrl: string;
  description: string;
  techStack: string[];
  // The plan it pays for; unset or 'free' has no AI test creation. Only the Vetter team sets it
  plan?: BusinessPlan;
}

export type BusinessPlan = 'free' | 'per-job' | 'growth' | 'scale';
// AI-written tests and simulations come with any paid plan
export const hasAiTests = (business?: Business) => !!business?.plan && business.plan !== 'free';

export interface JobRequirement {
  skillId: string;
  // Set when the requirement is a test: candidates are scored by their best result on it
  testId?: string;
  skillName: string;
  minScore: number; // e.g. 75
  importance: 'required' | 'preferred';
  weight: number; // 0.1 to 1.0
}

export interface JobPosting {
  id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  businessId?: string;
  // Who wrote the listing: the company itself, or the Vetter team on its behalf
  postedBy?: 'company' | 'vetter';
  location: string;
  workType: 'Remote' | 'Hybrid' | 'On-site';
  salaryRange: string;
  description: string;
  department: string;
  postedDate: string;
  // Full listing details; optional so quickly created jobs still work
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  experienceLevel?: string;
  closingDate?: string;
  startDate?: string;
  responsibilities?: string[];
  qualifications?: string[];
  niceToHave?: string[];
  benefits?: string[];
  requirements: JobRequirement[];
  // The job's tests, in order (Vetter-made or the company's own). Each is an ordinary test: a score on it counts here
  // however it was taken
  testIds: string[];
  // Average score across the job's tests needed to pass
  testPassingScore: number;
  // How many times a candidate may start each of the job's tests; 0 or unset is no limit. Starts left unsubmitted count
  maxAttempts?: number;
  // Candidates must pass the tests before they can apply
  testsRequired: boolean;
  // Everyone the job's tests have been sent to, and addresses emailed that have no Vetter account yet
  invitations: JobInvitation[];
  invitedEmails?: string[];
  applicantCount: number;
  status: 'active' | 'paused' | 'filled';
}

export interface SkillMatchBreakdown {
  skillName: string;
  candidateScore: number;
  requiredMinScore: number;
  importance: 'required' | 'preferred';
  meetsThreshold: boolean;
  scoreRatio: number;
  weightedContribution: number;
}

export interface CandidateJobMatch {
  candidateId: string;
  candidateName: string;
  candidateTitle: string;
  candidateAvatar: string;
  candidateLocation: string;
  yearsExperience: number;
  jobId: string;
  jobTitle: string;
  companyName: string;
  businessId?: string;
  overallFitPercentage: number; // 0 - 100
  meetsAllHardRequirements: boolean;
  breakdown: SkillMatchBreakdown[];
  // How the candidate did on the job's tests: passed, still to take, or below the pass mark; the average once all are taken
  jobTestStatus?: 'qualified' | 'requires_test' | 'test_taken_failed';
  jobTestScore?: number;
  applicationStatus?: 'none' | 'applied' | 'reviewing' | 'interview' | 'offer' | 'rejected';
  matchTier: 'Top Match' | 'Strong Fit' | 'Borderline' | 'Needs Upskilling';
}

// Discovery feed: what candidates write, and how they react to each other's activity
export interface FeedPost {
  id: string;
  authorId: string;
  text: string;
  createdAt: string; // ISO timestamp
  sharedTestId?: string; // A Vetter test the author is sharing their result on
}

export interface FeedComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface SocialState {
  posts: FeedPost[];
  comments: Record<string, FeedComment[]>; // keyed by feed item id
  kudosGiven: string[]; // feed item ids the signed-in candidate gave kudos to
  // Kudos from everyone else, by feed item id; without it (the demo) counts are made up
  kudosCounts?: Record<string, number>;
  following: string[]; // candidate and company ids
}

// Someone sent a job's tests, or who started them from the job's page
export interface JobInvitation {
  candidateId: string;
  invitedAt: string; // ISO date
  // How they got it: from the job's link or page, emailed it, or picked from Vetter's candidates
  via?: 'link' | 'email' | 'invite';
  // When they first opened the job, and first started one of its tests
  openedAt?: string; // ISO timestamp
  startedAt?: string; // ISO timestamp
  // Every time they began one of the job's tests; one with no finishedAt was left without submitting
  attempts?: JobTestAttempt[];
  // The login address the invitation was emailed to, for people picked from Vetter's candidates
  emailedTo?: string;
}

export interface JobTestAttempt {
  testId: string;
  startedAt: string; // ISO timestamp
  finishedAt?: string; // ISO timestamp
}

export interface AppNotification {
  id: string;
  userId: string;
  kind: 'job-invite';
  jobId: string;
  createdAt: string; // ISO timestamp
  read: boolean;
}

// Where a candidate is in a company's hiring for one job. Invited and applied are where everyone starts;
// the rest are set by the company. Private to the company: candidates never see their stage
export type LeadStage = 'invited' | 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'archived';

export type ArchiveReason = 'Not a fit' | 'Below pass mark' | 'Suspected cheating' | 'Withdrew' | 'No response' | 'Hired elsewhere' | 'Role filled' | 'Other';

// What the company has recorded about one candidate for one job; anyone without one is at their starting stage
// A test still being written: kept only for its company (and the Vetter team) until it's saved as a test
// What the AI writes: a skills test of separate questions, a job simulation (a working day at the company, with its
// people, emails and tools), or a training simulation that teaches the team an app or a way of working
export type TestKind = 'test' | 'simulation' | 'training';

// Someone a company asked to join its team on Vetter, by their account (picked from candidates) or by email. Once they
// accept, the company can assign them tests, job simulations and training. Kept in teamMembers/<businessId>__<key>,
// where key is their uid, or their email for someone invited by address
export interface TeamMember {
  id: string;
  businessId: string;
  companyName: string;
  uid?: string;
  email?: string;
  name: string;
  status: 'invited' | 'active' | 'declined';
  invitedAt: string; // ISO timestamp
  joinedAt?: string;
}

// A test, job simulation or training a company gave someone on its team, and how they got on. Kept private to the
// company and the person: it's never on their public profile or a leaderboard
export interface Assignment {
  id: string;
  businessId: string;
  companyName: string;
  memberId: string;
  // Their account, once they've joined
  uid?: string;
  testId: string;
  assignedAt: string; // ISO timestamp
  dueDate?: string; // YYYY-MM-DD
  note?: string;
  startedAt?: string;
  completedAt?: string;
  score?: number;
  durationSeconds?: number;
}

export interface TestDraft {
  id: string;
  // A skills test or a job simulation, as the company chose
  kind?: TestKind;
  // The company it's for; '' for the Vetter library
  businessId: string;
  // The job it was being written for, if any
  jobId?: string;
  // When it holds unsaved changes to a test already saved, that test's id; saving it updates that test
  editsTestId?: string;
  test: AssessmentTest;
  // The conversation with Vetter's AI it came from, to carry on where it left off; none if written by hand
  messages?: { role: 'user' | 'assistant'; text: string; note?: string }[];
  // Library tests the AI suggested alongside it, and why
  existing?: { testId: string; reason: string }[];
  research?: string;
  researchedFor?: string;
  // The question types the company allowed, how many questions it asked for and the levels it picked; none of one means
  // Vetter decides. questionCount and difficulty are the single picks drafts saved before several could be ticked
  styles?: QuestionType[];
  // The timer picked; none means Vetter decides
  timeLimit?: number | 'none';
  questionCounts?: number[];
  difficulties?: TestDifficulty[];
  questionCount?: number;
  difficulty?: TestDifficulty;
  updatedAt: string; // ISO timestamp
}

export interface Lead {
  // jobId__candidateId
  id: string;
  jobId: string;
  candidateId: string;
  businessId: string;
  stage: LeadStage;
  // 1 to 5 stars
  rating?: number;
  note?: string;
  archiveReason?: ArchiveReason;
  // A date set for the interview, or for when the offer runs out
  dueDate?: string;
  tags?: string[];
  updatedAt: string; // ISO timestamp
  history: { stage: LeadStage; at: string }[];
}
