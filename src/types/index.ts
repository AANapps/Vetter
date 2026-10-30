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
  | 'Project Management';

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
  | 'Project Manager';

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
export interface TestResult {
  testId: string;
  score: number;
  completedAt: string;
  // The moment it was finished; seeded results only have the day
  completedTime?: string;
  durationSeconds?: number;
  // The company whose link the candidate took the test from
  referredBy?: string;
}

// 'choice' is multiple choice, for roles where writing code isn't the job;
// 'schema' is CREATE TABLE statements, graded by inserts that must be accepted or rejected
// How a question is answered: written code or SQL run against checks, or an answer picked, typed or arranged.
// multi: tick every right option; text: a short typed answer; order: drag items into sequence; match: drag each answer onto its prompt.
// sheet and database are worked in a spreadsheet or a database window, and marked on what the candidate leaves behind
export type QuestionType = 'sql' | 'code' | 'scenario' | 'choice' | 'schema' | 'multi' | 'text' | 'order' | 'match' | 'sheet' | 'database' | 'app';

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
  // Hidden code run after the candidate's, whose check(input) function grades each test case.
  // Lets a task grade code that isn't a pure function, such as tests the candidate writes.
  harness?: string;
  // Show what the code returns as a chart, for tasks that build visualisations
  preview?: 'chart';
  // Database tasks: the tables the database starts with. Spreadsheet tasks keep their starting workbook in starterCode
  tables?: DataTable[];
  // App simulations: the simulated product as one HTML page (its name is in contextData). Checks read its saved state
  appHtml?: string;
  testCases: TestCase[];
  timeLimitMinutes: number;
  weight: number;
}

export type TestDifficulty = 'Beginner' | 'Junior' | 'Professional' | 'Senior';

export const TEST_DIFFICULTIES: TestDifficulty[] = ['Beginner', 'Junior', 'Professional', 'Senior'];

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
  passingScore: number;
  totalQuestions: number;
  questions: Question[];
  skillsTested: string[];
  roles?: TestRole[];
  // Simulations: one scenario that every question plays out in
  scenario?: TestScenario;
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
}

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
  // The login address the invitation was emailed to, for people picked from Vetter's candidates
  emailedTo?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  kind: 'job-invite';
  jobId: string;
  createdAt: string; // ISO timestamp
  read: boolean;
}
