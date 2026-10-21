import { AppNotification, Exam } from '../types';

// Exams already set up when the demo starts; the signed-in candidate (cand-001) has two to do
export const SEED_EXAMS: Exam[] = [
  {
    id: 'exam-001',
    title: 'Backend Engineer Assessment',
    description: 'The three tests every backend hire at PrismaScale AI takes: SQL, API design and database design.',
    businessId: 'biz-001',
    companyName: 'PrismaScale AI',
    createdBy: 'company',
    testIds: ['test-sql-01-professional', 'test-api-01', 'test-db-01'],
    passingScore: 70,
    dueDate: '2026-11-04',
    createdAt: '2026-10-14',
    invitations: [
      { candidateId: 'cand-001', invitedAt: '2026-10-14' },
      { candidateId: 'cand-002', invitedAt: '2026-10-14' },
      { candidateId: 'cand-seed-03', invitedAt: '2026-10-15' },
    ],
  },
  {
    id: 'exam-002',
    title: 'Analytics Graduate Programme',
    description: 'FinTech Core uses this exam to shortlist for its analytics graduate intake.',
    businessId: 'biz-002',
    companyName: 'FinTech Core',
    createdBy: 'vetter',
    testIds: ['test-sql-02-beginner', 'test-clean-01', 'test-dash-01'],
    passingScore: 65,
    dueDate: '2026-11-15',
    createdAt: '2026-10-18',
    invitations: [{ candidateId: 'cand-001', invitedAt: '2026-10-18' }],
  },
];

export const SEED_NOTIFICATIONS: AppNotification[] = [
  { id: 'note-001', userId: 'cand-001', kind: 'exam-invite', examId: 'exam-002', createdAt: '2026-10-18T09:30:00Z', read: false },
  { id: 'note-002', userId: 'cand-001', kind: 'exam-invite', examId: 'exam-001', createdAt: '2026-10-14T14:05:00Z', read: true },
];
