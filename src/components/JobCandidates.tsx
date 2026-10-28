import React, { useState } from 'react';
import { CandidateJobMatch, JobPosting, User } from '../types';
import { rankCandidatesForJob } from '../lib/matchingAlgorithm';
import { applicationProfileOf } from '../lib/jobProfiles';
import { distanceMiles } from '../lib/geo';
import { Award, CheckCircle2, ChevronDown, AlertTriangle, MinusCircle } from 'lucide-react';

interface JobCandidatesProps {
  job: JobPosting;
  allCandidates: User[];
}

const PAGE_SIZE = 10;

// Smallest years of experience a job's level asks for, e.g. "Senior (5+ years)" → 5
const minYearsFor = (level?: string) => {
  const m = level?.match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
};

type Point = { tone: 'good' | 'gap' | 'neutral'; text: string };

// The reasons behind a candidate's rank, strongest evidence first
function suitabilityPoints(match: CandidateJobMatch, person: User, job: JobPosting): Point[] {
  const points: Point[] = [];
  const missingRequired = match.breakdown.filter((b) => b.importance === 'required' && !b.meetsThreshold);

  if (missingRequired.length === 0) {
    points.push({ tone: 'good', text: 'Meets every required skill score' });
  } else {
    missingRequired.forEach((b) =>
      points.push({
        tone: 'gap',
        text: b.candidateScore
          ? `${b.skillName}: ${b.requiredMinScore - b.candidateScore} points below the required ${b.requiredMinScore}`
          : `${b.skillName}: not verified yet (required)`,
      })
    );
  }

  if (match.jobTestStatus === 'qualified') points.push({ tone: 'good', text: `Passed the job's tests with ${match.jobTestScore}/100` });
  if (match.jobTestStatus === 'test_taken_failed')
    points.push({ tone: 'gap', text: `Scored ${match.jobTestScore}/100 on the job's tests, below the pass mark of ${job.testPassingScore}` });
  if (match.jobTestStatus === 'requires_test') points.push({ tone: 'neutral', text: "Hasn't taken all the job's tests" });

  const minYears = minYearsFor(job.experienceLevel);
  if (minYears !== undefined) {
    points.push(
      person.yearsExperience >= minYears
        ? { tone: 'good', text: `${person.yearsExperience} years' experience (job asks for ${minYears}+)` }
        : { tone: 'gap', text: `${person.yearsExperience} years' experience, job asks for ${minYears}+` }
    );
  }

  if (person.workPreference === job.workType) {
    points.push({ tone: 'good', text: `Wants ${job.workType.toLowerCase()} work, as this job is` });
  } else {
    points.push({ tone: 'neutral', text: `Prefers ${person.workPreference.toLowerCase()}; this job is ${job.workType.toLowerCase()}` });
  }

  if (job.workType !== 'Remote') {
    const miles = distanceMiles(person.location, job.location);
    if (miles !== undefined) {
      points.push(
        miles < 60
          ? { tone: 'good', text: `Based in ${person.location}, ${Math.round(miles)} miles from the office` }
          : { tone: 'neutral', text: `Based in ${person.location}, ${Math.round(miles).toLocaleString()} miles from ${job.location}` }
      );
    }
  }

  return points;
}

const PointIcon: React.FC<{ tone: Point['tone'] }> = ({ tone }) =>
  tone === 'good' ? (
    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-px" />
  ) : tone === 'gap' ? (
    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-px" />
  ) : (
    <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-px" />
  );

const fitColour = (fit: number) => (fit >= 85 ? 'text-indigo-600' : fit >= 75 ? 'text-violet-600' : 'text-amber-600');

