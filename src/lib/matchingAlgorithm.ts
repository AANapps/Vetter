import { JobPosting, SkillMatchBreakdown, CandidateJobMatch, User } from '../types';
import { jobTestProgress } from './jobTests';

// Highest score the candidate has achieved on a given test, if they've taken it
export function getBestTestScore(candidate: User, testId: string): number | undefined {
  const scores = candidate.testResults.filter((r) => r.testId === testId).map((r) => r.score);
  return scores.length > 0 ? Math.max(...scores) : undefined;
}

// Fit is the job's own tests and nothing else: the average of the candidate's scores on them (the scores the job counts,
// so with an attempt limit only the first tries), a test not taken yet counting 0. A job with no tests has no fit
export function calculateCandidateJobMatch(candidate: User, job: JobPosting): CandidateJobMatch {
  const progress = jobTestProgress(job, candidate);
  const total = job.testIds.length;
  const breakdown: SkillMatchBreakdown[] = job.testIds.map((testId) => {
    const score = progress.scores[testId];
    const req = job.requirements.find((r) => r.testId === testId);
    const scoreRatio = (score ?? 0) / 100;
    return {
      skillName: req?.skillName ?? testId,
      candidateScore: score ?? 0,
      importance: req?.importance ?? 'required',
      taken: score !== undefined,
      scoreRatio: Math.round(scoreRatio * 100) / 100,
      weightedContribution: Math.round((scoreRatio / total) * 100) / 100,
    };
  });
  const overallFitPercentage = total ? Math.round(breakdown.reduce((sum, b) => sum + b.candidateScore, 0) / total) : 0;
  // Every one of the job's tests taken
  const meetsAllHardRequirements = total > 0 && progress.done === total;

  let matchTier: CandidateJobMatch['matchTier'] = 'Needs upskilling';
  if (overallFitPercentage >= 85) matchTier = 'Top match';
  else if (overallFitPercentage >= 75) matchTier = 'Strong fit';
  else if (overallFitPercentage >= 60) matchTier = 'Borderline';

  const jobTestStatus: CandidateJobMatch['jobTestStatus'] = total === 0 ? undefined : progress.status === 'completed' ? 'completed' : 'requires_test';

  const isApplied = candidate.appliedJobIds?.includes(job.id);

  return {
    candidateId: candidate.id,
    candidateName: candidate.name,
    candidateTitle: candidate.title,
    candidateAvatar: candidate.avatarUrl,
    candidateLocation: candidate.location,
    yearsExperience: candidate.yearsExperience,
    jobId: job.id,
    jobTitle: job.title,
    companyName: job.companyName,
    businessId: job.businessId,
    overallFitPercentage,
    meetsAllHardRequirements,
    breakdown,
    jobTestStatus,
    jobTestScore: progress.score,
    applicationStatus: isApplied ? 'applied' : 'none',
    matchTier,
  };
}

export function rankCandidatesForJob(candidates: User[], job: JobPosting): CandidateJobMatch[] {
  const matches = candidates.map((cand) => calculateCandidateJobMatch(cand, job));
  return matches.sort((a, b) => b.overallFitPercentage - a.overallFitPercentage);
}

export function rankJobsForCandidate(candidate: User, jobs: JobPosting[]): CandidateJobMatch[] {
  const matches = jobs.map((job) => calculateCandidateJobMatch(candidate, job));
  return matches.sort((a, b) => b.overallFitPercentage - a.overallFitPercentage);
}
