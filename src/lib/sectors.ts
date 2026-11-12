import { AssessmentTest, JobPosting, SkillCategory } from '../types';
import type { Course } from '../data/courses';
import { ROLE_GROUPS } from './testRoles';

/**
 * The sector a candidate picks at the top of the page. Every list they browse (tests, jobs, leaderboards, the Home
 * feed, courses) narrows to it; 'all' shows everything. A sector with nothing in it yet still shows, with an empty list
 */
export type SectorId = 'all' | 'tech' | 'business' | 'marketing' | 'healthcare' | 'retail' | 'hospitality' | 'trades';

export const SECTORS: { id: SectorId; label: string }[] = [
  { id: 'all', label: 'All sectors' },
  { id: 'tech', label: 'Tech' },
  { id: 'business', label: 'Business & Finance' },
  { id: 'marketing', label: 'Marketing & Sales' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'retail', label: 'Retail' },
  { id: 'hospitality', label: 'Hospitality' },
  { id: 'trades', label: 'Trades' },
];

// The sectors a company or job can be in: every one but All
export const PICKABLE_SECTORS = SECTORS.filter((s) => s.id !== 'all');

export const sectorLabel = (id: SectorId) => SECTORS.find((s) => s.id === id)?.label ?? 'All sectors';

const CATEGORY_SECTOR: Record<SkillCategory, SectorId> = {
  Databases: 'tech',
  Algorithms: 'tech',
  'System Architecture': 'tech',
  Frontend: 'tech',
  'Backend APIs': 'tech',
  'Data Analysis': 'tech',
  'Quality Assurance': 'tech',
  'Software Development': 'tech',
  'Data Science': 'tech',
  'Cyber Security': 'tech',
  'AI Engineering': 'tech',
  Consulting: 'business',
  Finance: 'business',
  'Project Management': 'business',
  'AI Strategy': 'business',
  Marketing: 'marketing',
  Sales: 'marketing',
  Healthcare: 'healthcare',
  Trades: 'trades',
  Hospitality: 'hospitality',
  Retail: 'retail',
};

// The Tests page's industries
const INDUSTRY_SECTOR: Record<string, SectorId> = {
  'Software Engineering': 'tech',
  AI: 'tech',
  'Data & Analytics': 'tech',
  'Cyber Security': 'tech',
  'Consulting & Business': 'business',
  'Finance & Accounting': 'business',
  Operations: 'business',
  'Marketing & Sales': 'marketing',
  Healthcare: 'healthcare',
  Trades: 'trades',
  Hospitality: 'hospitality',
  Retail: 'retail',
};

const COURSE_SECTOR: Record<string, SectorId> = {
  AI: 'tech',
  Data: 'tech',
  Software: 'tech',
  Cybersecurity: 'tech',
  Design: 'tech',
  Accounting: 'business',
  Law: 'business',
  HR: 'business',
  Management: 'business',
  Consulting: 'business',
  Sales: 'marketing',
  Marketing: 'marketing',
  Healthcare: 'healthcare',
};

// Words in a job's title or department that place it, for jobs whose tests don't
const JOB_WORDS: [SectorId, RegExp][] = [
  ['trades', /\b(electric|plumb|carpent|joiner|mechanic|welder|weld|hvac|roofer|brick|plaster|tiler|decorator|technician|apprentice|construction|site)/i],
  ['hospitality', /\b(caf[eé]|barista|chef|cook|kitchen|restaurant|waiter|waitress|bar staff|bartender|hotel|hospitality|housekeep|front of house)/i],
  ['retail', /\b(retail|store|shop|cashier|merchandis|stock|sales assistant|checkout|till)/i],
  ['healthcare', /\b(nurse|nursing|care|clinic|health|medical|doctor|pharma|dental|patient)/i],
  ['marketing', /\b(marketing|sales|growth|brand|seo|content|account executive|business development)/i],
  ['business', /\b(financ|account|consult|analyst|operations|project|legal|law|hr|people|recruit)/i],
  ['tech', /\b(engineer|developer|software|data|platform|infrastructure|devops|security|ai|ml|product|design|frontend|backend|qa)/i],
];

// Hands-on work that tests made before these sectors had categories were filed under an office or tech one by mistake
// (an electrical test under Software Development, say): their title or roles put them right
const HANDS_ON_WORDS: [SectorId, RegExp][] = [
  ['trades', /\b(electric(al|ian)?|wiring|consumer unit|eicr|bs ?7671|18th edition|plumb(er|ing)?|heating engineer|gas safe|joiner|carpent(er|ry)|mechanic|vehicle|welder|welding|hvac|roofer|roofing|bricklay(er|ing)|plaster(er|ing)|tiler|tiling|decorat(or|ing))\b/i],
  ['hospitality', /\b(barista|chef|kitchen|restaurant|waiter|waitress|bartender|front of house|caf[eé]|hotel|housekeeping)\b/i],
  ['retail', /\b(retail|shop floor|cashier|checkout|sales assistant|merchandis(er|ing))\b/i],
];

// A test's sector: the trades, hospitality or retail when its title or roles say it's that hands-on work, else its category's
export const testSector = (test: AssessmentTest): SectorId => {
  const own = CATEGORY_SECTOR[test.category];
  if (own && own !== 'tech' && own !== 'business' && own !== 'marketing') return own;
  const text = `${test.title} ${(test.roles ?? []).join(' ')}`;
  return HANDS_ON_WORDS.find(([, re]) => re.test(text))?.[0] ?? own ?? 'tech';
};

export const industrySector = (industry: string): SectorId | undefined => INDUSTRY_SECTOR[industry];

export const inSector = (sector: SectorId, s: SectorId | undefined) => sector === 'all' || s === sector;

export const testInSector = (sector: SectorId) => (test: AssessmentTest) => inSector(sector, testSector(test));

export const industryInSector = (sector: SectorId) => (industry: string) => inSector(sector, industrySector(industry));

// The sectors a role belongs to, through the industries it's listed under
export const roleInSector = (sector: SectorId) => (role: string) =>
  sector === 'all' || ROLE_GROUPS.some((g) => g.roles.includes(role as never) && industrySector(g.industry) === sector);

export const courseInSector = (sector: SectorId) => (course: Course) => inSector(sector, COURSE_SECTOR[course.category]);

// A job's sector: the one its company picked for it, else the one most of its tests are in, else its title and department's
export function jobSector(job: JobPosting, tests: AssessmentTest[]): SectorId | undefined {
  if (job.sector && job.sector !== 'all') return job.sector;
  const counts = new Map<SectorId, number>();
  for (const id of job.testIds) {
    const test = tests.find((t) => t.id === id);
    if (test) counts.set(testSector(test), (counts.get(testSector(test)) ?? 0) + 1);
  }
  if (counts.size) return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const text = `${job.title} ${job.department}`;
  return JOB_WORDS.find(([, re]) => re.test(text))?.[0];
}

export const jobInSector = (sector: SectorId, tests: AssessmentTest[]) => (job: JobPosting) => inSector(sector, jobSector(job, tests));

const STORAGE_KEY = 'vetter.sector';

export function loadSector(): SectorId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SECTORS.some((s) => s.id === saved) ? (saved as SectorId) : 'all';
  } catch {
    return 'all';
  }
}

export function saveSector(sector: SectorId) {
  try {
    localStorage.setItem(STORAGE_KEY, sector);
  } catch {
    // Private windows can refuse storage; the choice then lasts for this visit
  }
}
