import { Business, CandidateJobMatch, JobPosting } from '../types';
import { CITIES, distanceMiles } from './geo';

export const MAX_RADIUS = 500; // miles; the slider's top end means "any distance"
export const MAX_SALARY = 300000;

// The values a job can take for each filter, so every job lands in a filter option
export const EMPLOYMENT_TYPES: NonNullable<JobPosting['employmentType']>[] = ['Full-time', 'Part-time', 'Contract', 'Internship'];
export const EXPERIENCE_LEVELS = [
  'Junior (0-2 years)',
  'Mid (3+ years)',
  'Senior (5+ years)',
  'Lead (7+ years)',
  'Staff (8+ years)',
];
export const NOT_SPECIFIED = 'Not specified';

// 165000, 195000 → "$165,000 - $195,000"
export const formatSalaryRange = (min: number, max: number) =>
  `$${min.toLocaleString('en-US')} - $${max.toLocaleString('en-US')}`;

/**
 * Fills in anything the filters need that a job is missing. Jobs created before the form asked
 * for these (location defaulted to "Remote", no experience level) are placed at the company's HQ
 * and marked "Not specified" rather than dropping out of every filter.
 */
export function withFilterFields(job: JobPosting, business?: Business): JobPosting {
  const fallbackCity = business && CITIES[business.headquarters] ? business.headquarters : 'San Francisco, CA';
  return {
    ...job,
    location: CITIES[job.location] ? job.location : fallbackCity,
    department: job.department?.trim() || 'General',
    employmentType: job.employmentType ?? 'Full-time',
    experienceLevel: job.experienceLevel || NOT_SPECIFIED,
  };
}

export interface JobFilterState {
  keyword: string;
  location: string;
  radius: number; // MAX_RADIUS = any distance
  includeRemote: boolean; // Remote jobs match whatever the distance
  categories: string[]; // departments
  workTypes: JobPosting['workType'][];
  employmentTypes: string[];
  experienceLevels: string[];
  companies: string[];
  minSalary: number;
  postedWithinDays: number | null;
  hasTest: boolean;
  meetsRequirements: boolean;
  hideApplied: boolean;
}

export const defaultJobFilters = (location: string): JobFilterState => ({
  keyword: '',
  location,
  radius: MAX_RADIUS,
  includeRemote: true,
  categories: [],
  workTypes: [],
  employmentTypes: [],
  experienceLevels: [],
  companies: [],
  minSalary: 0,
  postedWithinDays: null,
  hasTest: false,
  meetsRequirements: false,
  hideApplied: false,
});

// "$165,000 - $195,000" → { min: 165000, max: 195000 }
export function parseSalaryRange(range: string): { min: number; max: number } | undefined {
  const numbers = (range.match(/\d[\d,.]*\s*[kK]?/g) ?? []).map((n) => {
    const value = parseFloat(n.replace(/,/g, ''));
    return /k/i.test(n) ? value * 1000 : value;
  });
  if (numbers.length === 0) return undefined;
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

const daysSince = (date: string, now: Date) => (now.getTime() - new Date(`${date}T00:00:00`).getTime()) / 86400000;

export function jobMatchesFilters(
  job: JobPosting,
  match: CandidateJobMatch,
  filters: JobFilterState,
  appliedJobIds: string[],
  now = new Date()
): boolean {
  const q = filters.keyword.trim().toLowerCase();
  if (
    q &&
    ![job.title, job.companyName, job.department, job.location, ...job.requirements.map((r) => r.skillName)].some((f) =>
      f.toLowerCase().includes(q)
    )
  ) {
    return false;
  }

  if (filters.radius < MAX_RADIUS && !(filters.includeRemote && job.workType === 'Remote')) {
    const miles = distanceMiles(filters.location, job.location);
    // A job in a city we can't place can't be shown as within the radius
    if (miles === undefined || miles > filters.radius) return false;
  }

  if (filters.categories.length > 0 && !filters.categories.includes(job.department)) return false;
  if (filters.workTypes.length > 0 && !filters.workTypes.includes(job.workType)) return false;
  if (filters.employmentTypes.length > 0 && !filters.employmentTypes.includes(job.employmentType ?? '')) return false;
  if (filters.experienceLevels.length > 0 && !filters.experienceLevels.includes(job.experienceLevel ?? '')) return false;
  if (filters.companies.length > 0 && !filters.companies.includes(job.companyName)) return false;

  if (filters.minSalary > 0) {
    const salary = parseSalaryRange(job.salaryRange);
    if (!salary || salary.max < filters.minSalary) return false;
  }

  if (filters.postedWithinDays !== null && daysSince(job.postedDate, now) > filters.postedWithinDays) return false;
  if (filters.hasTest && !job.attachedTestId) return false;
  if (filters.meetsRequirements && !match.meetsAllHardRequirements) return false;
  if (filters.hideApplied && appliedJobIds.includes(job.id)) return false;
  return true;
}

// How many filters differ from the defaults, for the "Clear all" badge
export function countActiveFilters(filters: JobFilterState, defaults: JobFilterState): number {
  return [
    filters.keyword.trim() !== '',
    filters.radius !== defaults.radius || filters.location !== defaults.location,
    filters.categories.length > 0,
    filters.workTypes.length > 0,
    filters.employmentTypes.length > 0,
    filters.experienceLevels.length > 0,
    filters.companies.length > 0,
    filters.minSalary > 0,
    filters.postedWithinDays !== null,
    filters.hasTest,
    filters.meetsRequirements,
    filters.hideApplied,
  ].filter(Boolean).length;
}
