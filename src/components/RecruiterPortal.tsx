import React, { useState } from 'react';
import { User, JobPosting, AssessmentTest, CandidateJobMatch, Business } from '../types';
import { rankCandidatesForJob } from '../lib/matchingAlgorithm';
import { getTestStats } from '../lib/leaderboard';
import {
  Users,
  Plus,
  CheckCircle2,
  ChevronRight,
  Check,
  Award
} from 'lucide-react';

export type BusinessSection = 'jobs' | 'tests' | 'candidates';

interface RecruiterPortalProps {
  section: BusinessSection;
  onNavigate: (section: BusinessSection) => void;
  onOpenTest: (testId: string) => void;
  recruiter: User;
  business: Business;
  jobs: JobPosting[];
  allCandidates: User[];
  tests: AssessmentTest[];
  onCreateJob: (newJob: JobPosting) => void;
  onUpdateJobRequirements: (jobId: string, requirements: JobPosting['requirements']) => void;
  onCreateCustomAssessment: (newTest: AssessmentTest) => void;
}

export const RecruiterPortal: React.FC<RecruiterPortalProps> = ({
  section,
  onNavigate,
  onOpenTest,
  recruiter,
  business,
  jobs: allJobs,
  allCandidates,
  tests,
  onCreateJob,
  onUpdateJobRequirements,
  onCreateCustomAssessment,
}) => {
  // A business only manages its own jobs and its own tests
  const jobs = allJobs.filter((j) => j.businessId === business.id);
  const companyTests = tests.filter((t) => t.type === 'custom' && t.businessId === business.id);
  const vetterTests = tests.filter((t) => t.type === 'standard');
  const attachableTests = [...companyTests, ...vetterTests];

  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [filterMeetsHardOnly, setFilterMeetsHardOnly] = useState(false);
  const [filterAppliedOnly, setFilterAppliedOnly] = useState(false);

  // Job creation modal state
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDept, setNewJobDept] = useState('Core Engineering');
  const [newJobLocation, setNewJobLocation] = useState('Remote');
  const [newJobWorkType, setNewJobWorkType] = useState<'Remote' | 'Hybrid' | 'On-site'>('Remote');
  const [newJobSalary, setNewJobSalary] = useState('$170,000 - $210,000');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSkills, setNewJobSkills] = useState([
    { skillId: 'skill-sys', skillName: 'System Architecture', minScore: 80, importance: 'required' as const, weight: 0.5 },
    { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 75, importance: 'required' as const, weight: 0.3 },
    { skillId: 'skill-sql', skillName: 'SQL & Databases', minScore: 70, importance: 'preferred' as const, weight: 0.2 },
  ]);
  const [newJobAttachedTestId, setNewJobAttachedTestId] = useState<string>(attachableTests[0]?.id || '');
  const [newJobAttachedPassingScore, setNewJobAttachedPassingScore] = useState<number>(80);
  const [newJobRequireTest, setNewJobRequireTest] = useState<boolean>(true);

  // Custom Assessment Builder state
  const [customTestTitle, setCustomTestTitle] = useState('');
  const [customTestCategory, setCustomTestCategory] = useState<'System Architecture' | 'Databases' | 'Frontend' | 'Backend APIs'>('System Architecture');
  const [customTestDesc, setCustomTestDesc] = useState('');
  const [customQuestions, setCustomQuestions] = useState([
    {
      id: 'cq-1',
      title: 'High-Throughput Idempotency Verifier',
      type: 'code' as const,
      prompt: 'Write a deduplication check that rejects duplicate message UUIDs within a 5-second sliding window.',
      starterCode: 'function solution(messages, windowMs) {\n  // Implementation here\n  return [];\n}',
      testCases: [
        { id: 'ctc-1', description: 'Filters duplicate message within window', input: '[[{"id":"m1","t":100},{"id":"m1","t":200}], 5000]', expectedOutput: '["m1"]' },
      ],
      timeLimitMinutes: 15,
      weight: 100,
    },
  ]);
  const [builderSuccessMessage, setBuilderSuccessMessage] = useState<string | null>(null);

  // Candidate pipeline status tracking
  const [candidateStatuses, setCandidateStatuses] = useState<Record<string, string>>({
    'cand-001': 'interview',
    'cand-002': 'offer',
  });

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  // Calculate live ranking
  const rankedCandidates: CandidateJobMatch[] = selectedJob
    ? rankCandidatesForJob(allCandidates, selectedJob)
    : [];

  const filteredCandidates = rankedCandidates.filter((c) => {
    if (filterMeetsHardOnly && !c.meetsAllHardRequirements) return false;
    if (filterAppliedOnly && !allCandidates.find((cand) => cand.id === c.candidateId)?.appliedJobIds?.includes(selectedJob.id)) {
      return false;
    }
    return true;
  });

  const handleRequirementChange = (skillIndex: number, newMinScore: number) => {
    if (!selectedJob) return;
    const updated = [...selectedJob.requirements];
    updated[skillIndex] = { ...updated[skillIndex], minScore: newMinScore };
    onUpdateJobRequirements(selectedJob.id, updated);
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) return;

    const attachedTest = attachableTests.find((t) => t.id === newJobAttachedTestId);

    const newJob: JobPosting = {
      id: `job-${Date.now()}`,
      title: newJobTitle,
      companyName: business.name,
      companyLogo: business.logo,
      businessId: business.id,
      location: newJobLocation,
      workType: newJobWorkType,
      salaryRange: newJobSalary,
      description: newJobDesc || `We are hiring a ${newJobTitle} to join ${business.name}.`,
      department: newJobDept,
      postedDate: new Date().toISOString().split('T')[0],
      requirements: newJobSkills,
      attachedTestId: attachedTest?.id,
      attachedTestTitle: attachedTest?.title,
      attachedTestPassingScore: attachedTest ? newJobAttachedPassingScore : undefined,
      isAttachedTestMandatory: attachedTest ? newJobRequireTest : undefined,
      applicantCount: 0,
      status: 'active',
    };

    onCreateJob(newJob);
    setSelectedJobId(newJob.id);
    setIsCreatingJob(false);
    setNewJobTitle('');
    setNewJobDesc('');
    onNavigate('jobs');
  };

  const handleSaveCustomAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTestTitle.trim()) return;

    const newAssessment: AssessmentTest = {
      id: `test-custom-${Date.now()}`,
      title: customTestTitle,
      category: customTestCategory,
      difficulty: 'Staff Specialist',
      type: 'custom',
      businessId: business.id,
      companyName: business.name,
      description: customTestDesc || `Test written by ${business.name} for its own hiring.`,
      estimatedMinutes: 25,
      passingScore: 80,
      totalQuestions: customQuestions.length,
      // Copy the draft so later edits in the builder don't change the saved test
      questions: customQuestions.map((q) => ({ ...q, testCases: q.testCases.map((tc) => ({ ...tc })) })),
      skillsTested: [customTestCategory, 'High Concurrency', 'Production Readiness'],
    };

    onCreateCustomAssessment(newAssessment);
    setBuilderSuccessMessage(`"${customTestTitle}" saved. You can now attach it to any of your jobs.`);
    setTimeout(() => setBuilderSuccessMessage(null), 4000);
    setCustomTestTitle('');
    setCustomTestDesc('');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Company Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
              <img
                src={business.logo}
                alt={business.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{business.name}</h1>
              <p className="text-xs text-slate-700 font-medium">
                {recruiter.name} &middot; {recruiter.title}
              </p>
              <p className="text-xs text-slate-500">
                {business.industry} &middot; {business.headquarters}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreatingJob(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post a Job</span>
            </button>
            <button
              onClick={() => onNavigate('tests')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              <span>Create a Test</span>
            </button>
          </div>
        </div>

        {/* Company Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-200">
          <div>
            <div className="text-xs text-slate-500 font-medium">Open Jobs</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {jobs.filter((j) => j.status === 'active').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Applicants</div>
            <div className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
              {jobs.reduce((acc, j) => acc + j.applicantCount, 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Your Tests</div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">{companyTests.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Candidates on Vetter</div>
            <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums">{allCandidates.length}</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: JOBS */}
      {section === 'jobs' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Jobs</h2>
            <p className="text-xs text-slate-500">
              Set the minimum skill scores for each job. Candidates are ranked against them automatically.
            </p>
          </div>

          {jobs.length === 0 && (
            <p className="text-xs text-slate-500">You haven't posted any jobs yet.</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Jobs list */}
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-colors shadow-2xs ${
                    selectedJobId === job.id
                      ? 'bg-indigo-50/70 border-indigo-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-700 font-semibold">
                        {job.department}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{job.title}</h3>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-700 font-semibold">{job.applicantCount} applicants</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{job.workType}</span>
                    <span className="font-mono text-slate-800 font-medium">{job.salaryRange}</span>
                  </div>

                  {job.attachedTestId && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-700 font-mono">
                      <span className="truncate flex items-center gap-1">
                        <Award className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>Attached: {job.attachedTestTitle}</span>
                      </span>
                      <span className="shrink-0 ml-1 font-semibold">&ge;{job.attachedTestPassingScore || 75} pts</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right: Selected Job Threshold Editor */}
            {selectedJob && (
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{selectedJob.title}</h3>
                      {selectedJob.attachedTestId && (
                        <span className="text-[10px] font-mono uppercase bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-semibold">
                          Test Attached
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{selectedJob.description}</p>
                  </div>
                  <button
                    onClick={() => onNavigate('candidates')}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                  >
                    <span>View Ranked Candidates</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Attached Assessment Card for this Requisition */}
                {selectedJob.attachedTestId && (
                  <div className="p-3.5 bg-indigo-50/40 border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">Attached test:</span>{' '}
                        <span className="text-indigo-900 font-semibold">{selectedJob.attachedTestTitle}</span>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {companyTests.some((t) => t.id === selectedJob.attachedTestId) ? 'Your test' : 'Vetter test'} &middot; Pass mark {selectedJob.attachedTestPassingScore || 75} &middot; {selectedJob.isAttachedTestMandatory ? 'Required to apply' : 'Optional'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Minimum Skill Scores
                    </h4>
                    <span className="text-[11px] text-slate-500">Drag to change how candidates are ranked</span>
                  </div>

                  <div className="space-y-4">
                    {selectedJob.requirements.map((req, idx) => (
                      <div
                        key={req.skillName}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{req.skillName}</span>
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${
                                req.importance === 'required'
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : 'bg-slate-200/60 border-slate-300 text-slate-700'
                              }`}
                            >
                              {req.importance} (Weight: {Math.round(req.weight * 100)}%)
                            </span>
                          </div>
                          <div className="text-xs font-mono tabular-nums text-indigo-700 font-semibold">
                            Min Score: <strong className="text-slate-900 text-sm">{req.minScore}</strong>/100
                          </div>
                        </div>

                        {/* Interactive Threshold Slider */}
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500 font-mono">50</span>
                          <input
                            type="range"
                            min="50"
                            max="98"
                            value={req.minScore}
                            onChange={(e) => handleRequirementChange(idx, Number(e.target.value))}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[11px] text-slate-500 font-mono">100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: CANDIDATES */}
      {section === 'candidates' && !selectedJob && (
        <p className="text-xs text-slate-500">Post a job to start seeing ranked candidates.</p>
      )}
      {section === 'candidates' && selectedJob && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">Candidates</h2>
              <select
                value={selectedJob.id}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold shadow-2xs max-w-full"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Ranked by how well their verified skills fit this job.</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={filterMeetsHardOnly}
                  onChange={(e) => setFilterMeetsHardOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Meets all required scores</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={filterAppliedOnly}
                  onChange={(e) => setFilterAppliedOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Applied to this job</span>
              </label>
            </div>
          </div>

          {/* Candidate Match Table / Cards */}
          <div className="space-y-3">
            {filteredCandidates.length === 0 && (
              <p className="text-xs text-slate-500">No candidates match these filters.</p>
            )}
            {filteredCandidates.map((c) => {
              const hasApplied = allCandidates.find((cand) => cand.id === c.candidateId)?.appliedJobIds?.includes(selectedJob.id);
              const currentStatus = candidateStatuses[c.candidateId] || 'review';

              return (
                <div
                  key={c.candidateId}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-colors shadow-xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Candidate Identity */}
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
                        <img
                          src={c.candidateAvatar}
                          alt={c.candidateName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{c.candidateName}</h3>
                          <span className="text-xs text-slate-400">&middot;</span>
                          <span className="text-xs text-slate-500">{c.yearsExperience} yrs exp</span>
                          <span className="text-xs text-slate-400">&middot;</span>
                          <span className="text-xs text-indigo-700 font-semibold">{c.candidateLocation}</span>
                          {hasApplied && (
                            <span className="text-[10px] font-mono uppercase font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              Applied
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{c.candidateTitle}</p>
                      </div>
                    </div>

                    {/* Vector Fit Badge & Score Breakdown */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.breakdown.map((b) => (
                          <div
                            key={b.skillName}
                            className={`px-2.5 py-1 rounded text-xs border font-mono ${
                              b.meetsThreshold
                                ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900'
                                : 'bg-amber-50/60 border-amber-200 text-amber-900'
                            }`}
                          >
                            <span>{b.skillName}: </span>
                            <strong className="font-bold">{b.candidateScore}</strong>
                            <span className="text-slate-500 text-[10px]">/{b.requiredMinScore}</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-right min-w-[70px]">
                        <div
                          className={`text-2xl font-extrabold font-mono tabular-nums ${
                            c.overallFitPercentage >= 85
                              ? 'text-indigo-600'
                              : c.overallFitPercentage >= 75
                              ? 'text-violet-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {c.overallFitPercentage}%
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">{c.matchTier}</div>
                      </div>

                      {/* Pipeline Stage Select */}
                      <div className="flex items-center gap-2">
                        <select
                          value={currentStatus}
                          onChange={(e) =>
                            setCandidateStatuses((prev) => ({
                              ...prev,
                              [c.candidateId]: e.target.value,
                            }))
                          }
                          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 text-slate-800 font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="review">Screening</option>
                          <option value="interview">Interviewing</option>
                          <option value="offer">Offer Extended</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Attached test result */}
                  {selectedJob.attachedTestId && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Award className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Attached test ({selectedJob.attachedTestTitle}):</span>
                      </div>
                      <div>
                        {c.attachedTestStatus === 'qualified' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Passed: {c.attachedTestScore}/100</span>
                          </span>
                        ) : c.attachedTestStatus === 'test_taken_failed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span>Below pass mark: {c.attachedTestScore}/100</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200">
                            <span>Not taken</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: TESTS */}
      {section === 'tests' && (
        <div className="space-y-8">
          {/* The company's own tests */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Tests</h2>
              <p className="text-xs text-slate-500">
                Tests written by {business.name}. Only you can attach them to jobs.
              </p>
            </div>
            {companyTests.length === 0 ? (
              <p className="text-xs text-slate-500">You haven't created any tests yet. Use the form below.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyTests.map((t) => (
                  <TestSummaryCard
                    key={t.id}
                    test={t}
                    usedBy={jobs.filter((j) => j.attachedTestId === t.id)}
                    ranked={getTestStats(t, allCandidates).candidatesRanked}
                    onOpen={() => onOpenTest(t.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Vetter's library */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Vetter Test Library</h2>
              <p className="text-xs text-slate-500">
                Standard tests made by Vetter. Candidates' scores on these appear as verified skills.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vetterTests.map((t) => (
                <TestSummaryCard
                  key={t.id}
                  test={t}
                  usedBy={jobs.filter((j) => j.attachedTestId === t.id)}
                  ranked={getTestStats(t, allCandidates).candidatesRanked}
                  onOpen={() => onOpenTest(t.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">Create a Test</h2>
            <p className="text-xs text-slate-500">
              Write a coding challenge based on your own stack and attach it to any of your jobs.
            </p>
          </div>

          {builderSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-3 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{builderSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveCustomAssessment} className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Test Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Lock & Raft Log Compactor"
                    value={customTestTitle}
                    onChange={(e) => setCustomTestTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skill Category</label>
                  <select
                    value={customTestCategory}
                    onChange={(e) => setCustomTestCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 font-medium"
                  >
                    <option value="System Architecture">System Architecture</option>
                    <option value="Databases">Databases & SQL</option>
                    <option value="Backend APIs">Backend APIs & Networking</option>
                    <option value="Frontend">Frontend Engineering</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Test Description & Context</label>
                <textarea
                  rows={2}
                  placeholder="Explain the real-world scenario candidates will be solving..."
                  value={customTestDesc}
                  onChange={(e) => setCustomTestDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Modular Question Authoring */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Challenge</h3>
                <span className="text-xs text-slate-500 font-mono">1 Question in Challenge</span>
              </div>

              {customQuestions.map((cq, idx) => (
                <div key={cq.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Challenge Prompt</label>
                      <input
                        type="text"
                        value={cq.title}
                        onChange={(e) => {
                          const updated = [...customQuestions];
                          updated[idx].title = e.target.value;
                          setCustomQuestions(updated);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Time Limit (mins)</label>
                      <input
                        type="number"
                        value={cq.timeLimitMinutes}
                        onChange={(e) => {
                          const updated = [...customQuestions];
                          updated[idx].timeLimitMinutes = Number(e.target.value);
                          setCustomQuestions(updated);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Starter Code Template</label>
                    <textarea
                      rows={3}
                      value={cq.starterCode}
                      onChange={(e) => {
                        const updated = [...customQuestions];
                        updated[idx].starterCode = e.target.value;
                        setCustomQuestions(updated);
                      }}
                      className="w-full p-3 font-mono text-xs bg-slate-900 border border-slate-800 rounded-lg text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assertion Test Case</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Input: JSON arguments"
                        value={cq.testCases[0]?.input}
                        onChange={(e) => {
                          const updated = [...customQuestions];
                          updated[idx].testCases[0].input = e.target.value;
                          setCustomQuestions(updated);
                        }}
                        className="p-2 font-mono text-xs bg-white border border-slate-300 rounded text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="Expected Output JSON"
                        value={cq.testCases[0]?.expectedOutput}
                        onChange={(e) => {
                          const updated = [...customQuestions];
                          updated[idx].testCases[0].expectedOutput = e.target.value;
                          setCustomQuestions(updated);
                        }}
                        className="p-2 font-mono text-xs bg-white border border-slate-300 rounded text-indigo-700 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save Test</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE JOB MODAL */}
      {isCreatingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Post a Job at {business.name}</h3>
              <button
                onClick={() => setIsCreatingJob(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Database Platform Architect"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newJobDept}
                    onChange={(e) => setNewJobDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Type</label>
                  <select
                    value={newJobWorkType}
                    onChange={(e) => setNewJobWorkType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 font-medium"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Range</label>
                <input
                  type="text"
                  value={newJobSalary}
                  onChange={(e) => setNewJobSalary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Summary</label>
                <textarea
                  rows={3}
                  placeholder="Key responsibilities and engineering scale..."
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Attach a test to this job */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <span>Attach a Test</span>
                  </span>
                  <label className={`flex items-center gap-1.5 text-xs text-indigo-800 font-medium cursor-pointer ${newJobAttachedTestId ? '' : 'opacity-40 pointer-events-none'}`}>
                    <input
                      type="checkbox"
                      checked={newJobRequireTest}
                      onChange={(e) => setNewJobRequireTest(e.target.checked)}
                      className="rounded text-indigo-600 accent-indigo-600"
                    />
                    <span>Required to apply</span>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Test</label>
                    <select
                      value={newJobAttachedTestId}
                      onChange={(e) => setNewJobAttachedTestId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium"
                    >
                      <option value="">No test</option>
                      {companyTests.length > 0 && (
                        <optgroup label="Your tests">
                          {companyTests.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Vetter tests">
                        {vetterTests.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({t.category})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pass mark</label>
                    <input
                      type="number"
                      disabled={!newJobAttachedTestId}
                      min={60}
                      max={100}
                      value={newJobAttachedPassingScore}
                      onChange={(e) => setNewJobAttachedPassingScore(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Post Job</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TestSummaryCard: React.FC<{ test: AssessmentTest; usedBy: JobPosting[]; ranked: number; onOpen: () => void }> = ({
  test,
  usedBy,
  ranked,
  onOpen,
}) => (
  <div
    onClick={onOpen}
    className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs cursor-pointer hover:border-indigo-300 transition-colors"
  >
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 font-bold">{test.category}</span>
      <span className="text-xs text-slate-500 font-medium">{test.difficulty}</span>
    </div>
    <h3 className="text-sm font-bold text-slate-900">{test.title}</h3>
    <p className="text-xs text-slate-600 leading-relaxed">{test.description}</p>
    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
      <span>
        ~{test.estimatedMinutes} mins &middot; {test.totalQuestions} {test.totalQuestions === 1 ? 'task' : 'tasks'} &middot; pass {test.passingScore}
      </span>
      <span>
        {ranked} ranked &middot; {usedBy.length > 0 ? `on ${usedBy.length} of your jobs` : 'not on your jobs'}
      </span>
    </div>
  </div>
);
