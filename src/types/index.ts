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
  | 'Consulting';

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
  | 'Business Analyst';

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
  verifiedSkills: VerifiedSkill[];
  testResults: TestResult[];
  appliedJobIds: string[];
}

// Every test a candidate completes, Vetter-made or company-made
export interface TestResult {
  testId: string;
  score: number;
  completedAt: string;
  durationSeconds?: number;
}

// 'choice' is multiple choice, for roles where writing code isn't the job;
// 'schema' is CREATE TABLE statements, graded by inserts that must be accepted or rejected
export type QuestionType = 'sql' | 'code' | 'scenario' | 'choice' | 'schema';

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
  // Hidden code run after the candidate's, whose check(input) function grades each test case.
  // Lets a task grade code that isn't a pure function, such as tests the candidate writes.
  harness?: string;
  // Show what the code returns as a chart, for tasks that build visualisations
  preview?: 'chart';
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
  // A job may have one test attached (Vetter-made or the company's own)
  attachedTestId?: string;
  attachedTestTitle?: string;
  attachedTestPassingScore?: number;
  isAttachedTestMandatory?: boolean;
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
  attachedTestStatus?: 'qualified' | 'requires_test' | 'test_taken_failed';
  attachedTestScore?: number;
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
  following: string[]; // candidate and company ids
}

// An exam: a series of tests a company invites candidates to take, like a course
export interface Exam {
  id: string;
  title: string;
  description: string;
  businessId: string;
  companyName: string;
  // Who set it up: the company itself, or the Vetter team on its behalf
  createdBy: 'company' | 'vetter';
  // The test versions to take, in order
  testIds: string[];
  // Average score across the tests needed to pass
  passingScore: number;
  dueDate?: string;
  createdAt: string;
  invitations: ExamInvitation[];
}

export interface ExamInvitation {
  candidateId: string;
  invitedAt: string; // ISO date; only results from this day on count toward the exam
}

export interface AppNotification {
  id: string;
  userId: string;
  kind: 'exam-invite';
  examId: string;
  createdAt: string; // ISO timestamp
  read: boolean;
}
