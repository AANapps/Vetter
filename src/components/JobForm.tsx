import React, { useState } from 'react';
import { AssessmentTest, Business, JobPosting, isPublic, levelName } from '../types';
import { CITIES } from '../lib/geo';
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, formatSalaryRange, parseSalaryRange } from '../lib/jobFilters';
import { Loader2, Plus, Sparkles, X } from 'lucide-react';
import { SectorSelect } from './SectorPicker';
import { FOCUS_SECTOR, SectorId, inCompanySector } from '../lib/sectors';
import { isMainVersion, levelsOf, versionTitle, newestFirst } from '../lib/testLevels';
import { aiFetch } from '../lib/aiRequest';
import { TestPickerDialog, fieldOf } from './TestPickerDialog';
import { Suggestion, matchExisting } from '../lib/testGeneration';

interface JobFormProps {
  // The companies the job can be posted for: a company posts for itself, the Granyt team for any company
  businesses: Business[];
  postedBy: NonNullable<JobPosting['postedBy']>;
  tests: AssessmentTest[];
  // Whether a library test may be offered (what the Granyt team hid isn't); every test when left out
  isListed?: (t: AssessmentTest) => boolean;
  onSave: (job: JobPosting) => void;
  onCancel: () => void;
  // Tests to start with, already ticked (e.g. from a test plan), by the version to use
  initialTestIds?: string[];
  // Invite only to start with, e.g. when made to invite one person
  initialVisibility?: 'public' | 'invite';
  // The job's title to start with, e.g. the role a test was made for
  initialTitle?: string;
  // The job ad pasted on the company home: its description, with the tests already picked from it (no AI suggestion)
  initialDescription?: string;
  // A draft of this job to carry on with: every field filled in as it was left, and posting it publishes that draft
  initialJob?: JobPosting;
  // Keeping it as a draft to finish later
  onSaveDraft?: (job: JobPosting) => void;
  // Building a test for it with AI: the form is kept as a draft, the AI test builder opens, and the form comes back after
  onBuildWithAI?: (job: JobPosting) => void;
  // Tests for this job still being written with AI (kept as drafts), to carry on with
  testDrafts?: { id: string; title: string }[];
  onContinueTestDraft?: (draftId: string) => void;
}

const inputClass =
  'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

