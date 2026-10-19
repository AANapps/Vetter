export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface VerifiedSkill {
  skillId: string;
  skillName: string;
  category: 'Databases' | 'Algorithms' | 'System Architecture' | 'Frontend' | 'Backend APIs';
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
  company?: string;
  location: string;
  yearsExperience: number;
  workPreference: 'Remote' | 'Hybrid' | 'On-site';
  bio: string;
  verifiedSkills: VerifiedSkill[];
  appliedJobIds: string[];
}

export type QuestionType = 'sql' | 'code' | 'scenario';

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
  testCases: TestCase[];
  timeLimitMinutes: number;
  weight: number;
}

export interface AssessmentTest {
  id: string;
  title: string;
  category: 'Databases' | 'Algorithms' | 'System Architecture' | 'Frontend' | 'Backend APIs';
  difficulty: 'Intermediate' | 'Advanced' | 'Staff Specialist';
  type: 'standard' | 'custom';
  companyId?: string;
  companyName?: string;
  description: string;
  estimatedMinutes: number;
  passingScore: number;
  totalQuestions: number;
  questions: Question[];
  skillsTested: string[];
  testTakersCount: number;
  avgScore: number;
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
  tier: 'tier_1_standard' | 'tier_2_custom';
  activeJobCount: number;
  description: string;
  techStack: string[];
  attachedTestCount: number;
}

export interface JobRequirement {
  skillId: string;
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
  location: string;
  workType: 'Remote' | 'Hybrid' | 'On-site';
  salaryRange: string;
  tier: 'tier_1_standard' | 'tier_2_custom';
  description: string;
  department: string;
  postedDate: string;
  requirements: JobRequirement[];
  // Pillar Connection: Tests can be attached to jobs as part of application
  attachedTestId?: string;
  attachedTestTitle?: string;
  attachedTestPassingScore?: number;
  isAttachedTestMandatory?: boolean;
  customAssessmentId?: string;
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
  // Pillar 2 Attachment Status
  attachedTestStatus?: 'qualified' | 'requires_test' | 'test_taken_failed';
  attachedTestScore?: number;
  applicationStatus?: 'none' | 'applied' | 'reviewing' | 'interview' | 'offer' | 'rejected';
  matchTier: 'Top Match' | 'Strong Fit' | 'Borderline' | 'Needs Upskilling';
}

export interface LeaderboardRank {
  rank: number;
  candidateId: string;
  candidateName: string;
  avatarUrl: string;
  skillName: string;
  score: number;
  percentile: number;
  badges: string[];
  totalAssessmentsPassed: number;
  lastActive: string;
}
