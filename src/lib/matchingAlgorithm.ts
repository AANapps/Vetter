import { JobPosting, SkillMatchBreakdown, CandidateJobMatch, User } from '../types';
import { jobTestProgress } from './jobTests';

// Highest score the candidate has achieved on a given test, if they've taken it
export function getBestTestScore(candidate: User, testId: string): number | undefined {
  const scores = candidate.testResults.filter((r) => r.testId === testId).map((r) => r.score);
  return scores.length > 0 ? Math.max(...scores) : undefined;
}

export function calculateCandidateJobMatch(candidate: User, job: JobPosting): CandidateJobMatch {
  const breakdown: SkillMatchBreakdown[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let meetsAllHardRequirements = true;

  // Build candidate skill map
  const skillMap = new Map<string, number>();
  candidate.verifiedSkills.forEach((vs) => {
    skillMap.set(vs.skillName.toLowerCase(), vs.score);
    // Also map aliases/categories
    if (vs.category) {
      skillMap.set(vs.category.toLowerCase(), vs.score);
    }
  });

  // No pass marks: a skill counts by its score out of 100; a required one not taken yet counts as missing
  job.requirements.forEach((req) => {
    const score = req.testId ? getBestTestScore(candidate, req.testId) : skillMap.get(req.skillName.toLowerCase());
    const taken = score !== undefined;
    const candidateScore = score ?? 0;
    if (req.importance === 'required' && !taken) meetsAllHardRequirements = false;

    const scoreRatio = candidateScore / 100;
    const weightedContribution = scoreRatio * req.weight;
    totalWeightedScore += weightedContribution;
    totalWeight += req.weight;

    breakdown.push({
      skillName: req.skillName,
      candidateScore,
      importance: req.importance,
      taken,
      scoreRatio: Math.round(scoreRatio * 100) / 100,
      weightedContribution: Math.round(weightedContribution * 100) / 100,
    });
  });

  const rawFitRatio = totalWeight > 0 ? totalWeightedScore / totalWeight : 0.8;
  let overallFitPercentage = Math.round(rawFitRatio * 100);

  // Experience & Preference fine-tuning (up to +/- 5%)
  if (candidate.workPreference === job.workType) {
    overallFitPercentage += 2;
  }
  if (!meetsAllHardRequirements) {
    // A required skill not taken yet: cap at 74%
    overallFitPercentage = Math.min(74, overallFitPercentage);
  }

  // Constrain between 12% and 99%
  overallFitPercentage = Math.max(15, Math.min(99, overallFitPercentage));

  let matchTier: CandidateJobMatch['matchTier'] = 'Needs Upskilling';
  if (overallFitPercentage >= 85 && meetsAllHardRequirements) {
    matchTier = 'Top Match';
  } else if (overallFitPercentage >= 75) {
    matchTier = 'Strong Fit';
  } else if (overallFitPercentage >= 60) {
    matchTier = 'Borderline';
  }

  // The job's tests: completed once every one is taken
  const progress = jobTestProgress(job, candidate);
  const jobTestStatus: CandidateJobMatch['jobTestStatus'] =
    job.testIds.length === 0 ? undefined : progress.status === 'completed' ? 'completed' : 'requires_test';

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
