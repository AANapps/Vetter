import React from 'react';
import { Award, ExternalLink, GraduationCap } from 'lucide-react';
import { Certification, Education, ProfileLink, WorkExperience } from '../types';
import { duration, linkLabel, monthLabel, safeUrl, sortExperience } from '../lib/experience';

// Someone's jobs as a CV timeline: role and company, the dates and how long, and a line on what they did
// stacked: dates under the role rather than beside it, for a narrow column
export const ExperienceList: React.FC<{ items: WorkExperience[]; stacked?: boolean }> = ({ items, stacked }) => (
  <ol className="relative space-y-5 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
    {sortExperience(items).map((j) => (
      <li key={j.id} className="relative pl-6">
        <span className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ring-4 ring-white ${j.end ? 'bg-slate-300' : 'bg-indigo-600'}`} aria-hidden />
        <div className={`flex flex-col gap-x-4 gap-y-0.5 ${stacked ? '' : 'sm:flex-row sm:items-baseline sm:justify-between'}`}>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">{j.role}</div>
            <div className="text-xs font-medium text-slate-600">{j.company}</div>
          </div>
          <div className="shrink-0 text-[11px] text-slate-500 tabular-nums">
            {monthLabel(j.start)} – {monthLabel(j.end)} <span className="text-slate-400">&middot; {duration(j.start, j.end)}</span>
          </div>
        </div>
        {j.summary && <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line">{j.summary}</p>}
      </li>
    ))}
  </ol>
);

// Their links as small buttons; only web addresses are shown
export const ProfileLinks: React.FC<{ links: ProfileLink[] }> = ({ links }) => (
  <ul className="flex flex-wrap gap-2">
    {links.flatMap((l) => {
      const url = safeUrl(l.url);
      return url
        ? [
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                {linkLabel(l)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>,
          ]
        : [];
    })}
  </ul>
);

// Their education, most recent first: the place, what they studied and when, with the grade
export const EducationList: React.FC<{ items: Education[]; stacked?: boolean }> = ({ items, stacked }) => (
  <ul className="space-y-4">
    {items.map((e) => (
      <li key={e.id} className="flex gap-3">
        <span className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center" aria-hidden>
          <GraduationCap className="w-4 h-4" />
        </span>
        <div className={`min-w-0 flex-1 flex flex-col gap-x-4 gap-y-0.5 ${stacked ? '' : 'sm:flex-row sm:items-baseline sm:justify-between'}`}>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">{e.school}</div>
            {(e.qualification || e.subject) && <div className="text-xs text-slate-600">{[e.qualification, e.subject].filter(Boolean).join(', ')}</div>}
            {e.grade && <div className="text-[11px] text-slate-500">{e.grade}</div>}
          </div>
          {(e.start || e.end) && (
            <div className="shrink-0 text-[11px] text-slate-500 tabular-nums">
              {e.start ? `${monthLabel(e.start)} – ` : ''}
              {e.end ? monthLabel(e.end) : e.start ? 'Now' : ''}
            </div>
          )}
        </div>
      </li>
    ))}
  </ul>
);

// Their certifications: the name, who issued it and when, with a link to check it when they gave one
export const CertificationList: React.FC<{ items: Certification[] }> = ({ items }) => (
  <ul className="space-y-4">
    {items.map((c) => {
      const url = c.url ? safeUrl(c.url) : null;
      return (
        <li key={c.id} className="flex gap-3">
          <span className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center" aria-hidden>
            <Award className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-indigo-700 inline-flex items-center gap-1">
                  {c.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                c.name
              )}
            </div>
            <div className="text-xs text-slate-600">
              {[c.issuer, c.issued && `Issued ${monthLabel(c.issued)}`, c.expires && `expires ${monthLabel(c.expires)}`].filter(Boolean).join(' · ')}
            </div>
          </div>
        </li>
      );
    })}
  </ul>
);
