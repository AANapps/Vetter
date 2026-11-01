import { isMainVersion } from '../lib/testLevels';
import React, { useState } from 'react';
import { User, JobPosting, AssessmentTest, Business, TestDraft } from '../types';
import { getTestStats } from '../lib/leaderboard';
import { JobCandidates } from './JobCandidates';
import { CheckCircle2, FileText, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
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
  // Tests still being written, newest first
  drafts: TestDraft[];
  onSaveDraft: (record: TestDraft) => Promise<boolean>;
  onDeleteDraft: (id: string) => void;
  // Carries on with a draft in the AI chat, or in the builder
  onContinueDraft: (draft: TestDraft) => void;
  onEditDraftByHand: (draft: TestDraft) => void;
  // The company's leads pipeline, shown first in the Candidates tab
  leads?: React.ReactNode;
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
  drafts,
  onSaveDraft,
  onDeleteDraft,
  onContinueDraft,
  onEditDraftByHand,
  leads,
}) => {
  // A business only manages its own jobs and its own tests; the Vetter team sees every company's jobs
  const isVetter = !business;
  const jobs = isVetter ? allJobs : allJobs.filter((j) => j.businessId === business.id);
  const companyTests = isVetter ? [] : tests.filter((t) => t.type === 'custom' && t.businessId === business.id);
  const vetterTests = tests.filter((t) => t.type === 'standard' && isMainVersion(t));

  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  // The Candidates tab: the leads pipeline, or everyone on Vetter ranked for a job
  const [candidatesView, setCandidatesView] = useState<'leads' | 'ranked'>(leads ? 'leads' : 'ranked');
  const showRanked = section === 'candidates' && (candidatesView === 'ranked' || !leads);
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
      {section === 'candidates' && leads && (
        <div role="tablist" aria-label="Candidates" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
          {(
            [
              ['leads', 'Leads'],
              ['ranked', 'Ranked by job'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={candidatesView === id}
              onClick={() => setCandidatesView(id)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                candidatesView === id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {section === 'candidates' && leads && candidatesView === 'leads' && leads}
      {showRanked && !selectedJob && (
        <p className="text-xs text-slate-500">Post a job to start seeing ranked candidates.</p>
      )}
      {showRanked && selectedJob && (
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

          {/* Tests still being written */}
          {drafts.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Drafts</h2>
                <p className="text-xs text-slate-500">Tests you saved to finish later. Only {business ? 'your company' : 'the Vetter team'} can see them, and candidates can't take them until they're saved as tests.</p>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drafts.map((d) => (
                  <DraftCard
                    key={d.id}
                    draft={d}
                    job={allJobs.find((j) => j.id === d.jobId)}
                    showCompany={isVetter}
                    onContinue={d.messages?.length ? () => onContinueDraft(d) : undefined}
                    onEdit={() => onEditDraftByHand(d)}
                    onDelete={() => window.confirm(`Delete the draft "${d.test.title}"? This can't be undone.`) && onDeleteDraft(d.id)}
                  />
                ))}
              </ul>
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

      {building && (
        <TestBuilder
          business={business}
          initial={building.initial}
          onSave={saveTest}
          // Only new tests can be kept as drafts; a saved test is edited in place
          onSaveDraft={
            building.initial
              ? undefined
              : async (test) => {
                  if (await onSaveDraft({ id: `draft-${Date.now()}`, businessId: business?.id ?? '', test, updatedAt: '' })) setBuilding(null);
                }
          }
          onCancel={() => setBuilding(null)}
        />
      )}
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

// A test still being written: what it is so far, and ways to carry on or throw it away
const DraftCard: React.FC<{
  draft: TestDraft;
  job?: JobPosting;
  showCompany: boolean;
  onContinue?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ draft, job, showCompany, onContinue, onEdit, onDelete }) => {
  const t = draft.test;
  const minutes = t.questions.reduce((sum, q) => sum + q.timeLimitMinutes, 0);
  const saved = new Date(draft.updatedAt);
  return (
    <li className="bg-white border border-dashed border-slate-300 rounded-xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button onClick={onContinue ?? onEdit} className="text-sm font-bold text-slate-900 hover:text-indigo-700 truncate text-left" title="Reopen this draft">
              {t.title}
            </button>
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold">Draft</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {t.questions.length} {t.questions.length === 1 ? 'question' : 'questions'} &middot; ~{minutes} min &middot; {t.difficulty}
            {job && ` · for ${showCompany ? `${job.companyName}: ` : ''}${job.title}`}
            {!job && showCompany && t.companyName && ` · ${t.companyName}`}
          </p>
          {!Number.isNaN(saved.getTime()) && (
            <p className="text-[11px] text-slate-400">Saved {saved.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} at {saved.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onContinue && (
          <button onClick={onContinue} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Continue with AI
          </button>
        )}
        <button
          onClick={onEdit}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
            onContinue ? 'text-slate-700 bg-white border border-slate-300 hover:border-indigo-400' : 'text-white bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit by hand
        </button>
        <button onClick={onDelete} className="ml-auto px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-700 flex items-center gap-1" aria-label={`Delete the draft ${t.title}`}>
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </li>
  );
};
