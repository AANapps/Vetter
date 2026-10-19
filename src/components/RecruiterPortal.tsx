import React, { useState } from 'react';
import { User, JobPosting, AssessmentTest, CandidateJobMatch } from '../types';
import { rankCandidatesForJob } from '../lib/matchingAlgorithm';
import {
  Briefcase,
  Users,
  Plus,
  Sliders,
  Filter,
  CheckCircle2,
  AlertCircle,
  Code,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  Building,
  DollarSign,
  Clock,
  Layers,
  Crown,
  Award
} from 'lucide-react';

interface RecruiterPortalProps {
  recruiter: User;
  jobs: JobPosting[];
  allCandidates: User[];
  tests: AssessmentTest[];
  onCreateJob: (newJob: JobPosting) => void;
  onUpdateJobRequirements: (jobId: string, requirements: JobPosting['requirements']) => void;
  onCreateCustomAssessment: (newTest: AssessmentTest) => void;
  onOpenPricingModal: () => void;
}

export const RecruiterPortal: React.FC<RecruiterPortalProps> = ({
  recruiter,
  jobs,
  allCandidates,
  tests,
  onCreateJob,
  onUpdateJobRequirements,
  onCreateCustomAssessment,
  onOpenPricingModal,
}) => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'pipeline' | 'custom_builder'>('jobs');
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
  const [newJobAttachedTestId, setNewJobAttachedTestId] = useState<string>(tests[0]?.id || 'test-sql-01');
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

    const attachedTest = tests.find((t) => t.id === newJobAttachedTestId);

    const newJob: JobPosting = {
      id: `job-${Date.now()}`,
      title: newJobTitle,
      companyName: recruiter.company || 'PrismaScale AI',
      companyLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
      location: newJobLocation,
      workType: newJobWorkType,
      salaryRange: newJobSalary,
      tier: 'tier_2_custom',
      description: newJobDesc || `We are seeking an outstanding ${newJobTitle} to scale our high-throughput distributed infrastructure.`,
      department: newJobDept,
      postedDate: new Date().toISOString().split('T')[0],
      requirements: newJobSkills,
      attachedTestId: newJobAttachedTestId,
      attachedTestTitle: attachedTest?.title,
      attachedTestPassingScore: newJobAttachedPassingScore,
      isAttachedTestMandatory: newJobRequireTest,
      applicantCount: 0,
      status: 'active',
    };

    onCreateJob(newJob);
    setSelectedJobId(newJob.id);
    setIsCreatingJob(false);
    setActiveTab('pipeline');
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
      companyId: recruiter.id,
      companyName: recruiter.company,
      description: customTestDesc || 'Custom assessment tailored for PrismaScale AI technical hiring bar.',
      estimatedMinutes: 25,
      passingScore: 80,
      totalQuestions: customQuestions.length,
      questions: customQuestions,
      skillsTested: [customTestCategory, 'High Concurrency', 'Production Readiness'],
      testTakersCount: 0,
      avgScore: 0,
    };

    onCreateCustomAssessment(newAssessment);
    setBuilderSuccessMessage(`Custom Assessment "${customTestTitle}" successfully deployed and attached to job requisition!`);
    setTimeout(() => setBuilderSuccessMessage(null), 4000);
    setCustomTestTitle('');
    setCustomTestDesc('');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Recruiter Workspace Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
              <img
                src={recruiter.avatarUrl}
                alt={recruiter.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{recruiter.company}</h1>
                <div className="flex items-center gap-1 text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md font-mono font-semibold shadow-2xs">
                  <Crown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tier 2: Custom Assessments Active</span>
                </div>
              </div>
              <p className="text-xs text-slate-700 font-medium">
                {recruiter.name} &middot; {recruiter.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{jobs.length} Active Listings</span>
                <span aria-hidden="true">&middot;</span>
                <span>{allCandidates.length} Vetted Talent in Index</span>
                <span aria-hidden="true">&middot;</span>
                <span className="text-indigo-600 font-medium">Automated Vector Fit Scoring</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreatingJob(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post New Role</span>
            </button>
            <button
              onClick={onOpenPricingModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Crown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Manage Tier Plans</span>
            </button>
          </div>
        </div>

        {/* Recruiter Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-200">
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Applicants</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {jobs.reduce((acc, j) => acc + j.applicantCount, 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Average Match Fit</div>
            <div className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">84.2%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Custom Assessments</div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">2 Active</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Time-to-Hire Reduction</div>
            <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums">-64%</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl w-fit shadow-xs">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'jobs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Active Listings & Thresholds</span>
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'pipeline'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Candidate Match Pipeline</span>
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
              activeTab === 'pipeline'
                ? 'bg-indigo-700 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {allCandidates.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('custom_builder')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'custom_builder'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Custom Assessment Builder (Tier 2)</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE JOBS & THRESHOLDS */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Requisition Threshold Governance</h2>
              <p className="text-xs text-slate-500">
                Adjust required minimum score thresholds. Candidates are automatically scored and ranked against these vectors.
              </p>
            </div>
          </div>

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
                          Test Attached to Application
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{selectedJob.description}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('pipeline')}
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
                        <span className="font-bold text-slate-900">Attached Application Assessment (Pillar 2):</span>{' '}
                        <span className="text-indigo-900 font-semibold">{selectedJob.attachedTestTitle}</span>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Cutoff Bar: &ge;{selectedJob.attachedTestPassingScore || 75} pts &middot; {selectedJob.isAttachedTestMandatory ? 'Mandatory for application submission' : 'Recommended assessment'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Live Assessment Cutoffs & Weights
                    </h4>
                    <span className="text-[11px] text-slate-500">Drag slider to recalibrate candidate vector rankings</span>
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

      {/* TAB 2: CANDIDATE MATCH PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Vetted Pipeline for {selectedJob?.title || 'Selected Role'}
              </h2>
              <p className="text-xs text-slate-500">
                Sorted strictly by objective assessment fit percentage. Zero resume keyword fluff.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={filterMeetsHardOnly}
                  onChange={(e) => setFilterMeetsHardOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Hard Thresholds Met Only</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={filterAppliedOnly}
                  onChange={(e) => setFilterAppliedOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Direct Inbound Applied</span>
              </label>
            </div>
          </div>

          {/* Candidate Match Table / Cards */}
          <div className="space-y-3">
            {filteredCandidates.map((c) => {
              const fullCandidate = allCandidates.find((cand) => cand.id === c.candidateId)!;
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

                  {/* Attached Test Verification Status (Pillar 2) */}
                  {selectedJob.attachedTestId && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Award className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Attached Test Requirement ({selectedJob.attachedTestTitle}):</span>
                      </div>
                      <div>
                        {c.attachedTestStatus === 'qualified' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Verified Passed: {c.attachedTestScore}/100</span>
                          </span>
                        ) : c.attachedTestStatus === 'test_taken_failed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span>Score Below Cutoff: {c.attachedTestScore}/100</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200">
                            <span>Assessment Incomplete</span>
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

      {/* TAB 3: CUSTOM ASSESSMENT BUILDER (TIER 2) */}
      {activeTab === 'custom_builder' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Tier 2 Custom Assessment Suite</h2>
                <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-bold shadow-2xs">
                  Included in PrismaScale Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Author custom coding challenges, SQL queries, or architectural scenarios tailored to your company's proprietary tech stack.
              </p>
            </div>
          </div>

          {builderSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-3 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{builderSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveCustomAssessment} className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Assessment Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Title</label>
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
                <h3 className="text-sm font-bold text-slate-900">Modular Challenge Configuration</h3>
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
                <span>Save & Deploy Custom Assessment</span>
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
              <h3 className="text-base font-bold text-slate-900">Create New Requisition</h3>
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

              {/* Pillar 2: Attach Test to this Job Post */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Attach Test to this Job Post (Pillar 2)</span>
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-indigo-800 font-medium cursor-pointer">
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
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select Assessment</label>
                    <select
                      value={newJobAttachedTestId}
                      onChange={(e) => setNewJobAttachedTestId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium"
                    >
                      {tests.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pass Bar (pts)</label>
                    <input
                      type="number"
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
                <span>Publish Requisition & Attach Assessment</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
