import { AssessmentTest, JobPosting, User } from '../types';
import { calculateCandidateJobMatch } from './matchingAlgorithm';
import { jobTestProgress } from './jobTests';
import { getLeaderboard } from './leaderboard';
import { sortExperience } from './experience';

/**
 * Why a candidate fits one of the company's jobs, in a few plain lines a hiring manager can read at a glance: their
 * fit, then the evidence for it (the job's own simulation, skills Praxa has proven that the job asks for, their work
 * history and how they want to work), then anything to check. Worked out from their record, not written by AI, so it's
 * instant and always matches the numbers.
 */

export interface FitSummary {
  job: JobPosting;
  fit: number;
  tier: string;
  reasons: string[];
  concerns: string[];
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !['and', 'the', 'senior', 'junior', 'lead', 'head'].includes(w));
const list = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

export function fitSummary(person: User, job: JobPosting, tests: AssessmentTest[], candidates: User[]): FitSummary {
  const match = calculateCandidateJobMatch(person, job);
  const reasons: string[] = [];
  const concerns: string[] = [];

  // The job's own tests (its job simulation): their score against the pass mark, and where they stand
  const progress = jobTestProgress(job, person);
  const jobTests = job.testIds.map((id) => tests.find((t) => t.id === id)).filter((t): t is AssessmentTest => !!t);
  if (progress.status === 'passed' || progress.status === 'failed') {
    const sim = jobTests.length === 1 ? jobTests[0].title.replace(/:.*$/, '') : 'your tests';
    if (progress.status === 'passed') reasons.push(`Scored ${progress.score} on ${sim}, above your pass mark of ${job.testPassingScore}.`);
    else concerns.push(`Scored ${progress.score} on ${sim}, below your pass mark of ${job.testPassingScore}.`);
  } else if (progress.done > 0) concerns.push(`Has taken ${progress.done} of ${progress.total} of your tests so far.`);
  else if (job.testIds.length) concerns.push('Hasn’t taken your job simulation yet.');

  // Skills the job asks for that Praxa has proven, and the ones still unproven
  // The job's own tests are covered above; these are the skills the company listed beyond them
  const ownTest = new Set(job.requirements.filter((q) => q.testId && job.testIds.includes(q.testId)).map((q) => q.skillName));
  const listed = match.breakdown.filter((b) => !ownTest.has(b.skillName));
  const met = listed.filter((b) => b.meetsThreshold && b.candidateScore > 0);
  const missed = listed.filter((b) => !b.meetsThreshold && b.importance === 'required');
  if (met.length) reasons.push(`Proven ${list(met.slice(0, 3).map((b) => `${b.skillName} (${b.candidateScore})`))} on Praxa, at or above what you asked for.`);
  if (missed.length) concerns.push(`${list(missed.slice(0, 3).map((b) => b.skillName))} ${missed.length === 1 ? 'isn’t' : 'aren’t'} proven to your minimum yet.`);

  // Their best place on a Praxa board for one of the job's skills
  const relevant = person.verifiedSkills.filter((v) => job.requirements.some((r) => r.skillName.toLowerCase() === v.skillName.toLowerCase() || r.testId === v.testId));
  const ranked = relevant
    .map((v) => {
      const board = getLeaderboard(v.testId, candidates);
      const at = board.findIndex((e) => e.candidate.id === person.id);
      return at >= 0 ? { name: v.skillName, rank: at + 1, of: board.length } : null;
    })
    .filter((r): r is { name: string; rank: number; of: number } => !!r && r.of >= 5 && r.rank / r.of <= 0.2)
    .sort((a, b) => a.rank / a.of - b.rank / b.of)[0];
  if (ranked) reasons.push(`Top ${Math.max(1, Math.round((ranked.rank / ranked.of) * 100))}% of ${ranked.of} candidates on Praxa’s ${ranked.name} test.`);

  // Their work: years, and a job like this one
  const history = sortExperience(person.experience ?? []);
  const titleWords = words(job.title);
  const similar = history.find((h) => words(h.role).some((w) => titleWords.includes(w)));
  if (similar) reasons.push(`${similar.end ? 'Was' : 'Is'} ${/^[aeiou]/i.test(similar.role) ? 'an' : 'a'} ${similar.role} at ${similar.company}${person.yearsExperience ? `, with ${person.yearsExperience} ${person.yearsExperience === 1 ? 'year' : 'years'} in work` : ''}.`);
  else if (person.yearsExperience) reasons.push(`${person.yearsExperience} ${person.yearsExperience === 1 ? 'year' : 'years'} of work experience${history[0] ? `, most recently ${history[0].role} at ${history[0].company}` : ''}.`);

  // How they want to work
  if (person.workPreference && person.workPreference === job.workType) reasons.push(`Wants ${job.workType.toLowerCase()} work, as this job is.`);
  else if (person.workPreference && job.workType) concerns.push(`Prefers ${person.workPreference.toLowerCase()} work; this job is ${job.workType.toLowerCase()}.`);

  return { job, fit: match.overallFitPercentage, tier: match.matchTier, reasons: reasons.slice(0, 4), concerns: concerns.slice(0, 3) };
}

// The company's job a leaderboard's fit is worked out for: one that uses the test, else its newest open job
export const jobForTest = (jobs: JobPosting[], testId: string) => {
  const open = jobs.filter((j) => j.status === 'active');
  return open.find((j) => j.testIds.includes(testId)) ?? open[0] ?? jobs[0];
};

// The colour a fit shows in: green from 80, amber from 60, grey below
export const fitTone = (fit: number) => (fit >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : fit >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-600 bg-slate-100 border-slate-200');
