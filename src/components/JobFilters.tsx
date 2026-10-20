import React from 'react';
import { JobPosting } from '../types';
import { CITIES } from '../lib/geo';
import { JobFilterState, MAX_RADIUS, MAX_SALARY } from '../lib/jobFilters';
import { Search } from 'lucide-react';

interface JobFiltersProps {
  jobs: JobPosting[];
  filters: JobFilterState;
  onChange: (filters: JobFilterState) => void;
  onClear: () => void;
  activeCount: number;
}

const WORK_TYPES: JobPosting['workType'][] = ['Remote', 'Hybrid', 'On-site'];

const POSTED_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Any time', days: null },
  { label: 'Past 24 hours', days: 1 },
  { label: 'Past week', days: 7 },
  { label: 'Past month', days: 30 },
];

const formatSalary = (n: number) => (n === 0 ? 'Any' : `$${Math.round(n / 1000)}k+`);
const formatRadius = (miles: number) => (miles >= MAX_RADIUS ? 'Any distance' : `Within ${miles} mi`);

const uniqueSorted = (values: (string | undefined)[]) =>
  Array.from(new Set(values.filter((v): v is string => !!v))).sort();

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div role="group" aria-label={title} className="py-4 border-t border-slate-100 space-y-2.5">
    <h3 className="text-xs font-bold text-slate-900">{title}</h3>
    {children}
  </div>
);

const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; count?: number }> = ({
  label,
  checked,
  onChange,
  count,
}) => (
  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-indigo-600" />
    <span className="flex-1">{label}</span>
    {count !== undefined && <span className="text-[11px] text-slate-400 font-mono tabular-nums">{count}</span>}
  </label>
);

export const JobFilters: React.FC<JobFiltersProps> = ({ jobs, filters, onChange, onClear, activeCount }) => {
  const set = <K extends keyof JobFilterState>(key: K, value: JobFilterState[K]) => onChange({ ...filters, [key]: value });
  const toggle = <K extends 'categories' | 'workTypes' | 'employmentTypes' | 'experienceLevels' | 'companies'>(
    key: K,
    value: JobFilterState[K][number],
    on: boolean
  ) => {
    const current = filters[key] as string[];
    set(key, (on ? [...current, value] : current.filter((v) => v !== value)) as JobFilterState[K]);
  };

  const checkboxGroup = (
    key: 'categories' | 'employmentTypes' | 'experienceLevels' | 'companies',
    values: string[],
    countOf: (value: string) => number
  ) =>
    values.map((value) => (
      <Checkbox
        key={value}
        label={value}
        checked={(filters[key] as string[]).includes(value)}
        onChange={(on) => toggle(key, value, on)}
        count={countOf(value)}
      />
    ));

  const sliderClass = 'w-full accent-indigo-600 cursor-grab active:cursor-grabbing';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-900">
          Filters
          {activeCount > 0 && <span className="ml-1.5 text-[11px] font-mono text-indigo-700">({activeCount})</span>}
        </h2>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-[11px] font-semibold text-indigo-700 hover:underline">
            Clear all
          </button>
        )}
      </div>

      <Section title="Keyword">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Title, company, skill..."
            value={filters.keyword}
            onChange={(e) => set('keyword', e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </Section>

      <Section title="Location">
        <select
          value={filters.location}
          onChange={(e) => set('location', e.target.value)}
          aria-label="Search from"
          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
        >
          {Object.keys(CITIES)
            .sort()
            .map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
        </select>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Search radius</span>
            <span className="font-semibold text-slate-800">{formatRadius(filters.radius)}</span>
          </div>
          <input
            type="range"
            min={10}
            max={MAX_RADIUS}
            step={10}
            value={filters.radius}
            onChange={(e) => set('radius', Number(e.target.value))}
            aria-label="Search radius in miles"
            aria-valuetext={formatRadius(filters.radius)}
            className={sliderClass}
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>10 mi</span>
            <span>Any</span>
          </div>
        </div>
        <Checkbox label="Include remote jobs anywhere" checked={filters.includeRemote} onChange={(on) => set('includeRemote', on)} />
      </Section>

      <Section title="Minimum salary">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Pays up to at least</span>
            <span className="font-semibold text-slate-800 font-mono">{formatSalary(filters.minSalary)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={MAX_SALARY}
            step={10000}
            value={filters.minSalary}
            onChange={(e) => set('minSalary', Number(e.target.value))}
            aria-label="Minimum salary"
            aria-valuetext={formatSalary(filters.minSalary)}
            className={sliderClass}
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Any</span>
            <span>$300k</span>
          </div>
        </div>
      </Section>

      <Section title="Category">
        {checkboxGroup('categories', uniqueSorted(jobs.map((j) => j.department)), (v) => jobs.filter((j) => j.department === v).length)}
      </Section>

      <Section title="Work type">
        {WORK_TYPES.map((type) => (
          <Checkbox
            key={type}
            label={type}
            checked={filters.workTypes.includes(type)}
            onChange={(on) => toggle('workTypes', type, on)}
            count={jobs.filter((j) => j.workType === type).length}
          />
        ))}
      </Section>

      <Section title="Experience level">
        {checkboxGroup(
          'experienceLevels',
          uniqueSorted(jobs.map((j) => j.experienceLevel)),
          (v) => jobs.filter((j) => j.experienceLevel === v).length
        )}
      </Section>

      <Section title="Job type">
        {checkboxGroup(
          'employmentTypes',
          uniqueSorted(jobs.map((j) => j.employmentType)),
          (v) => jobs.filter((j) => j.employmentType === v).length
        )}
      </Section>

      <Section title="Company">
        {checkboxGroup('companies', uniqueSorted(jobs.map((j) => j.companyName)), (v) => jobs.filter((j) => j.companyName === v).length)}
      </Section>

      <Section title="Date posted">
        {POSTED_OPTIONS.map((option) => (
          <label key={option.label} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="posted-within"
              checked={filters.postedWithinDays === option.days}
              onChange={() => set('postedWithinDays', option.days)}
              className="accent-indigo-600"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </Section>

      <Section title="More">
        <Checkbox label="Has a test attached" checked={filters.hasTest} onChange={(on) => set('hasTest', on)} />
        <Checkbox
          label="I meet the required skills"
          checked={filters.meetsRequirements}
          onChange={(on) => set('meetsRequirements', on)}
        />
        <Checkbox label="Hide jobs I've applied to" checked={filters.hideApplied} onChange={(on) => set('hideApplied', on)} />
      </Section>
    </div>
  );
};
