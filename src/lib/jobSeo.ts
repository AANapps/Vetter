import { Business, JobPosting } from '../types';

/**
 * What search engines and AI assistants see of a job: its address, its schema.org JobPosting (what
 * Google for Jobs reads) and its description. Shared by the app and the build step that writes a
 * static page for every job, so the two always agree.
 */

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// A job lives at /jobs/<title>-<company>-<id>/, like /jobs/senior-data-engineer-fintech-core-job-001/
export const jobSlug = (job: JobPosting) => `${slugify(`${job.title} ${job.companyName}`)}-${job.id}`;
export const jobPath = (job: JobPosting) => `/jobs/${jobSlug(job)}/`;

// The job id in a /jobs/... path; ids are always job-<number>, so the words before it don't matter
export function jobIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/jobs\/(?:[^/]*-)?(job-\d+)\/?$/);
  return match ? match[1] : null;
}

export const isJobsIndexPath = (pathname: string) => /^\/jobs\/?$/.test(pathname);

// Only open jobs are offered to search engines; Google asks that filled or closed ones are taken down
export const isListable = (job: JobPosting, today = new Date().toISOString().split('T')[0]) =>
  job.status === 'active' && (!job.closingDate || job.closingDate >= today);

export const jobPageTitle = (job: JobPosting) => `${job.title} job at ${job.companyName} in ${job.location} | Vetter`;

export function jobMetaDescription(job: JobPosting): string {
  const facts = [job.employmentType, job.workType, job.salaryRange].filter(Boolean).join(', ');
  const text = `${job.companyName} is hiring a ${job.title} in ${job.location} (${facts}). ${job.description}`;
  return text.length > 160 ? `${text.slice(0, 157).replace(/\s+\S*$/, '')}...` : text;
}

const NON_US_SUFFIXES: Record<string, string> = { UK: 'GB', GB: 'GB', DE: 'DE', NL: 'NL', PT: 'PT', IN: 'IN', SG: 'SG', NG: 'NG', AU: 'AU', IE: 'IE', FR: 'FR', ES: 'ES' };
// "CA" is both California and Canada
const CANADIAN_CITIES = new Set(['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary']);

// "San Francisco, CA" -> San Francisco, CA, US; "London, UK" -> London, GB
export function placeOf(location: string): { locality: string; region?: string; country: string } {
  const [locality, suffix = ''] = location.split(',').map((s) => s.trim());
  if (suffix === 'CA' && CANADIAN_CITIES.has(locality)) return { locality, country: 'CA' };
  if (NON_US_SUFFIXES[suffix]) return { locality, country: NON_US_SUFFIXES[suffix] };
  return { locality, region: suffix || undefined, country: 'US' };
}

const CURRENCIES: Record<string, string> = { $: 'USD', '£': 'GBP', '€': 'EUR' };

// "$165,000 - $195,000" -> 165000 to 195000 USD a year
export function salaryOf(range: string) {
  const match = range.match(/([$£€])\s?([\d,.]+)\s*(k)?(?:\s*[-–]\s*[$£€]?\s?([\d,.]+)\s*(k)?)?/i);
  if (!match) return undefined;
  const amount = (n: string, k?: string) => parseFloat(n.replace(/,/g, '')) * (k ? 1000 : 1);
  const min = amount(match[2], match[3]);
  const max = match[4] ? amount(match[4], match[5]) : undefined;
  const unitText = /hour|\/hr/i.test(range) || (max ?? min) < 500 ? 'HOUR' : /month/i.test(range) ? 'MONTH' : 'YEAR';
  return { currency: CURRENCIES[match[1]], min, max, unitText };
}

const EMPLOYMENT_TYPES: Record<NonNullable<JobPosting['employmentType']>, string> = {
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  Contract: 'CONTRACTOR',
  Internship: 'INTERN',
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const listHtml = (heading: string, items?: string[]) =>
  items?.length ? `<h2>${escapeHtml(heading)}</h2><ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '';

// The full listing as HTML, for the JobPosting's description and the static page
export function jobDescriptionHtml(job: JobPosting): string {
  const skills = job.requirements.map((r) => `${r.skillName} (${r.importance}, score ${r.minScore}+)`);
  const test = job.attachedTestTitle
    ? `<h2>How to apply</h2><p>Apply on Vetter${job.isAttachedTestMandatory ? ' by taking' : '. You can also take'} the ${escapeHtml(job.attachedTestTitle)} skills test${job.attachedTestPassingScore ? ` (pass mark ${job.attachedTestPassingScore}/100)` : ''}. Your verified score goes straight to ${escapeHtml(job.companyName)}.</p>`
    : '';
  return [
    `<p>${escapeHtml(job.description)}</p>`,
    listHtml('Responsibilities', job.responsibilities),
    listHtml('Qualifications', job.qualifications),
    listHtml('Nice to have', job.niceToHave),
    listHtml('Skills assessed', skills),
    listHtml('Benefits', job.benefits),
    test,
  ].join('');
}

// schema.org JobPosting: https://developers.google.com/search/docs/appearance/structured-data/job-posting
export function jobPostingJsonLd(job: JobPosting, siteUrl: string, business?: Business) {
  const place = placeOf(job.location);
  const salary = salaryOf(job.salaryRange);
  const years = job.experienceLevel?.match(/(\d+)\s*(?:\+|[-–]\s*\d+)?\s*years?/i);
  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: jobDescriptionHtml(job),
    identifier: { '@type': 'PropertyValue', name: job.companyName, value: job.id },
    datePosted: job.postedDate,
    ...(job.closingDate && { validThrough: `${job.closingDate}T23:59:59` }),
    ...(job.employmentType && { employmentType: EMPLOYMENT_TYPES[job.employmentType] }),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyName,
      ...(business?.websiteUrl && { sameAs: business.websiteUrl }),
      ...(job.companyLogo && { logo: job.companyLogo }),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: place.locality,
        ...(place.region && { addressRegion: place.region }),
        addressCountry: place.country,
      },
    },
    ...(job.workType === 'Remote' && {
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: { '@type': 'Country', name: place.country },
    }),
    ...(salary && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: salary.currency,
        value: {
          '@type': 'QuantitativeValue',
          ...(salary.max ? { minValue: salary.min, maxValue: salary.max } : { value: salary.min }),
          unitText: salary.unitText,
        },
      },
    }),
    ...(years && {
      experienceRequirements: { '@type': 'OccupationalExperienceRequirements', monthsOfExperience: Number(years[1]) * 12 },
    }),
    ...(job.department && { occupationalCategory: job.department }),
    skills: job.requirements.map((r) => r.skillName).join(', '),
    ...(job.responsibilities?.length && { responsibilities: job.responsibilities.join('\n') }),
    ...(job.qualifications?.length && { qualifications: job.qualifications.join('\n') }),
    ...(job.benefits?.length && { jobBenefits: job.benefits.join('\n') }),
    directApply: true,
    url: `${siteUrl}${jobPath(job)}`,
  };
}

// JSON inside a <script> tag must not be able to close it
export const jsonLdScript = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

export { escapeHtml };
