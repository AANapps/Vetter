import React, { useState } from 'react';
import { User, AssessmentTest, JobPosting, CandidateJobMatch } from '../types';
import { rankJobsForCandidate } from '../lib/matchingAlgorithm';
import {
  Award,
  CheckCircle2,
  Briefcase,
  Play,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building,
  DollarSign,
  Sparkles,
  ShieldCheck,
  Send,
  Crown
} from 'lucide-react';
import { VerifiedSkillBadge } from './VerifiedSkillBadge';
import { JobApplicationModal } from './JobApplicationModal';

interface CandidatePortalProps {
  candidate: User;
  tests: AssessmentTest[];
  jobs: JobPosting[];
  onStartTest: (test: AssessmentTest) => void;
  onStartAttachedTest?: (test: AssessmentTest, forJobId: string) => void;
  onApplyJob: (jobId: string) => void;
  onViewLeaderboard: () => void;
}

export const CandidatePortal: React.FC<CandidatePortalProps> = ({
  candidate,
  tests,
  jobs,
  onStartTest,
  onStartAttachedTest,
  onApplyJob,
  onViewLeaderboard,
}) => {
  const [activeSection, setActiveSection] = useState<'passport' | 'assessments' | 'matches'>('passport');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [selectedJobForApplication, setSelectedJobForApplication] = useState<JobPosting | null>(null);

  // Compute live vector matches
  const rankedJobs: CandidateJobMatch[] = rankJobsForCandidate(candidate, jobs);

  const handleApply = (jobId: string, jobTitle: string) => {
    onApplyJob(jobId);
    setAppliedNotification(`Application sent for "${jobTitle}" with your verified skill passport.`);
    setTimeout(() => setAppliedNotification(null), 3500);
  };

  const filteredTests = tests.filter((t) => {
    if (categoryFilter === 'all') return true;
    return t.category.toLowerCase().includes(categoryFilter.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Toast Notification */}
      {appliedNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="text-xs font-medium">{appliedNotification}</div>
        </div>
      )}

      {/* Hero: Candidate Profile & Verification Passport Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
              <img
                src={candidate.avatarUrl}
                alt={candidate.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{candidate.name}</h1>
                <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md font-mono font-medium shadow-2xs">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Verified Gold Master</span>
                </div>
              </div>
              <p className="text-xs text-slate-700 font-medium">{candidate.title}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {candidate.location}
                </span>
                <span aria-hidden="true">&middot;</span>
                <span>{candidate.yearsExperience} yrs experience</span>
                <span aria-hidden="true">&middot;</span>
                <span className="text-indigo-600 font-semibold">{candidate.workPreference}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSection('assessments')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Take New Assessment</span>
            </button>
            <button
              onClick={onViewLeaderboard}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              <span>Global Ranks</span>
            </button>
          </div>
        </div>

        {/* Dynamic Verified Skill Badges Showcase in Hero */}
        <div className="pt-4 border-t border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Earned Verified Skill Badges</span>
            </span>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono font-medium">
              <span className="text-amber-700">95+ Gold Master</span>
              <span aria-hidden="true">&middot;</span>
              <span className="text-indigo-700">88–94 Silver</span>
              <span aria-hidden="true">&middot;</span>
              <span className="text-slate-700">75–87 Bronze</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {candidate.verifiedSkills.map((skill) => (
              <VerifiedSkillBadge
                key={skill.skillId}
                skill={skill}
                variant="compact"
              />
            ))}
          </div>
        </div>

        {/* Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
          <div>
            <div className="text-xs text-slate-500 font-medium">Verified Skills</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {candidate.verifiedSkills.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Top Benchmark</div>
            <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
              {Math.max(...candidate.verifiedSkills.map((s) => s.score), 0)}
              <span className="text-xs font-normal text-slate-400">/100 (Gold)</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Global Percentile</div>
            <div className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
              {Math.max(...candidate.verifiedSkills.map((s) => s.percentile), 0)}th
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Best Match Fit</div>
            <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums">
              {rankedJobs[0]?.overallFitPercentage || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Section Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl w-fit shadow-xs">
        <button
          onClick={() => setActiveSection('passport')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeSection === 'passport'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Verified Skill Passport
        </button>
        <button
          onClick={() => setActiveSection('matches')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSection === 'matches'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>Matched Jobs</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
              activeSection === 'matches'
                ? 'bg-indigo-700 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {rankedJobs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSection('assessments')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSection === 'assessments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>Assessment Library</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
              activeSection === 'assessments'
                ? 'bg-indigo-700 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tests.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: VERIFIED SKILL PASSPORT */}
      {activeSection === 'passport' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Verified Skill Credentials & Badges</h2>
              <p className="text-xs text-slate-500">
                Objective scores audited in live sandboxes with dynamic threshold color coding. Click any badge to view cryptographic proof.
              </p>
            </div>

            {/* Threshold Guide Badge Ribbon */}
            <div className="flex items-center gap-2 text-xs font-mono p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="px-2 py-1 text-amber-700 font-bold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>95+ Gold</span>
              </span>
              <span className="text-slate-300">&middot;</span>
              <span className="px-2 py-1 text-indigo-700 font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>88–94 Silver</span>
              </span>
              <span className="text-slate-300">&middot;</span>
              <span className="px-2 py-1 text-slate-700 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>75–87 Bronze</span>
              </span>
            </div>
          </div>

          {/* High-Scoring Showcase Banner (Highlights 95+ Gold Master credentials) */}
          {candidate.verifiedSkills.some((s) => s.score >= 95) && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Featured High-Scoring Assessment (Top 1% Global Standing)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.verifiedSkills
                  .filter((s) => s.score >= 95)
                  .map((skill) => (
                    <VerifiedSkillBadge
                      key={`showcase-${skill.skillId}`}
                      skill={skill}
                      variant="showcase"
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Grid of All Verified Skill Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {candidate.verifiedSkills.map((skill) => (
              <VerifiedSkillBadge
                key={skill.skillId}
                skill={skill}
                variant="card"
              />
            ))}

            {/* Prompt to take more assessments */}
            <div className="border border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3 bg-white shadow-2xs">
              <Award className="w-8 h-8 text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Unlock Distributed Systems</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Score 95+ to earn the Gold Master badge and unlock top-tier engineering requisitions.
                </p>
              </div>
              <button
                onClick={() => {
                  const sysTest = tests.find((t) => t.category === 'System Architecture');
                  if (sysTest) onStartTest(sysTest);
                  else setActiveSection('assessments');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
              >
                Start Architecture Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MATCHED JOBS FEED */}
      {activeSection === 'matches' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Algorithmic Job Match Feed</h2>
              <p className="text-xs text-slate-500">
                Ranked dynamically by vector fit with your verified skill scores. Zero resume screening required.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {rankedJobs.map((match) => {
              const job = jobs.find((j) => j.id === match.jobId)!;
              const isExpanded = expandedJobId === match.jobId;
              const isApplied = candidate.appliedJobIds?.includes(match.jobId);

              return (
                <div
                  key={match.jobId}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 transition-colors shadow-xs"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Company & Role Details */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                          <img
                            src={job.companyLogo}
                            alt={match.companyName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">{match.companyName}</span>
                            <span aria-hidden="true">&middot;</span>
                            <span className="text-xs text-slate-500">{job.department}</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">{match.jobTitle}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {job.location} ({job.workType})
                            </span>
                            <span aria-hidden="true">&middot;</span>
                            <span className="flex items-center gap-1 font-mono text-slate-700 font-medium">
                              <DollarSign className="w-3 h-3 text-indigo-600" />
                              {job.salaryRange}
                            </span>
                            <span aria-hidden="true">&middot;</span>
                            <span>{job.applicantCount} applicants</span>
                          </div>
                        </div>
                      </div>

                      {/* Match Fit Score & Apply CTA */}
                      <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-200">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-500 font-medium">Vector Fit</div>
                          <div
                            className={`text-2xl font-extrabold font-mono tabular-nums ${
                              match.overallFitPercentage >= 85
                                ? 'text-indigo-600'
                                : match.overallFitPercentage >= 70
                                ? 'text-violet-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {match.overallFitPercentage}%
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">{match.matchTier}</div>
                        </div>

                        {isApplied ? (
                          <div className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Applied with Passport</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedJobForApplication(job)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {match.attachedTestStatus === 'qualified' ? 'Review & Apply' : 'Apply (Assessment Attached)'}
                            </span>
                          </button>
                        )}

                        <button
                          onClick={() => setExpandedJobId(isExpanded ? null : match.jobId)}
                          className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Toggle skill requirements breakdown"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Skill Breakdown Quick Row */}
                    <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
                      <span className="text-[11px] text-slate-500 font-medium">Skill Alignment:</span>
                      {match.breakdown.map((b) => (
                        <div
                          key={b.skillName}
                          className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                            b.meetsThreshold
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-amber-50/60 border-amber-200 text-amber-900'
                          }`}
                        >
                          <span className="font-semibold text-slate-900">{b.skillName}</span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {b.candidateScore > 0 ? b.candidateScore : 'Not taken'} / {b.requiredMinScore} min
                          </span>
                          {b.meetsThreshold ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <span className="text-[10px] text-amber-700 font-mono font-semibold">Deficit</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pillar 2: Attached Assessment for this Job Post */}
                    {job.attachedTestId && (
                      <div className="mt-3.5 p-3 bg-indigo-50/40 border border-indigo-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900">Attached Assessment:</span>{' '}
                            <span className="text-indigo-900 font-semibold">{job.attachedTestTitle || 'Technical Test'}</span>
                            <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                              (Required Bar: &ge;{job.attachedTestPassingScore || 75} pts)
                            </span>
                          </div>
                        </div>

                        <div>
                          {match.attachedTestStatus === 'qualified' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Verified: {match.attachedTestScore}/100 (Qualified)</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => setSelectedJobForApplication(job)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Take Attached Test to Apply</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Breakdown & Job Description */}
                  {isExpanded && (
                    <div className="p-6 bg-slate-50/80 border-t border-slate-200 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 mb-1">Role Description</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{job.description}</p>
                      </div>

                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-bold text-slate-900">Automated Vector Scoring Analysis</h4>
                        <div className="space-y-2">
                          {match.breakdown.map((b) => (
                            <div
                              key={b.skillName}
                              className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900">{b.skillName}</span>
                                  <span className="text-[10px] uppercase font-mono font-semibold text-slate-500">
                                    {b.importance}
                                  </span>
                                </div>
                                <div className="font-mono text-xs tabular-nums">
                                  Your Score: <strong className={b.meetsThreshold ? 'text-indigo-600' : 'text-amber-700'}>{b.candidateScore}</strong> / Required: <strong>{b.requiredMinScore}</strong>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${b.meetsThreshold ? 'bg-indigo-600' : 'bg-amber-500'}`}
                                  style={{ width: `${Math.min(100, (b.candidateScore / (b.requiredMinScore || 1)) * 100)}%` }}
                                />
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {b.candidateScore === 0 ? (
                                  <span>
                                    You have not taken this assessment yet. Taking it could increase your fit score significantly.
                                  </span>
                                ) : b.meetsThreshold ? (
                                  <span>
                                    Exceeds minimum recruiter score requirement by {b.candidateScore - b.requiredMinScore} points. Full weighting awarded.
                                  </span>
                                ) : (
                                  <span className="text-amber-700">
                                    Below threshold by {b.requiredMinScore - b.candidateScore} points. Retake assessment to qualify.
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: ASSESSMENT CATALOG */}
      {activeSection === 'assessments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Standard Interactive Assessments</h2>
              <p className="text-xs text-slate-500">
                Standardized, practical challenges executed in live sandbox runtimes. Free for candidates.
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
              {['all', 'Databases', 'Algorithms', 'System Architecture', 'Frontend'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    categoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? 'All Domains' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTests.map((t) => {
              const userSkill = candidate.verifiedSkills.find((s) => s.testId === t.id);

              return (
                <div
                  key={t.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-indigo-300 transition-colors space-y-5 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 font-bold">
                        {t.category}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{t.difficulty}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {t.skillsTested.map((st) => (
                        <span
                          key={st}
                          className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 font-mono"
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>~{t.estimatedMinutes} mins &middot; {t.totalQuestions} tasks</span>
                      <span className="tabular-nums">{t.testTakersCount.toLocaleString()} engineers evaluated</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {userSkill ? (
                        <div className="text-xs">
                          <span className="text-slate-500">Current Score: </span>
                          <strong className="text-indigo-600 font-mono text-sm">{userSkill.score}/100</strong>
                          <span className="text-slate-500 text-[11px]"> ({userSkill.percentile}th %ile)</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          Passing mark: <strong className="text-slate-800 font-mono">{t.passingScore}/100</strong>
                        </div>
                      )}

                      <button
                        onClick={() => onStartTest(t)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{userSkill ? 'Retake to Climb' : 'Start Assessment'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pillar 2 & 3: Job Application Modal with Attached Assessment */}
      {selectedJobForApplication && (
        <JobApplicationModal
          isOpen={!!selectedJobForApplication}
          onClose={() => setSelectedJobForApplication(null)}
          candidate={candidate}
          job={selectedJobForApplication}
          tests={tests}
          overallFitPercentage={
            rankedJobs.find((m) => m.jobId === selectedJobForApplication.id)?.overallFitPercentage || 80
          }
          onConfirmApply={(jobId, score) => {
            handleApply(jobId, selectedJobForApplication.title);
          }}
          onStartAttachedTest={(test, forJobId) => {
            if (onStartAttachedTest) {
              onStartAttachedTest(test, forJobId);
            } else {
              onStartTest(test);
            }
          }}
        />
      )}
    </div>
  );
};