// The one job form, used by companies and by the Granyt team
export const JobForm: React.FC<JobFormProps> = ({
  businesses,
  postedBy,
  tests,
  isListed = () => true,
  onSave,
  onCancel,
  initialTestIds = [],
  initialTitle = '',
  initialDescription,
  initialVisibility = 'public',
  initialJob,
  onSaveDraft,
  onBuildWithAI,
  testDrafts = [],
  onContinueTestDraft,
}) => {
  const init = initialJob;
  const initSalary = init ? parseSalaryRange(init.salaryRange) : undefined;
  // The job's id stays the same from draft to posting
  const [jobId] = useState(() => init?.id ?? `job-${Date.now()}`);
  const [visibility, setVisibility] = useState<'public' | 'invite'>(init?.visibility ?? initialVisibility);
  const [businessId, setBusinessId] = useState(init?.businessId ?? businesses[0]?.id ?? '');
  const business = businesses.find((b) => b.id === businessId) ?? businesses[0];
  // The company's own tests come first, the newest at the top
  const companyTests = newestFirst(tests.filter((t) => t.type === 'custom' && t.businessId === business?.id && t.purpose !== 'training'));

  const [title, setTitle] = useState(init?.title ?? initialTitle);
  const [department, setDepartment] = useState(init?.department ?? 'Core Engineering');
  // Starts in the company's sector; a job can be listed under another
  const [pickedSector, setSector] = useState<SectorId | ''>(init?.sector ?? '');
  const sector = FOCUS_SECTOR || pickedSector || business?.sector || '';
  // Each Granyt test once, in the job's sector only; its level is chosen when it's ticked
  const vetterTests = tests.filter((t) => isPublic(t) && isMainVersion(t) && t.businessId !== business?.id && inCompanySector(sector)(t) && isListed(t));
  // Every field the job board filters on is asked for here, so new jobs filter like the seeded ones
  const [location, setLocation] = useState(init?.location ?? (CITIES[business?.headquarters ?? ''] ? business!.headquarters : 'San Francisco, CA'));
  const [workType, setWorkType] = useState<JobPosting['workType']>(init?.workType ?? 'Remote');
  const [salaryMin, setSalaryMin] = useState(initSalary?.min ?? 170000);
  const [salaryMax, setSalaryMax] = useState(initSalary?.max ?? 210000);
  const [employmentType, setEmploymentType] = useState<NonNullable<JobPosting['employmentType']>>(init?.employmentType ?? 'Full-time');
  const [experience, setExperience] = useState(init?.experienceLevel ?? EXPERIENCE_LEVELS[2]);
  const [description, setDescription] = useState(init?.description ?? initialDescription ?? '');
  // The tests candidates are ranked on, by main version: the level picked and its importance
  type Pick = { testId: string; importance: 'required' | 'preferred' };
  // Keyed by the test's main version, as the list below is
  // From a draft: each test as it was set (a test added since, e.g. by the AI builder, starts at the defaults)
  const [picked, setPicked] = useState<Record<string, Pick>>(() =>
    Object.fromEntries(
      [...initialTestIds, ...(init?.testIds ?? [])].flatMap((id) => {
        const t = tests.find((x) => x.id === id);
        const req = init?.requirements.find((r) => r.testId === id);
        return t ? [[t.familyId ?? t.id, { testId: t.id, importance: req?.importance ?? ('required' as const) }]] : [];
      })
    )
  );
  const [pickError, setPickError] = useState(false);
  // The tests are picked in a pop-up (TestPickerDialog); the form lists the ones on the job, in library order
  const [pickerOpen, setPickerOpen] = useState(false);
  const chosenTests = [...companyTests, ...vetterTests].filter((t) => picked[t.id]);
  const pickedTests = Object.values(picked)
    .map((p) => tests.find((t) => t.id === p.testId))
    .filter((t): t is AssessmentTest => !!t);
  const pickFor = (testId: string) => Object.values(picked).find((p) => p.testId === testId)!;

  const togglePick = (testId: string) => {
    setPickError(false);
    setPicked((prev) => {
      const { [testId]: wasPicked, ...rest } = prev;
      return wasPicked ? rest : { ...prev, [testId]: { testId, importance: 'required' } };
    });
  };
  const updatePick = (testId: string, change: Partial<Pick>) => {
    setPicked((prev) => ({ ...prev, [testId]: { ...prev[testId], ...change } }));
  };
  // Posting first asks Granyt's AI which tests fit the job description, and the company says whether to include them.
  // Asked once per title and description, so posting again after answering doesn't ask again
  const [suggested, setSuggested] = useState<Suggestion[] | null>(null);
  const [include, setInclude] = useState<string[]>([]);
  const [askedFor, setAskedFor] = useState(initialDescription ? `${initialTitle.trim()}\n${initialDescription.trim()}` : '');
  const [asking, setAsking] = useState(false);
  const [requireTest, setRequireTest] = useState<boolean>(init?.testsRequired ?? true);

  const changeBusiness = (id: string) => {
    setBusinessId(id);
    const next = businesses.find((b) => b.id === id);
    if (next && CITIES[next.headquarters]) setLocation(next.headquarters);
    // Another company's own tests can't be used
    setPicked((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => tests.find((t) => t.id === id)?.type !== 'custom'))
    );
  };

  // The tests that fit the job, from the AI reading its description, or matched here when the AI can't be reached
  const suggestFor = async (): Promise<Suggestion[]> => {
    const library = [...companyTests, ...vetterTests];
    if (!library.length) return [];
    const already = new Set(Object.keys(picked));
    try {
      const res = await aiFetch('/api/suggest-tests', {
        job: { title: title.trim(), description, sector, level: experience, department },
        library: library.map((t) => ({ id: t.id, title: t.title, category: t.category, difficulty: t.difficulty, skills: t.skillsTested, roles: t.roles ?? [], description: t.description })),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { picks?: { testId: string; reason: string }[] };
      return (body.picks ?? []).flatMap(({ testId, reason }) => {
        const test = library.find((t) => t.id === testId);
        return test && !already.has(test.id) ? [{ test, reason }] : [];
      });
    } catch {
      return matchExisting(`${title}\n${description}`, library).filter((s) => !already.has(s.test.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !title.trim() || !department.trim() || salaryMax < salaryMin || asking) return;
    const key = `${title.trim()}\n${description.trim()}`;
    if (askedFor !== key) {
      setAsking(true);
      const picks = await suggestFor();
      setAsking(false);
      setAskedFor(key);
      if (picks.length) {
        setSuggested(picks);
        setInclude(picks.map((p) => p.test.id));
        return;
      }
    }
    post(picked);
  };

  // Adds the ticked suggestions to the job's tests, then posts it
  const answerSuggestions = (add: boolean) => {
    const next = add ? { ...picked, ...Object.fromEntries(include.map((id) => [id, { testId: id, importance: 'required' as const }])) } : picked;
    setPicked(next);
    setSuggested(null);
    post(next);
  };

  const post = (picks: Record<string, Pick>) => {
    if (!business) return;
    if (!Object.values(picks).some((p) => tests.some((t) => t.id === p.testId))) {
      setPickError(true);
      return;
    }
    onSave(buildJob(picks, 'active'));
  };

  // The job as filled in so far: posted, or kept as a draft (which needs no tests yet)
  const buildJob = (picks: Record<string, Pick>, status: JobPosting['status']): JobPosting => {
    const pickedTests = Object.values(picks)
      .map((p) => tests.find((t) => t.id === p.testId))
      .filter((t): t is AssessmentTest => !!t);
    const pickFor = (testId: string) => Object.values(picks).find((p) => p.testId === testId)!;
    const business_ = business!;
    return {
      id: jobId,
      title: title.trim() || (status === 'draft' ? 'Untitled job' : ''),
      companyName: business_.name,
      companyLogo: business_.logo,
      businessId: business_.id,
      postedBy,
      location,
      workType,
      salaryRange: formatSalaryRange(salaryMin, salaryMax),
      description: description || `We are hiring a ${title.trim()} to join ${business_.name}.`,
      department: department.trim(),
      ...(sector && { sector }),
      postedDate: new Date().toISOString().split('T')[0],
      employmentType,
      experienceLevel: experience,
      closingDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      requirements: pickedTests.map((t) => ({
        skillId: t.id,
        testId: t.id,
        skillName: versionTitle(t),
        importance: pickFor(t.id).importance,
        weight: Math.round((1 / pickedTests.length) * 100) / 100,
      })),
      testIds: pickedTests.map((t) => t.id),
      testsRequired: requireTest,
      invitations: init?.invitations ?? [],
      ...(init?.invitedEmails && { invitedEmails: init.invitedEmails }),
      applicantCount: init?.applicantCount ?? 0,
      status,
      ...(visibility === 'invite' && { visibility }),
    };
  };
  const draftNow = () => (business ? buildJob(picked, 'draft') : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">
            {init?.status === 'draft' ? `Finish your job${title.trim() ? `: ${title.trim()}` : ''}` : businesses.length === 1 ? `Post a Job at ${business?.name}` : 'Post a Job for a Company'}
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 text-xs font-medium">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {businesses.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
              <select value={businessId} onChange={(e) => changeBusiness(e.target.value)} className={`${inputClass} font-medium`}>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">The job is listed under this company, marked as posted by Granyt.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Database Platform Architect"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>

{!FOCUS_SECTOR && (
          <div>
            <label htmlFor="job-sector" className="block text-xs font-semibold text-slate-700 mb-1">Sector</label>
            <SectorSelect id="job-sector" required value={sector} onChange={setSector} className={`${inputClass} font-medium`} />
            <p className="text-[11px] text-slate-500 mt-1">Candidates browsing this sector see the job.</p>
          </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <input type="text" required value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Type</label>
              <select value={workType} onChange={(e) => setWorkType(e.target.value as JobPosting['workType'])} className={`${inputClass} font-medium`}>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass}>
              {Object.keys(CITIES)
                .sort()
                .map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">For remote jobs, where the team is based.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Type</label>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as typeof employmentType)} className={inputClass}>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Level</label>
              <select value={experience} onChange={(e) => setExperience(e.target.value)} className={inputClass}>
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Range (a year, USD)</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                required
                min={0}
                step={5000}
                aria-label="Minimum salary"
                value={salaryMin}
                onChange={(e) => setSalaryMin(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
              <input
                type="number"
                required
                min={salaryMin}
                step={5000}
                aria-label="Maximum salary"
                value={salaryMax}
                onChange={(e) => setSalaryMax(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">{formatSalaryRange(salaryMin, salaryMax)}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role Summary</label>
            <textarea
              rows={3}
              placeholder="Key responsibilities and engineering scale..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Who can find it: everyone on the job board, or only people the company invites */}
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-slate-700 mb-1">Who can see it</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  { id: 'public', label: 'Everyone', hint: 'On the job board and Google; anyone can take the tests and apply.' },
                  { id: 'invite', label: 'Invite only', hint: 'Not listed anywhere. Only people you invite or send the link to can open it.' },
                ] as const
              ).map((o) => (
                <label
                  key={o.id}
                  className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2 ${visibility === o.id ? 'border-indigo-500 bg-indigo-50/60' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <input type="radio" name="job-visibility" checked={visibility === o.id} onChange={() => setVisibility(o.id)} className="mt-0.5 accent-indigo-600" />
                  <span>
                    <span className="block text-xs font-semibold text-slate-900">{o.label}</span>
                    <span className="block text-[11px] text-slate-500">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* The tests this job ranks candidates on */}
          <fieldset className={`p-3 border rounded-xl space-y-3 ${pickError ? 'border-slate-300 bg-indigo-50' : 'border-indigo-200 bg-indigo-50/50'}`}>
            <legend className="px-1 text-xs font-bold text-indigo-900">Tests for this job</legend>
            <p className="text-[11px] text-slate-600 -mt-1">
              Add the tests that matter for the role. Candidates are ranked on their scores in them.
            </p>
            {pickError && <p className="text-[11px] font-semibold text-slate-800">Pick at least one test.</p>}

            {/* The tests on the job, each with its level, minimum score and whether it's required; more are added in a pop-up */}
            {chosenTests.length > 0 && (
                  <ul className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {chosenTests.map((t) => {
                      const pick = picked[t.id];
                      return (
                        <li key={t.id} className="px-3 py-2">
                          <div className="flex items-start gap-2.5">
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-slate-900">{t.title}</span>
                              <span className="block text-[11px] text-slate-500">
                                {fieldOf(t)} &middot;{' '}
                                {levelsOf(t, tests).length > 1 ? `${levelsOf(t, tests).length} levels` : t.difficulty}
                                {' '}&middot; ~{t.estimatedMinutes} min
                              </span>
                            </span>
                            <button type="button" onClick={() => togglePick(t.id)} aria-label={`Remove ${t.title}`} className="p-1 rounded text-slate-400 hover:text-rose-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {pick && (
                            <div className="mt-2 ml-6 flex flex-wrap items-center gap-3 text-[11px]">
                              {levelsOf(t, tests).length > 1 && (
                                <select
                                  value={pick.testId}
                                  onChange={(e) => updatePick(t.id, { testId: e.target.value })}
                                  aria-label={`${t.title}: level`}
                                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                                >
                                  {levelsOf(t, tests).map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {levelName(v.difficulty)}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <select
                                value={pick.importance}
                                onChange={(e) => updatePick(t.id, { importance: e.target.value as 'required' | 'preferred' })}
                                aria-label={`${t.title}: required or preferred`}
                                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                              >
                                <option value="required">Required</option>
                                <option value="preferred">Preferred</option>
                              </select>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full h-10 rounded-lg border border-dashed border-indigo-300 bg-white text-xs font-semibold text-indigo-700 hover:bg-indigo-50 inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {chosenTests.length ? 'Add more tests' : 'Add tests'}
            </button>
            {onBuildWithAI && (
              <button
                type="button"
                onClick={() => {
                  const d = draftNow();
                  if (d) onBuildWithAI(d);
                }}
                className="w-full h-10 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-90 inline-flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Build a test for this job with AI
              </button>
            )}
            {onBuildWithAI && <p className="text-[11px] text-slate-500 -mt-1">Your job is kept as a draft while the test is built, and this form comes back with the test added.</p>}
            {/* Tests for this job still being written with AI, kept as drafts */}
            {testDrafts.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5">
                <div className="text-[11px] font-semibold text-amber-900">AI test drafts for this job</div>
                {testDrafts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-800 truncate">{d.title}</span>
                    {onContinueTestDraft && (
                      <button type="button" onClick={() => onContinueTestDraft(d.id)} className="shrink-0 text-[11px] font-semibold text-indigo-700 hover:underline">
                        Continue building
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* The picked tests are the job's tests: whether candidates must take them to apply. No pass mark: you see the scores */}
            <div className="flex flex-wrap items-end gap-4 pt-1">
              <label className="flex items-center gap-1.5 py-1.5 text-xs text-indigo-800 font-medium cursor-pointer">
                <input type="checkbox" checked={requireTest} onChange={(e) => setRequireTest(e.target.checked)} className="accent-indigo-600" />
                <span>Required to apply (otherwise recommended)</span>
              </label>
            </div>
          </fieldset>

          {suggested ? (
            // Granyt's suggestions from the job description: the company decides whether they go on the job
            <div className="p-3 border border-indigo-200 bg-indigo-50 rounded-xl space-y-2.5" role="dialog" aria-label="Suggested tests">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-800">
                  <span className="font-semibold">Granyt read your job description and suggests {suggested.length === 1 ? 'this test' : 'these tests'}.</span>{' '}
                  Do you want to include {suggested.length === 1 ? 'it' : 'them'}?
                </p>
              </div>
              <ul className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                {suggested.map(({ test, reason }) => (
                  <li key={test.id} className="px-3 py-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={include.includes(test.id)}
                        onChange={() => setInclude((prev) => (prev.includes(test.id) ? prev.filter((id) => id !== test.id) : [...prev, test.id]))}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-900">{test.title}</span>
                        <span className="block text-[11px] text-slate-600">{reason}</span>
                        <span className="block text-[11px] text-slate-400">
                          {test.category} &middot; {test.difficulty} &middot; ~{test.estimatedMinutes} min
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!include.length}
                  onClick={() => answerSuggestions(true)}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
                >
                  Include {include.length === suggested.length ? (suggested.length === 1 ? 'it' : 'them') : `${include.length} ticked`} and post
                </button>
                <button
                  type="button"
                  onClick={() => answerSuggestions(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  Post without them
                </button>
              </div>
            </div>
          ) : (
            <button
              type="submit"
              disabled={asking}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{asking ? 'Finding tests that fit your job description…' : 'Post Job'}</span>
            </button>
          )}
          {onSaveDraft && !suggested && (
            <button
              type="button"
              onClick={() => {
                const d = draftNow();
                if (d) onSaveDraft(d);
              }}
              className="w-full py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-400 rounded-lg"
            >
              Save as draft
            </button>
          )}
        </form>
      </div>
      {pickerOpen && (
        <TestPickerDialog
          groups={[
            { label: businesses.length === 1 ? 'Your tests' : `${business?.name}'s tests`, list: companyTests },
            { label: 'Granyt tests', list: vetterTests },
          ].filter((g) => g.list.length > 0)}
          allTests={tests}
          isPicked={(t) => !!picked[t.id]}
          onToggle={(t) => togglePick(t.id)}
          onClose={() => setPickerOpen(false)}
          onBuildWithAI={
            onBuildWithAI
              ? () => {
                  const d = draftNow();
                  setPickerOpen(false);
                  if (d) onBuildWithAI(d);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
