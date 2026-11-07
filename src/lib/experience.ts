import { ProfileLink, WorkExperience } from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2023-04" as "Apr 2023"
export const monthLabel = (ym?: string) => {
  if (!ym) return 'Now';
  const [y, m] = ym.split('-').map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
};

// How long a job lasted: "2 yrs 3 mos", "8 mos"
export const duration = (start: string, end?: string) => {
  const [sy, sm] = start.split('-').map(Number);
  const now = new Date();
  const [ey, em] = end ? end.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const months = Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} ${y === 1 ? 'yr' : 'yrs'}`, m && `${m} ${m === 1 ? 'mo' : 'mos'}`].filter(Boolean).join(' ');
};

// Most recent first: current jobs, then by when they ended, then started
export const sortExperience = (items: WorkExperience[]) =>
  [...items].sort((a, b) => (b.end ?? '9999').localeCompare(a.end ?? '9999') || b.start.localeCompare(a.start));

// Only web links are shown or saved, so a profile can't carry a javascript: or data: link
export const safeUrl = (url: string) => {
  const u = url.trim();
  const withScheme = /^[a-z]+:/i.test(u) ? u : `https://${u}`;
  try {
    const parsed = new URL(withScheme);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

// A link's label from its address when they didn't give one
export const linkLabel = (link: ProfileLink) => {
  if (link.label.trim()) return link.label.trim();
  try {
    const host = new URL(link.url).hostname.replace(/^www\./, '');
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('github')) return 'GitHub';
    return host;
  } catch {
    return 'Link';
  }
};
