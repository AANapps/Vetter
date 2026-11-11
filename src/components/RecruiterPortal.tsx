import { isMainVersion } from '../lib/testLevels';
import { Pic } from './Pic';
import React, { useState } from 'react';
import { User, JobPosting, AssessmentTest, Business, TestDraft, TestRole, isPublic, levelName, madeWithAI } from '../types';
import { ROLE_GROUPS } from '../lib/testRoles';
import { getTestStats } from '../lib/leaderboard';
import { JobCandidates } from './JobCandidates';
import { CheckCircle2, FileText, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
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
  // Deletes a saved test and takes it off every job
  onDeleteTest: (testId: string) => void;
  // Vetter's AI writes a test from a description, or from a first message filled in for it
  onGenerateTest: (seed?: string) => void;
  // Tests still being written, newest first
  drafts: TestDraft[];
  onSaveDraft: (record: TestDraft) => Promise<boolean>;
  onDeleteDraft: (id: string) => void;
  // Carries on with a draft in the AI chat, or in the builder
  onContinueDraft: (draft: TestDraft) => void;
  onEditDraftByHand: (draft: TestDraft) => void;
  // Opens one of the company's saved tests where it's edited: the test chat if made with AI, the builder if by hand
  onEditOwnTest: (testId: string) => void;
  // One of the company's saved tests opened in the test chat to change by asking, however it was made
  onEditWithAI: (testId: string) => void;
  // One of the company's saved tests opened in the builder, however it was made
  onEditByHand: (testId: string) => void;
  // The company's leads pipeline, shown first in the Candidates tab
  leads?: React.ReactNode;
  // Every candidate on Vetter, to browse (src/components/BrowseCandidates.tsx)
  browse?: React.ReactNode;
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
  onDeleteTest,
  onGenerateTest,
  drafts,
  onSaveDraft,
  onDeleteDraft,
  onContinueDraft,
  onEditDraftByHand,
  onEditOwnTest,
  onEditWithAI,
  onEditByHand,
  leads,
  browse,
}) => {
  // A business only manages its own jobs and its own tests; the Vetter team sees every company's jobs
  const isVetter = !business;
  const jobs = isVetter ? allJobs : allJobs.filter((j) => j.businessId === business.id);
  const companyTests = isVetter ? [] : tests.filter((t) => t.type === 'custom' && t.businessId === business.id && t.purpose !== 'training');
  // The public library: Vetter's tests and other companies' approved ones (a company's own are in companyTests)
  const vetterTests = tests.filter((t) => isPublic(t) && isMainVersion(t) && (isVetter || t.businessId !== business.id));

  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  // The Tests page: one list of the company's tests and Vetter's, browsed by industry and role (as candidates browse
  // them), narrowed by source and a search
  const [testQuery, setTestQuery] = useState('');
  const [testSource, setTestSource] = useState<'all' | 'yours' | 'vetter' | 'on-jobs'>('all');
  const [testField, setTestField] = useState<{ label: string; roles: TestRole[] } | null>(null);
  const usedByOf = (t: AssessmentTest) => jobs.filter((j) => j.testIds.includes(t.id));
  const allTests = [...companyTests, ...vetterTests];
  const sourceTabs = (
    isVetter
      ? [
          ['all', 'All'],
          ['on-jobs', 'On a job'],
        ]
      : [
          ['all', 'All'],
          ['yours', 'Yours'],
          ['vetter', 'Library'],
          ['on-jobs', 'On your jobs'],
        ]
  ) as [typeof testSource, string][];
  const inSource = (t: AssessmentTest, src: typeof testSource) =>
    src === 'all' || (src === 'yours' ? t.type === 'custom' : src === 'vetter' ? vetterTests.includes(t) : usedByOf(t).length > 0);
  const countFor = (src: typeof testSource) => allTests.filter((t) => inSource(t, src)).length;
  // A test's roles: its own, or for a company's test (which has none) the roles the library's tests of its category
  // are for, so it's filed beside them
  const rolesByCategory = new Map<string, TestRole[]>();
  for (const t of vetterTests) rolesByCategory.set(t.category, [...new Set([...(rolesByCategory.get(t.category) ?? []), ...(t.roles ?? [])])]);
  const rolesOf = (t: AssessmentTest): TestRole[] => (t.roles?.length ? t.roles : rolesByCategory.get(t.category) ?? []);
  const inField = (t: AssessmentTest, roles: TestRole[]) => rolesOf(t).some((r) => roles.includes(r));
  const sourced = allTests.filter((t) => inSource(t, testSource));
  const tq = testQuery.trim().toLowerCase();
  const grouped = !testField && !tq;
  // Tests on the company's jobs first, then its own, then the library
  const shownTests = sourced
    .filter((t) => !testField || inField(t, testField.roles))
    .filter((t) => !tq || `${t.title} ${t.category} ${t.skillsTested.join(' ')}`.toLowerCase().includes(tq))
    .sort(
      (a, b) =>
        Number(usedByOf(b).length > 0) - Number(usedByOf(a).length > 0) ||
        Number(companyTests.includes(b)) - Number(companyTests.includes(a)) ||
        a.category.localeCompare(b.category) ||
        a.title.localeCompare(b.title)
    );
  // With nothing picked, the list is split under each industry's heading, in the menu's order; a test for roles in two
  // industries is under both, so each heading's count matches the menu's. Tests for no listed role go last
  const sections: { heading: string | null; tests: AssessmentTest[] }[] = grouped
    ? [
        ...ROLE_GROUPS.map((g) => ({ heading: g.industry, tests: shownTests.filter((t) => inField(t, g.roles)) })),
        { heading: 'Other', tests: shownTests.filter((t) => !ROLE_GROUPS.some((g) => inField(t, g.roles))) },
      ].filter((sec) => sec.tests.length > 0)
    : [{ heading: null, tests: shownTests }];
  // The Candidates tab: the leads pipeline, or everyone on Vetter ranked for a job
  const [candidatesView, setCandidatesView] = useState<'leads' | 'browse' | 'ranked'>(leads ? 'leads' : browse ? 'browse' : 'ranked');
  const showRanked = section === 'candidates' && (candidatesView === 'ranked' || (candidatesView === 'leads' && !leads) || (candidatesView === 'browse' && !browse));
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
  const deleteTest = (t: AssessmentTest) => {
    const onJobs = allJobs.filter((j) => j.testIds.includes(t.id));
    const taken = getTestStats(t, allCandidates).candidatesRanked;
    const warnings = [
      onJobs.length ? `It comes off ${onJobs.length === 1 ? onJobs[0].title : `${onJobs.length} jobs`}, and candidates there won't be asked to take it.` : '',
      taken ? `${taken} ${taken === 1 ? 'person has' : 'people have'} taken it; their scores stay on their record but it won't show any more.` : '',
    ].filter(Boolean);
    if (window.confirm(`Delete ${t.title}? ${warnings.join(' ')} This can't be undone.`.replace(/\s+/g, ' '))) onDeleteTest(t.id);
  };

  return (
    <div className={`${section === 'tests' ? 'px-4 sm:px-6' : 'max-w-7xl mx-auto px-6'} py-8 space-y-8`}>
      {/* Company Header: the Tests page has its own, like Your jobs */}
      {section !== 'tests' && (
      // The company's card, with its numbers as cards beside it: one row on wide screens, two by two under it on phones
      <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-3">
        <div className="col-span-2 lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
            <Pic
              src={business ? business.logo : recruiter.avatarUrl}
              alt={business ? business.name : 'Vetter'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">{business ? business.name : 'Vetter Talent Team'}</h1>
            <p className="text-xs text-slate-700 font-medium truncate">
              {recruiter.name} &middot; {recruiter.title}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {business
                ? `${business.industry} · ${business.headquarters}`
                : `Posting and filling jobs for ${businesses.length} companies`}
            </p>
          </div>
        </div>
        {(
          [
            ['Open jobs', jobs.filter((j) => j.status === 'active').length, 'text-slate-900'],
            ['Total applicants', jobs.reduce((acc, j) => acc + j.applicantCount, 0), 'text-indigo-600'],
            [business ? 'Your tests' : 'Companies', business ? companyTests.length : businesses.length, 'text-emerald-600'],
            ['Candidates on Vetter', allCandidates.length, 'text-indigo-700'],
          ] as const
        ).map(([label, value, colour]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-center min-w-0">
            <div className="text-xs text-slate-500 font-medium truncate">{label}</div>
            <div className={`text-2xl font-bold font-mono tabular-nums ${colour}`}>{value}</div>
          </div>
        ))}
      </div>
      )}

      {/* Candidates */}
      {section === 'candidates' && (leads || browse) && (
        <div role="tablist" aria-label="Candidates" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
          {(
            [
              ...(leads ? [['leads', 'Leads'] as const] : []),
              ...(browse ? [['browse', 'All candidates'] as const] : []),
              ['ranked', 'Ranked by job'] as const,
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
      {section === 'candidates' && browse && candidatesView === 'browse' && browse}
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
          <JobCandidates key={selectedJob.id} job={selectedJob} allCandidates={allCandidates} testTitles={Object.fromEntries(tests.map((t) => [t.id, t.title]))} />
        </div>
      )}

      {/* Tests: the company's own and Vetter's library in one list */}
      {section === 'tests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tests</h1>
              <p className="text-sm text-slate-500 max-w-xl">
                {isVetter
                  ? 'The Vetter library. Tests you write join it for every candidate.'
                  : `Tests ${business.name} wrote and Vetter's library, together. Add any of them to a job from the job.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 self-start">
              <button
                onClick={() => onGenerateTest()}
                className="create-border px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900 rounded-lg flex items-center gap-2"
              >
                Create with AI
              </button>
              <button
                onClick={() => setBuilding({})}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 shadow-xs"
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

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {[
              { label: 'Tests', value: allTests.length },
              { label: isVetter ? 'Written in the builder' : 'Written by you', value: isVetter ? vetterTests.filter(isEditable).length : companyTests.length },
              { label: isVetter ? 'On a job' : 'On your jobs', value: allTests.filter((t) => usedByOf(t).length > 0).length },
              { label: 'Drafts', value: drafts.length },
            ].map((st) => (
              <div key={st.label} className="bg-white px-5 py-4">
                <dt className="text-xs text-slate-500">{st.label}</dt>
                <dd className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{st.value}</dd>
              </div>
            ))}
          </dl>

          {/* Tests still being written */}
          {drafts.length > 0 && (
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Drafts</h2>
                <p className="text-xs text-slate-500">Only {business ? 'your company' : 'the Vetter team'} can see these. Candidates can't take them until they're saved.</p>
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

          {/* The company's own tests first, each ready to change by asking Vetter or by hand */}
          {!isVetter && (
            <section aria-labelledby="my-tests" className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h2 id="my-tests" className="text-sm font-bold text-slate-900">
                    My tests <span className="font-mono font-normal text-slate-400 tabular-nums">{companyTests.length}</span>
                  </h2>
                  <p className="text-xs text-slate-500">Tests {business.name} made. Edit with AI to change one by asking: harder, shorter, a new task, a different tool.</p>
                </div>
              </div>
              {companyTests.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl px-5 py-8 text-center space-y-3">
                  <p className="text-sm text-slate-500">You haven't made any tests yet.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button onClick={() => onGenerateTest()} className="create-border px-3 py-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900 rounded-lg">
                      Create with AI
                    </button>
                    <button onClick={() => setBuilding({})} className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-400 rounded-lg">
                      Create a test
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_5.5rem_7rem_5.5rem_7rem_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <span>Test</span>
                  <span>Made</span>
                  <span>Level</span>
                  <span>Length</span>
                  <span>Jobs</span>
                  <span />
                </div>
                <ul className="divide-y divide-slate-100">
                  {[...companyTests].sort((a, b) => madeAt(b) - madeAt(a)).map((t) => (
                    <MyTestCard
                      key={t.id}
                      test={t}
                      usedBy={usedByOf(t)}
                      onOpen={() => onOpenTest(t.id)}
                      onEditWithAI={() => onEditWithAI(t.id)}
                      onEditByHand={() => onEditByHand(t.id)}
                      onDelete={() => deleteTest(t)}
                    />
                  ))}
                </ul>
                </div>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-6 items-start">
          {/* Browse by industry and role, as candidates do */}
          <aside className="hidden lg:block bg-white border border-slate-200 rounded-xl p-4 space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:overscroll-contain [scrollbar-width:thin]">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900 mb-2">Browse by role</h2>
              <RoleButton label="All tests" count={sourced.length} active={!testField} onClick={() => setTestField(null)} />
            </div>
            {ROLE_GROUPS.map((group) => (
              <div key={group.industry} className="space-y-1">
                <button
                  onClick={() => setTestField({ label: group.industry, roles: group.roles })}
                  aria-pressed={testField?.label === group.industry}
                  className={`w-full flex items-center justify-between text-left text-[10px] font-mono uppercase tracking-wider font-semibold px-2 hover:text-indigo-700 ${
                    testField?.label === group.industry ? 'text-indigo-700' : 'text-slate-400'
                  }`}
                >
                  <span>{group.industry}</span>
                  <span className="tabular-nums">{sourced.filter((t) => inField(t, group.roles)).length}</span>
                </button>
                {group.roles.map((role) => (
                  <RoleButton
                    key={role}
                    label={role}
                    count={sourced.filter((t) => inField(t, [role])).length}
                    active={testField?.label === role}
                    onClick={() => setTestField({ label: role, roles: [role] })}
                  />
                ))}
              </div>
            ))}
          </aside>

          <div className="space-y-4 min-w-0">
          {/* Find a test */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Search by name, skill or category"
                aria-label="Search tests"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div role="tablist" aria-label="Which tests" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold self-start">
              {sourceTabs.map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={testSource === id}
                  onClick={() => setTestSource(id)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${testSource === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {label} <span className="font-mono text-slate-400">{countFor(id)}</span>
                </button>
              ))}
            </div>
            <select
              value={testField?.label ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                const group = ROLE_GROUPS.find((g) => g.industry === v);
                setTestField(!v ? null : group ? { label: v, roles: group.roles } : { label: v, roles: [v as TestRole] });
              }}
              aria-label="Role"
              className="lg:hidden px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm self-start"
            >
              <option value="">All roles</option>
              {ROLE_GROUPS.map((g) => (
                <optgroup key={g.industry} label={g.industry}>
                  <option value={g.industry}>All of {g.industry}</option>
                  {g.roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_4.5rem_2.5rem_3.5rem_2.5rem_3.5rem] gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Test</span>
              <span>Length</span>
              <span className="text-right">Pass</span>
              <span className="text-right">Ranked</span>
              <span className="text-right">Jobs</span>
              <span />
            </div>
            {shownTests.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                {testSource === 'yours' && companyTests.length === 0 ? "You haven't written any tests yet. Use Create a test above." : 'No tests match.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sections.flatMap(({ heading, tests: inSection }) => [
                  ...(heading
                    ? [
                        <li key={`h-${heading}`} className="px-5 pt-5 pb-2 bg-slate-50/70 flex items-baseline justify-between gap-3">
                          <h3 className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500">{heading}</h3>
                          <span className="text-[11px] font-mono text-slate-400 tabular-nums">{inSection.length}</span>
                        </li>,
                      ]
                    : []),
                  ...inSection.map((t) => {
                    const own = t.type === 'custom' && !isVetter && t.businessId === business.id;
                    return (
                      <TestRow
                        key={`${heading ?? ''}-${t.id}`}
                        test={t}
                        own={own}
                        usedBy={usedByOf(t)}
                        ranked={getTestStats(t, allCandidates).candidatesRanked}
                        onOpen={() => onOpenTest(t.id)}
                        onEdit={own ? () => onEditByHand(t.id) : isVetter ? editFor(t) : undefined}
                        onAiEdit={own ? () => onEditWithAI(t.id) : undefined}
                        // The Vetter team can delete library tests written in the builder; the built-in ones stay
                        onDelete={own ? () => deleteTest(t) : isVetter && isEditable(t) ? () => deleteTest(t) : undefined}
                        onDeepen={isVetter ? () => onGenerateTest(deepenSeed(t)) : undefined}
                      />
                    );
                  }),
                ])}
              </ul>
            )}
          </div>
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

// What the test chat is asked when the Vetter team rebuilds a library test in depth
const deepenSeed = (t: AssessmentTest) =>
  `Rebuild this Vetter library test in depth, as a full test with a case study, written answers and hands-on tasks:\n\n` +
  `${t.title} (${levelName(t.difficulty)}, ${t.category})\n${t.description}\nSkills: ${t.skillsTested.join(', ')}` +
  (t.roles?.length ? `\nFor: ${t.roles.join(', ')}` : '') +
  `\n\nIt currently has ${t.questions.length} questions: ${t.questions.map((q) => q.title).join('; ')}.`;

// One test on one line: what it is and whose, how long, how it's doing, the jobs it's on, and what can be done to it
const TestRow: React.FC<{
  test: AssessmentTest;
  own: boolean;
  usedBy: JobPosting[];
  ranked: number;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  // Rebuilds it with the AI as a full, in-depth test
  onDeepen?: () => void;
  // Opens it in the test chat to change by asking
  onAiEdit?: () => void;
}> = ({ test, own, usedBy, ranked, onOpen, onEdit, onDelete, onDeepen, onAiEdit }) => {
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  return (
    <li
      onClick={onOpen}
      className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_4.5rem_2.5rem_3.5rem_2.5rem_3.5rem] gap-x-3 gap-y-1 items-center px-5 py-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
    >
      <div className="min-w-0">
        {/* The name in full, wrapping if it's long; the badges follow it */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          <span className="text-sm font-semibold text-slate-900 break-words min-w-0">{test.title}</span>
          {own && <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-900 text-white">Yours</span>}
          {own && test.publicStatus && (
            <span
              title={test.publicStatus === 'rejected' && test.publicNote ? `Not approved: ${test.publicNote}` : undefined}
              className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                test.publicStatus === 'rejected' ? 'bg-rose-700 text-white' : 'bg-slate-900 text-white'
              }`}
            >
              {test.publicStatus === 'approved' ? 'Public' : test.publicStatus === 'pending' ? 'Waiting for approval' : 'Not approved'}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 truncate">
          {test.category} &middot; {levelName(test.difficulty)}
          {/* Another company's test from the public library says whose it is */}
          {!own && test.type === 'custom' && test.companyName && <> &middot; by {test.companyName}</>}
          <span className="md:hidden">
            {' '}
            &middot; ~{test.estimatedMinutes} min &middot; pass {test.passingScore} &middot; {usedBy.length ? `on ${usedBy.length} ${usedBy.length === 1 ? 'job' : 'jobs'}` : 'not on a job'}
          </span>
        </div>
      </div>
      <div className="hidden md:block text-xs text-slate-600 font-mono tabular-nums">
        ~{test.estimatedMinutes} min
        <div className="text-slate-400">
          {test.totalQuestions} {test.totalQuestions === 1 ? 'task' : 'tasks'}
        </div>
      </div>
      <div className="hidden md:block text-right text-xs font-mono tabular-nums text-slate-700">{test.passingScore}</div>
      <div className="hidden md:block text-right text-xs font-mono tabular-nums text-slate-700">{ranked}</div>
      <div className="hidden md:block text-right text-xs min-w-0">
        {usedBy.length ? (
          <span className="block truncate font-medium font-mono tabular-nums text-slate-800" title={usedBy.map((j) => j.title).join(', ')}>
            {usedBy.length}
          </span>
        ) : (
          <span className="text-slate-300">&ndash;</span>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        {onDeepen && test.questions.length < 12 && (
          <button onClick={stop(onDeepen)} title="Write a full, in-depth version of this test with Vetter's AI" aria-label={`Rebuild ${test.title} in depth`} className="text-indigo-600 hover:text-indigo-900">
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
        {onAiEdit && (
          <button onClick={stop(onAiEdit)} title="Edit with AI: tell Vetter what to change" aria-label={`Edit ${test.title} with AI`} className="text-indigo-600 hover:text-indigo-900">
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
        {onEdit && (
          <button onClick={stop(onEdit)} title="Edit" aria-label={`Edit ${test.title}`} className="text-slate-400 hover:text-indigo-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button onClick={stop(onDelete)} title="Delete test" aria-label={`Delete ${test.title}`} className="text-slate-400 hover:text-rose-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </li>
  );
};

// When a company's test was made, from its id (test-custom-<ms>); 0 when the id doesn't say
const madeAt = (t: AssessmentTest) => Number(t.id.match(/-(\d{12,})$/)?.[1] ?? 0);

// One of the company's own tests as a row: what it is, how and when it was made, where it's used, and editing it
// with AI or by hand
const MyTestCard: React.FC<{
  test: AssessmentTest;
  usedBy: JobPosting[];
  onOpen: () => void;
  onEditWithAI: () => void;
  onEditByHand: () => void;
  onDelete: () => void;
}> = ({ test, usedBy, onOpen, onEditWithAI, onEditByHand, onDelete }) => {
  const made = madeAt(test);
  return (
    <li className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_5.5rem_7rem_5.5rem_7rem_auto] gap-x-3 gap-y-2 items-center px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onOpen} className="text-sm font-semibold text-slate-900 hover:text-indigo-700 text-left break-words">
            {test.title}
          </button>
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${madeWithAI(test) ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
            {madeWithAI(test) ? 'Made with AI' : 'Made by hand'}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {test.category}
          <span className="md:hidden">
            {' '}
            &middot; {levelName(test.difficulty)} &middot; {test.totalQuestions} {test.totalQuestions === 1 ? 'task' : 'tasks'}, ~{test.estimatedMinutes} min
            {made ? <> &middot; {new Date(made).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</> : null} &middot;{' '}
            {usedBy.length ? `on ${usedBy.length === 1 ? usedBy[0].title : `${usedBy.length} jobs`}` : 'not on a job'}
          </span>
        </p>
      </div>
      <span className="hidden md:block text-xs text-slate-600 tabular-nums">{made ? new Date(made).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) : '–'}</span>
      <span className="hidden md:block text-xs text-slate-600">{levelName(test.difficulty)}</span>
      <span className="hidden md:block text-xs text-slate-600 tabular-nums">
        ~{test.estimatedMinutes} min
        <span className="block text-slate-400">
          {test.totalQuestions} {test.totalQuestions === 1 ? 'task' : 'tasks'}
        </span>
      </span>
      <span className="hidden md:block text-xs text-slate-600 truncate" title={usedBy.map((j) => j.title).join(', ') || undefined}>
        {usedBy.length ? (usedBy.length === 1 ? usedBy[0].title : `${usedBy.length} jobs`) : <span className="text-slate-300">Not on a job</span>}
      </span>
      <div className="flex items-center gap-2 md:justify-end">
        <button onClick={onEditWithAI} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5" />
          Edit with AI
        </button>
        <button onClick={onEditByHand} title="Edit by hand" className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-400 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap">
          <Pencil className="w-3.5 h-3.5" />
          By hand
        </button>
        <button onClick={onDelete} title="Delete test" aria-label={`Delete ${test.title}`} className="p-1 text-slate-400 hover:text-rose-600">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
};

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
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-indigo-50 text-slate-800 text-[10px] font-semibold">{draft.editsTestId ? 'Unsaved changes' : 'Draft'}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {t.questions.length} {t.questions.length === 1 ? 'question' : 'questions'} &middot; ~{minutes} min &middot; {levelName(t.difficulty)}
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

const RoleButton: React.FC<{ label: string; count: number; active: boolean; onClick: () => void }> = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors ${active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
  >
    <span>{label}</span>
    <span className="font-mono text-[11px] text-slate-400 tabular-nums">{count}</span>
  </button>
);
