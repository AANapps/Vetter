import { isMainVersion } from '../lib/testLevels';
import React, { useState } from 'react';
import { User, JobPosting, AssessmentTest, Business } from '../types';
import { getTestStats } from '../lib/leaderboard';
import { JobCandidates } from './JobCandidates';
import { CheckCircle2, Pencil, Plus, Sparkles } from 'lucide-react';
import { TestBuilder } from './TestBuilder';

// Jobs have their own page (BusinessJobs); this is the company's tests and the candidates ranked for each job
export type BusinessSection = 'tests' | 'candidates';

interface RecruiterPortalProps {
  section: BusinessSection;
  onOpenTest: (testId: string) => void;
  recruiter: User;
  // The company being managed; without one, this is the Vetter team managing every company's jobs
  business?: Business;
  businesses: Business[];
  jobs: JobPosting[];
  allCandidates: User[];
  tests: AssessmentTest[];
  onCreateTest: (newTest: AssessmentTest) => void;
  onUpdateTest: (test: AssessmentTest) => void;
  // Vetter's AI writes a test from a description
  onGenerateTest: () => void;
}

// Tests written in the builder have ids like test-custom-<timestamp> or test-vetter-<timestamp>
const isEditable = (t: AssessmentTest) => /^test-(custom|vetter)-\d{10,}$/.test(t.id);

export const RecruiterPortal: React.FC<RecruiterPortalProps> = ({
  section,
  onOpenTest,
  recruiter,
  business,
  businesses,
  jobs: allJobs,
  allCandidates,
  tests,
  onCreateTest,
  onUpdateTest,
  onGenerateTest,
}) => {
  // A business only manages its own jobs and its own tests; the Vetter team sees every company's jobs
  const isVetter = !business;
  const jobs = isVetter ? allJobs : allJobs.filter((j) => j.businessId === business.id);
  const companyTests = isVetter ? [] : tests.filter((t) => t.type === 'custom' && t.businessId === business.id);
  const vetterTests = tests.filter((t) => t.type === 'standard' && isMainVersion(t));

  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  // The test builder, open on a new test or one being edited
  const [building, setBuilding] = useState<{ initial?: AssessmentTest } | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const saveTest = (test: AssessmentTest) => {
    if (building?.initial) onUpdateTest(test);
    else onCreateTest(test);
    setBuilding(null);
    setSavedMessage(
      `"${test.title}" saved. ${isVetter ? 'Every candidate can take it from the Tests page.' : 'Add it to any of your jobs from the job.'}`
    );
    setTimeout(() => setSavedMessage(null), 5000);
  };
  // Tests written here can be edited; seeded ones come from code
  const editFor = (t: AssessmentTest) => (isEditable(t) ? () => setBuilding({ initial: t }) : undefined);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Company Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
              <img
                src={business ? business.logo : recruiter.avatarUrl}
                alt={business ? business.name : 'Vetter'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{business ? business.name : 'Vetter Talent Team'}</h1>
              <p className="text-xs text-slate-700 font-medium">
                {recruiter.name} &middot; {recruiter.title}
              </p>
              <p className="text-xs text-slate-500">
                {business
                  ? `${business.industry} · ${business.headquarters}`
                  : `Posting and filling jobs for ${businesses.length} companies`}
              </p>
            </div>
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
            <div className="text-xs text-slate-500 font-medium">{business ? 'Your Tests' : 'Companies'}</div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
              {business ? companyTests.length : businesses.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Candidates on Vetter</div>
            <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums">{allCandidates.length}</div>
          </div>
        </div>
      </div>

      {/* Candidates */}
      {section === 'candidates' && !selectedJob && (
        <p className="text-xs text-slate-500">Post a job to start seeing ranked candidates.</p>
      )}
      {section === 'candidates' && selectedJob && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">Candidates by Job</h2>
            <select
              value={selectedJob.id}
              onChange={(e) => setSelectedJobId(e.target.value)}
              aria-label="Job"
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold shadow-2xs max-w-full"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {isVetter ? `${j.companyName}: ${j.title}` : j.title}
                </option>
              ))}
            </select>
          </div>
          <JobCandidates key={selectedJob.id} job={selectedJob} allCandidates={allCandidates} />
        </div>
      )}

      {/* Tests */}
      {section === 'tests' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <div>
              <h2 className="text-base font-bold text-slate-900">Write a test</h2>
              <p className="text-xs text-slate-600">
                Mix multiple choice, select-all, short answers, drag to order, drag to match, coding and SQL.{' '}
                {isVetter ? 'Tests you write join the Vetter library for every candidate.' : 'Use it on any of your jobs.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={onGenerateTest}
                className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Write with AI
              </button>
              <button
                onClick={() => setBuilding({})}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Create a test
              </button>
            </div>
          </div>

          {savedMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-3 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{savedMessage}</span>
            </div>
          )}

          {/* The company's own tests */}
          {business && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Tests</h2>
              <p className="text-xs text-slate-500">
                Tests written by {business.name}. Only you can attach them to jobs.
              </p>
            </div>
            {companyTests.length === 0 ? (
              <p className="text-xs text-slate-500">You haven't written any tests yet. Use Create a test above.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyTests.map((t) => (
                  <TestSummaryCard
                    key={t.id}
                    test={t}
                    usedBy={jobs.filter((j) => j.testIds.includes(t.id))}
                    ranked={getTestStats(t, allCandidates).candidatesRanked}
                    onOpen={() => onOpenTest(t.id)}
                    onEdit={editFor(t)}
                  />
                ))}
              </div>
            )}
          </div>
          )}

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
                  usedBy={jobs.filter((j) => j.testIds.includes(t.id))}
                  ranked={getTestStats(t, allCandidates).candidatesRanked}
                  onOpen={() => onOpenTest(t.id)}
                  onEdit={isVetter ? editFor(t) : undefined}
                />
              ))}
            </div>
          </div>

        </div>
      )}

      {building && <TestBuilder business={business} initial={building.initial} onSave={saveTest} onCancel={() => setBuilding(null)} />}
    </div>
  );
};

const TestSummaryCard: React.FC<{ test: AssessmentTest; usedBy: JobPosting[]; ranked: number; onOpen: () => void; onEdit?: () => void }> = ({
  test,
  usedBy,
  ranked,
  onOpen,
  onEdit,
}) => (
  <div
    onClick={onOpen}
    className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs cursor-pointer hover:border-indigo-300 transition-colors"
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 font-bold">{test.category}</span>
      <span className="flex items-center gap-3">
        <span className="text-xs text-slate-500 font-medium">{test.difficulty}</span>
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
      </span>
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