// A job's candidates, best fit first; each one opens to show why they suit the job (or don't)
export const JobCandidates: React.FC<JobCandidatesProps> = ({ job, allCandidates }) => {
  const [appliedOnly, setAppliedOnly] = useState(false);
  const [meetsRequiredOnly, setMeetsRequiredOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const people = new Map(allCandidates.map((c) => [c.id, c]));
  const hasApplied = (id: string) => !!people.get(id)?.appliedJobIds?.includes(job.id);
  const ranked = rankCandidatesForJob(allCandidates, job);
  const applicants = ranked.filter((c) => hasApplied(c.candidateId)).length;
  const visible = ranked.filter((c) => (!appliedOnly || hasApplied(c.candidateId)) && (!meetsRequiredOnly || c.meetsAllHardRequirements));

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Candidates</h4>
          <p className="text-xs text-slate-500">
            {ranked.length} on Vetter ranked for this job &middot; {applicants} applied. Open a candidate to see their fit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
            <input type="checkbox" checked={appliedOnly} onChange={(e) => setAppliedOnly(e.target.checked)} className="accent-indigo-600" />
            <span>Applied only</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={meetsRequiredOnly}
              onChange={(e) => setMeetsRequiredOnly(e.target.checked)}
              className="accent-indigo-600"
            />
            <span>Meets required scores</span>
          </label>
        </div>
      </div>

      {visible.length === 0 && <p className="text-xs text-slate-500 py-4">No candidates match these filters.</p>}

      <ul className="border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden bg-white">
        {visible.slice(0, shown).map((c, idx) => {
          const person = people.get(c.candidateId)!;
          const isOpen = expandedId === c.candidateId;
          const applied = hasApplied(c.candidateId);
          // Applicants are shown as the job profile they applied with
          const appliedAs = applied ? applicationProfileOf(person, job.id) : undefined;
          const headline = appliedAs?.title ?? c.candidateTitle;
          const bio = appliedAs?.bio ?? person.bio;
          const requiredNames = new Set(c.breakdown.map((b) => b.skillName.toLowerCase()));
          const requiredTests = new Set(job.requirements.map((r) => r.testId).filter(Boolean));
          const otherSkills = person.verifiedSkills
            .filter(
              (s) =>
                !requiredTests.has(s.testId) &&
                !requiredNames.has(s.skillName.toLowerCase()) &&
                !requiredNames.has(s.category.toLowerCase())
            )
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);

          return (
            <li key={c.candidateId}>
              <button
                onClick={() => setExpandedId(isOpen ? null : c.candidateId)}
                aria-expanded={isOpen}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isOpen ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
              >
                <span className="w-6 text-xs font-mono text-slate-400 tabular-nums shrink-0">{idx + 1}</span>
                <img src={c.candidateAvatar} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover bg-slate-100 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 truncate">{c.candidateName}</span>
                    {applied && (
                      <span className="text-[10px] font-mono uppercase font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Applied
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {headline} &middot; {c.candidateLocation}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-extrabold font-mono tabular-nums leading-none ${fitColour(c.overallFitPercentage)}`}>
                    {c.overallFitPercentage}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">{c.matchTier}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-5 pt-2 bg-indigo-50/30 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Skill scores against the job's minimums */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Scores this job asks for</h5>
                    {c.breakdown.map((b) => (
                      <div key={b.skillName} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-900 truncate">
                            {b.skillName}{' '}
                            <span className={`font-normal ${b.importance === 'required' ? 'text-rose-700' : 'text-slate-500'}`}>
                              ({b.importance})
                            </span>
                          </span>
                          <span className="font-mono tabular-nums text-slate-700 shrink-0">
                            {b.candidateScore ? b.candidateScore : '—'}
                            <span className="text-slate-400"> / min {b.requiredMinScore}</span>
                          </span>
                        </div>
                        <div className="relative h-2 bg-slate-200 rounded-full">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${b.meetsThreshold ? 'bg-indigo-500' : 'bg-amber-500'}`}
                            style={{ width: `${b.candidateScore}%` }}
                          />
                          <div
                            className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-slate-900"
                            style={{ left: `${b.requiredMinScore}%` }}
                            title={`Minimum ${b.requiredMinScore}`}
                          />
                        </div>
                      </div>
                    ))}

                    {otherSkills.length > 0 && (
                      <div className="pt-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">Also verified</div>
                        <div className="flex flex-wrap gap-1.5">
                          {otherSkills.map((s) => (
                            <span key={s.skillId} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-700">
                              {s.skillName} <span className="font-mono font-semibold text-slate-900">{s.score}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Why they rank where they do */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Suitability</h5>
                    <ul className="space-y-1.5">
                      {suitabilityPoints(c, person, job).map((p) => (
                        <li key={p.text} className="flex items-start gap-2 text-xs text-slate-700">
                          <PointIcon tone={p.tone} />
                          <span>{p.text}</span>
                        </li>
                      ))}
                    </ul>

                    {job.testIds.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                        <Award className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {job.testIds.length} {job.testIds.length === 1 ? 'test' : 'tests'} for this job &middot; pass mark {job.testPassingScore}
                        </span>
                      </div>
                    )}

                    {(bio || appliedAs) && (
                      <div className="border-t border-slate-200 pt-3 space-y-1">
                        {appliedAs && (
                          <div className="text-[11px] font-semibold text-slate-700">Applied with their {appliedAs.name} profile</div>
                        )}
                        {bio && <p className="text-xs text-slate-600 leading-relaxed">{bio}</p>}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <label htmlFor={`stage-${c.candidateId}`} className="text-xs font-semibold text-slate-700">
                        Stage
                      </label>
                      <select
                        id={`stage-${c.candidateId}`}
                        value={statuses[c.candidateId] || 'review'}
                        onChange={(e) => setStatuses((prev) => ({ ...prev, [c.candidateId]: e.target.value }))}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 text-slate-800 font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="review">Screening</option>
                        <option value="interview">Interviewing</option>
                        <option value="offer">Offer Extended</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {visible.length > shown && (
        <button
          onClick={() => setShown((n) => n + PAGE_SIZE)}
          className="w-full py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          Show more ({visible.length - shown} left)
        </button>
      )}
    </div>
  );
};
