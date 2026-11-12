import React, { useState } from 'react';
import { AssessmentTest, Business, JobPosting, isPublic, levelName } from '../types';
import { CITIES } from '../lib/geo';
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, formatSalaryRange } from '../lib/jobFilters';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { SectorSelect } from './SectorPicker';
import { SectorId } from '../lib/sectors';
import { isMainVersion, levelsOf, versionTitle } from '../lib/testLevels';
import { aiFetch } from '../lib/aiRequest';
import { Suggestion, matchExisting } from '../lib/testGeneration';

interface JobFormProps {
  // The companies the job can be posted for: a company posts for itself, the Vetter team for any company
  businesses: Business[];
  postedBy: NonNullable<JobPosting['postedBy']>;
  tests: AssessmentTest[];
  onSave: (job: JobPosting) => void;
  onCancel: () => void;
  // Tests to start with, already ticked (e.g. from a test plan), by the version to use
  initialTestIds?: string[];
}

const inputClass =
  'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

// The one job form, used by companies and by the Vetter team
export const JobForm: React.FC<JobFormProps> = ({ businesses, postedBy, tests, onSave, onCancel, initialTestIds = [] }) => {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? '');
  const business = businesses.find((b) => b.id === businessId) ?? businesses[0];
  const companyTests = tests.filter((t) => t.type === 'custom' && t.businessId === business?.id && t.purpose !== 'training');
  // Each Vetter test once; its level is chosen when it's ticked
  const vetterTests = tests.filter((t) => isPublic(t) && isMainVersion(t) && t.businessId !== business?.id);

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Core Engineering');
  // Starts in the company's sector; a job can be listed under another
  const [pickedSector, setSector] = useState<SectorId | ''>('');
  const sector = pickedSector || business?.sector || '';
  // Every field the job board filters on is asked for here, so new jobs filter like the seeded ones
  const [location, setLocation] = useState(CITIES[business?.headquarters ?? ''] ? business!.headquarters : 'San Francisco, CA');
  const [workType, setWorkType] = useState<JobPosting['workType']>('Remote');
  const [salaryMin, setSalaryMin] = useState(170000);
  const [salaryMax, setSalaryMax] = useState(210000);
  const [employmentType, setEmploymentType] = useState<NonNullable<JobPosting['employmentType']>>('Full-time');
  const [experience, setExperience] = useState(EXPERIENCE_LEVELS[2]);
  const [description, setDescription] = useState('');
  // The tests candidates are ranked on, by main version: the level picked, its minimum score and importance
  type Pick = { testId: string; minScore: number; importance: 'required' | 'preferred' };
  // Keyed by the test's main version, as the list below is
  const [picked, setPicked] = useState<Record<string, Pick>>(() =>
    Object.fromEntries(
      initialTestIds.flatMap((id) => {
        const t = tests.find((x) => x.id === id);
        return t ? [[t.familyId ?? t.id, { testId: t.id, minScore: 70, importance: 'required' as const }]] : [];
      })
    )
  );
  const [pickError, setPickError] = useState(false);
  const pickedTests = Object.values(picked)
    .map((p) => tests.find((t) => t.id === p.testId))
    .filter((t): t is AssessmentTest => !!t);
  const pickFor = (testId: string) => Object.values(picked).find((p) => p.testId === testId)!;

  const togglePick = (testId: string) => {
    setPickError(false);
    setPicked((prev) => {
      const { [testId]: wasPicked, ...rest } = prev;
      return wasPicked ? rest : { ...prev, [testId]: { testId, minScore: 70, importance: 'required' } };
    });
  };
  const updatePick = (testId: string, change: Partial<Pick>) => {
    setPicked((prev) => ({ ...prev, [testId]: { ...prev[testId], ...change } }));
  };
  // Posting first asks Vetter's AI which tests fit the job description, and the company says whether to include them.
  // Asked once per title and description, so posting again after answering doesn't ask again
  const [suggested, setSuggested] = useState<Suggestion[] | null>(null);
  const [include, setInclude] = useState<string[]>([]);
  const [askedFor, setAskedFor] = useState('');
  const [asking, setAsking] = useState(false);
  const [passingScore, setPassingScore] = useState<number>(70);
  const [requireTest, setRequireTest] = useState<boolean>(true);

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
    const next = add ? { ...picked, ...Object.fromEntries(include.map((id) => [id, { testId: id, minScore: 70, importance: 'required' as const }])) } : picked;
    setPicked(next);
    setSuggested(null);
    post(next);
  };

  const post = (picks: Record<string, Pick>) => {
    const pickedTests = Object.values(picks)
      .map((p) => tests.find((t) => t.id === p.testId))
      .filter((t): t is AssessmentTest => !!t);
    const pickFor = (testId: string) => Object.values(picks).find((p) => p.testId === testId)!;
    if (!business) return;
    if (pickedTests.length === 0) {
      setPickError(true);
      return;
    }
    onSave({
      id: `job-${Date.now()}`,
      title: title.trim(),
      companyName: business.name,
      companyLogo: business.logo,
      businessId: business.id,
      postedBy,
      location,
      workType,
      salaryRange: formatSalaryRange(salaryMin, salaryMax),
      description: description || `We are hiring a ${title.trim()} to join ${business.name}.`,
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
        minScore: pickFor(t.id).minScore,
        importance: pickFor(t.id).importance,
        weight: Math.round((1 / pickedTests.length) * 100) / 100,
      })),
      testIds: pickedTests.map((t) => t.id),
      testPassingScore: passingScore,
      testsRequired: requireTest,
      invitations: [],
      applicantCount: 0,
      status: 'active',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">
            {businesses.length === 1 ? `Post a Job at ${business?.name}` : 'Post a Job for a Company'}
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
              <p className="text-[11px] text-slate-500 mt-1">The job is listed under this company, marked as posted by Vetter.</p>
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

          <div>
            <label htmlFor="job-sector" className="block text-xs font-semibold text-slate-700 mb-1">Sector</label>
            <SectorSelect id="job-sector" required value={sector} onChange={setSector} className={`${inputClass} font-medium`} />
            <p className="text-[11px] text-slate-500 mt-1">Candidates browsing this sector see the job.</p>
          </div>

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

          {/* The tests this job ranks candidates on */}
          <fieldset className={`p-3 border rounded-xl space-y-3 ${pickError ? 'border-slate-300 bg-indigo-50' : 'border-indigo-200 bg-indigo-50/50'}`}>
            <legend className="px-1 text-xs font-bold text-indigo-900">Tests for this job</legend>
            <p className="text-[11px] text-slate-600 -mt-1">
              Tick the tests that matter for the role. Candidates are ranked on their scores in them.
            </p>
            {pickError && <p className="text-[11px] font-semibold text-slate-800">Pick at least one test.</p>}

            {[
              { label: businesses.length === 1 ? 'Your tests' : `${business?.name}'s tests`, list: companyTests },
              { label: 'Vetter tests', list: vetterTests },
            ]
              .filter((g) => g.list.length > 0)
              .map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{group.label}</div>
                  <ul className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {group.list.map((t) => {
                      const pick = picked[t.id];
                      return (
                        <li key={t.id} className="px-3 py-2">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input type="checkbox" checked={!!pick} onChange={() => togglePick(t.id)} className="mt-0.5 accent-indigo-600" />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold text-slate-900">{t.title}</span>
                              <span className="block text-[11px] text-slate-500">
                                {t.category} &middot;{' '}
                                {levelsOf(t, tests).length > 1 ? `${levelsOf(t, tests).length} levels` : t.difficulty}
                                {t.roles?.length ? ` · ${t.roles.join(', ')}` : ''}
                              </span>
                            </span>
                          </label>
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
                              <label className="flex items-center gap-1.5 text-slate-700">
                                <span>Min score</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={pick.minScore}
                                  onChange={(e) => updatePick(t.id, { minScore: Number(e.target.value) })}
                                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                                />
                              </label>
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
                </div>
              ))}

            {/* The picked tests are the job's tests: an average pass mark, and whether candidates must pass them to apply */}
            <div className="flex flex-wrap items-end gap-4 pt-1">
              <div className="w-28">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pass mark{pickedTests.length > 1 ? ' (average)' : ''}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
                />
              </div>
              <label className="flex items-center gap-1.5 py-1.5 text-xs text-indigo-800 font-medium cursor-pointer">
                <input type="checkbox" checked={requireTest} onChange={(e) => setRequireTest(e.target.checked)} className="accent-indigo-600" />
                <span>Required to apply (otherwise recommended)</span>
              </label>
            </div>
          </fieldset>

          {suggested ? (
            // Vetter's suggestions from the job description: the company decides whether they go on the job
            <div className="p-3 border border-indigo-200 bg-indigo-50 rounded-xl space-y-2.5" role="dialog" aria-label="Suggested tests">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-800">
                  <span className="font-semibold">Vetter read your job description and suggests {suggested.length === 1 ? 'this test' : 'these tests'}.</span>{' '}
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
        </form>
      </div>
    </div>
  );
};
