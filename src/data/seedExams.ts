import { AppNotification, Exam, TestResult } from '../types';

// Jobs' tests already sent when the demo starts (each assessment belongs to a job). The signed-in candidate (cand-001) has two to do;
// other people are at every stage, so the company's tracking has something to show.
export const SEED_EXAMS: Exam[] = [
  {
    id: 'exam-001',
    jobId: 'job-004',
    title: 'Senior Backend Engineer, Ingestion',
    description: 'The three tests every backend hire at PrismaScale AI takes: SQL, API design and database design.',
    businessId: 'biz-001',
    companyName: 'PrismaScale AI',
    createdBy: 'company',
    testIds: ['test-sql-01-professional', 'test-api-01', 'test-db-01'],
    passingScore: 70,
    dueDate: '2026-11-04',
    createdAt: '2026-10-14',
    invitations: [
      { candidateId: 'cand-001', invitedAt: '2026-10-14', via: 'invite', openedAt: '2026-10-14T15:20:00Z' },
      { candidateId: 'cand-002', invitedAt: '2026-10-14', via: 'invite', openedAt: '2026-10-14T16:02:00Z' },
      { candidateId: 'cand-seed-03', invitedAt: '2026-10-15', via: 'email', openedAt: '2026-10-15T08:45:00Z' },
      { candidateId: 'cand-seed-05', invitedAt: '2026-10-16', via: 'link' },
      { candidateId: 'cand-seed-07', invitedAt: '2026-10-19', via: 'link' },
      { candidateId: 'cand-seed-09', invitedAt: '2026-10-20', via: 'email' },
      { candidateId: 'cand-seed-11', invitedAt: '2026-10-22', via: 'link' },
    ],
    invitedEmails: ['priya.nair@uni.ac.uk', 'tom.hughes@uni.ac.uk', 'j.okafor@uni.ac.uk'],
  },
  {
    id: 'exam-002',
    jobId: 'job-006',
    title: 'Analytics Graduate Programme 2027',
    description: 'FinTech Core uses this assessment to shortlist for its analytics graduate intake.',
    businessId: 'biz-002',
    companyName: 'FinTech Core',
    createdBy: 'vetter',
    testIds: ['test-sql-02-beginner', 'test-clean-01', 'test-dash-01'],
    passingScore: 65,
    dueDate: '2026-11-15',
    createdAt: '2026-10-18',
    invitations: [
      { candidateId: 'cand-001', invitedAt: '2026-10-18', via: 'invite' },
      { candidateId: 'cand-003', invitedAt: '2026-10-18', via: 'invite', openedAt: '2026-10-19T10:10:00Z' },
      { candidateId: 'cand-seed-02', invitedAt: '2026-10-19', via: 'link' },
      { candidateId: 'cand-seed-04', invitedAt: '2026-10-20', via: 'link' },
    ],
  },
  {
    id: 'exam-003',
    jobId: 'job-005',
    title: 'Frontend Engineer',
    description: 'One test before a first interview for frontend roles at PrismaScale AI.',
    businessId: 'biz-001',
    companyName: 'PrismaScale AI',
    createdBy: 'company',
    testIds: ['test-fe-01'],
    passingScore: 75,
    createdAt: '2026-10-21',
    invitations: [
      { candidateId: 'cand-seed-06', invitedAt: '2026-10-21', via: 'link' },
      { candidateId: 'cand-seed-08', invitedAt: '2026-10-22', via: 'link' },
      { candidateId: 'cand-seed-10', invitedAt: '2026-10-23', via: 'email' },
    ],
  },
];

// Results people have already handed in through those links
const r = (candidateId: string, testId: string, score: number, completedAt: string, minutes: number, referredBy: string) => ({
  candidateId,
  result: { testId, score, completedAt, completedTime: `${completedAt}T14:00:00Z`, durationSeconds: minutes * 60, referredBy } as TestResult,
});

export const SEED_EXAM_RESULTS: { candidateId: string; result: TestResult }[] = [
  r('cand-002', 'test-sql-01-professional', 84, '2026-10-15', 21, 'biz-001'),
  r('cand-002', 'test-api-01', 78, '2026-10-16', 24, 'biz-001'),
  r('cand-002', 'test-db-01', 81, '2026-10-17', 19, 'biz-001'),
  r('cand-seed-03', 'test-sql-01-professional', 62, '2026-10-16', 26, 'biz-001'),
  r('cand-seed-05', 'test-sql-01-professional', 55, '2026-10-16', 28, 'biz-001'),
  r('cand-seed-05', 'test-api-01', 61, '2026-10-17', 25, 'biz-001'),
  r('cand-seed-05', 'test-db-01', 58, '2026-10-17', 22, 'biz-001'),
  r('cand-seed-07', 'test-sql-01-professional', 91, '2026-10-19', 17, 'biz-001'),
  r('cand-seed-07', 'test-api-01', 88, '2026-10-20', 20, 'biz-001'),
  r('cand-seed-07', 'test-db-01', 85, '2026-10-20', 18, 'biz-001'),
  r('cand-seed-02', 'test-sql-02-beginner', 72, '2026-10-19', 14, 'biz-002'),
  r('cand-seed-02', 'test-clean-01', 66, '2026-10-20', 18, 'biz-002'),
  r('cand-seed-04', 'test-sql-02-beginner', 80, '2026-10-20', 12, 'biz-002'),
  r('cand-seed-04', 'test-clean-01', 74, '2026-10-21', 16, 'biz-002'),
  r('cand-seed-04', 'test-dash-01', 69, '2026-10-21', 20, 'biz-002'),
  r('cand-seed-06', 'test-fe-01', 82, '2026-10-22', 16, 'biz-001'),
];

export const SEED_NOTIFICATIONS: AppNotification[] = [
  { id: 'note-001', userId: 'cand-001', kind: 'exam-invite', examId: 'exam-002', createdAt: '2026-10-18T09:30:00Z', read: false },
  { id: 'note-002', userId: 'cand-001', kind: 'exam-invite', examId: 'exam-001', createdAt: '2026-10-14T14:05:00Z', read: true },
];
