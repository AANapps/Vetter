import { CareerStage, JobPosting, User } from '../types';

// Who a company sends tests to: candidates narrowed down by career stage, subject, level and location

export type CandidateLevel = 'Junior' | 'Mid' | 'Senior';

export const CAREER_STAGES: CareerStage[] = ['Student', 'Graduate', 'Working'];
export const CANDIDATE_LEVELS: CandidateLevel[] = ['Junior', 'Mid', 'Senior'];

export const SUBJECTS = [
  'Computer Science',
  'Software Engineering',
  'Data Science',
  'Mathematics',
  'Physics',
  'Engineering',
  'Economics',
  'Business',
];

export const stageOf = (c: User): CareerStage => c.careerStage ?? 'Working';

// Students and new graduates count as junior whatever else they've done
export function levelOf(c: User): CandidateLevel {
  if (stageOf(c) !== 'Working' || c.yearsExperience <= 2) return 'Junior';
  return c.yearsExperience <= 6 ? 'Mid' : 'Senior';
}

export const cityOf = (c: User) => c.location.split(',')[0].trim();

export interface AudienceFilters {
  stages: CareerStage[];
  levels: CandidateLevel[];
  subject: string; // '' for any
  city: string; // '' for anywhere
  query: string;
}

export const emptyAudience = (): AudienceFilters => ({ stages: [], levels: [], subject: '', city: '', query: '' });

export const audienceIsEmpty = (f: AudienceFilters) => !f.stages.length && !f.levels.length && !f.subject && !f.city && !f.query.trim();

export function matchesAudience(c: User, f: AudienceFilters) {
  if (f.stages.length && !f.stages.includes(stageOf(c))) return false;
  if (f.levels.length && !f.levels.includes(levelOf(c))) return false;
  if (f.subject && c.studySubject !== f.subject) return false;
  if (f.city && cityOf(c) !== f.city) return false;
  const q = f.query.trim().toLowerCase();
  return !q || `${c.name} ${c.title} ${c.location} ${c.studySubject ?? ''} ${c.university ?? ''}`.toLowerCase().includes(q);
}

// "Computer Science student at UCL", "Graduate Software Engineer", "Backend Engineer"
export function headline(c: User) {
  const stage = stageOf(c);
  if (stage === 'Working' || !c.studySubject) return c.title;
  const what = stage === 'Student' ? `${c.studySubject} student` : `${c.studySubject} graduate`;
  return c.university ? `${what} at ${c.university}` : what;
}

// What a candidate picked from Vetter is emailed at their login address
export function inviteEmail(job: JobPosting, candidate: User, link: string) {
  const count = job.testIds.length;
  return {
    to: candidate.email,
    subject: `${job.companyName} has invited you to take ${count === 1 ? 'a test' : `${count} tests`} for ${job.title}`,
    body: `Hi ${candidate.name.split(' ')[0]},\n\n${job.companyName} would like you to take the tests for ${job.title}: ${count} ${count === 1 ? 'test' : 'tests'}${
      job.closingDate ? `, by ${job.closingDate}` : ''
    }. Your results go straight to ${job.companyName}.\n\nStart here: ${link}\n`,
  };
}
