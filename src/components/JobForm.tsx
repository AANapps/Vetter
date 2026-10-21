import React, { useState } from 'react';
import { AssessmentTest, Business, JobPosting } from '../types';
import { CITIES } from '../lib/geo';
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, formatSalaryRange } from '../lib/jobFilters';
import { Plus } from 'lucide-react';

interface JobFormProps {
  // The companies the job can be posted for: a company posts for itself, the Vetter team for any company
  businesses: Business[];
  postedBy: NonNullable<JobPosting['postedBy']>;
  tests: AssessmentTest[];
  onSave: (job: JobPosting) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500';

// The one job form, used by companies and by the Vetter team
export const JobForm: React.FC<JobFormProps> = ({ businesses, postedBy, tests, onSave, onCancel }) => {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? '');
  const business = businesses.find((b) => b.id === businessId) ?? businesses[0];
  const companyTests = tests.filter((t) => t.type === 'custom' && t.businessId === business?.id);
  const vetterTests = tests.filter((t) => t.type === 'standard');

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Core Engineering');
  // Every field the job board filters on is asked for here, so new jobs filter like the seeded ones
  const [location, setLocation] = useState(CITIES[business?.headquarters ?? ''] ? business!.headquarters : 'San Francisco, CA');
  const [workType, setWorkType] = useState<JobPosting['workType']>('Remote');
  const [salaryMin, setSalaryMin] = useState(170000);
  const [salaryMax, setSalaryMax] = useState(210000);
  const [employmentType, setEmploymentType] = useState<NonNullable<JobPosting['employmentType']>>('Full-time');
  const [experience, setExperience] = useState(EXPERIENCE_LEVELS[2]);
  const [description, setDescription] = useState('');
  const [skills] = useState<JobPosting['requirements']>([
    { skillId: 'skill-sys', skillName: 'System Architecture', minScore: 80, importance: 'required', weight: 0.5 },
    { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 75, importance: 'required', weight: 0.3 },
    { skillId: 'skill-sql', skillName: 'SQL & Databases', minScore: 70, importance: 'preferred', weight: 0.2 },
  ]);
  const [attachedTestId, setAttachedTestId] = useState<string>((companyTests[0] ?? vetterTests[0])?.id || '');
  const [passingScore, setPassingScore] = useState<number>(80);
  const [requireTest, setRequireTest] = useState<boolean>(true);

  const changeBusiness = (id: string) => {
    setBusinessId(id);
    const next = businesses.find((b) => b.id === id);
    if (next && CITIES[next.headquarters]) setLocation(next.headquarters);
    // Another company's own test can't be attached
    if (tests.some((t) => t.id === attachedTestId && t.type === 'custom')) setAttachedTestId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !title.trim() || !department.trim() || salaryMax < salaryMin) return;
    const attachedTest = [...companyTests, ...vetterTests].find((t) => t.id === attachedTestId);

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
      postedDate: new Date().toISOString().split('T')[0],
      employmentType,
      experienceLevel: experience,
      closingDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      requirements: skills,
      attachedTestId: attachedTest?.id,
      attachedTestTitle: attachedTest?.title,
      attachedTestPassingScore: attachedTest ? passingScore : undefined,
      isAttachedTestMandatory: attachedTest ? requireTest : undefined,
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

          {/* Attach a test to this job */}
          <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">Attach a Test</span>
              <label
                className={`flex items-center gap-1.5 text-xs text-indigo-800 font-medium cursor-pointer ${
                  attachedTestId ? '' : 'opacity-40 pointer-events-none'
                }`}
              >
                <input
                  type="checkbox"
                  checked={requireTest}
                  onChange={(e) => setRequireTest(e.target.checked)}
                  className="rounded text-indigo-600 accent-indigo-600"
                />
                <span>Required to apply</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Test</label>
                <select
                  value={attachedTestId}
                  onChange={(e) => setAttachedTestId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium"
                >
                  <option value="">No test</option>
                  {companyTests.length > 0 && (
                    <optgroup label={businesses.length === 1 ? 'Your tests' : `${business?.name}'s tests`}>
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
                  disabled={!attachedTestId}
                  min={60}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
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
  );
};
