import React from 'react';
import { CheckCircle2, Play, Send } from 'lucide-react';
import { AssessmentTest, Business, CandidateJobMatch, JobPosting, User } from '../types';
import { getBestTestScore } from '../lib/matchingAlgorithm';
import { getTestStats } from '../lib/leaderboard';
import { SKILL_IDS } from '../data/seedCandidates';

const DAY_MS = 86400000;

// "12 Oct 2026"
const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const daysFromToday = (iso: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / DAY_MS);
};

const postedAgo = (iso: string) => {
  const days = -daysFromToday(iso);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const closesIn = (iso: string) => {
  const days = daysFromToday(iso);
  if (days < 0) return 'Closed';
  if (days === 0) return 'Closes today';
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
};

const Detail: React.FC<{ label: string; value: React.ReactNode; note?: string }> = ({ label, value, note }) => (
  <div className="flex justify-between gap-4 py-2">
    <dt className="text-slate-500">{label}</dt>
    <dd className="text-right">
      <div className="font-semibold text-slate-900">{value}</div>
      {note && <div className="text-[11px] text-slate-500">{note}</div>}
    </dd>
  </div>
);

const BulletList: React.FC<{ title: string; items?: string[] }> = ({ title, items }) =>
  items && items.length > 0 ? (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700 leading-relaxed marker:text-slate-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  ) : null;

interface JobDetailsProps {
  job: JobPosting;
  match: CandidateJobMatch;
  candidate: User;
  allCandidates: User[];
  tests: AssessmentTest[];
  business?: Business;
  isApplied: boolean;
  onApply: () => void;
  onStartAttachedTest: (test: AssessmentTest) => void;
  onOpenTest: (testId: string) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({
  job,
  match,
  candidate,
  allCandidates,
  tests,
  business,
  isApplied,
  onApply,
  onStartAttachedTest,
  onOpenTest,
}) => {
  const attachedTest = tests.find((t) => t.id === job.attachedTestId);
  const attachedStats = attachedTest ? getTestStats(attachedTest, allCandidates) : undefined;
  const attachedBest = attachedTest ? getBestTestScore(candidate, attachedTest.id) : undefined;
  const passMark = job.attachedTestPassingScore || attachedTest?.passingScore || 75;

  // Each skill requirement is scored by the Vetter test for that skill
  const skillTests = job.requirements.map((req) => ({
    req,
    test: tests.find((t) => t.type === 'standard' && SKILL_IDS[t.category] === req.skillId),
    breakdown: match.breakdown.find((b) => b.skillName === req.skillName),
  }));

  return (
    <div className="border-t border-slate-200 grid grid-cols-1 lg:grid-cols-3">
      {/* Full description */}
      <div className="lg:col-span-2 p-6 space-y-7 lg:border-r border-slate-200">
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-900">Full job description</h4>
          <p className="text-xs text-slate-700 leading-relaxed">{job.description}</p>
        </div>

        <BulletList title="What you'll do" items={job.responsibilities} />
        <BulletList title="What you'll need" items={job.qualifications} />
        <BulletList title="Nice to have" items={job.niceToHave} />

        {job.benefits && job.benefits.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900">Benefits</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-700">
              {job.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-px" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tests involved in hiring for this job */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900">Tests for this job</h4>

          {attachedTest && (
            <div className="bg-white rounded-xl p-5 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="text-[11px] font-mono uppercase tracking-wider">
                    <span className={job.isAttachedTestMandatory ? 'text-rose-700 font-bold' : 'text-slate-500 font-bold'}>
                      {job.isAttachedTestMandatory ? 'Required to apply' : 'Optional'}
                    </span>
                    <span className="text-slate-300"> &middot; </span>
                    <span className="text-slate-500">
                      {attachedTest.type === 'custom' ? `Made by ${attachedTest.companyName}` : 'Made by Vetter'}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenTest(attachedTest.id)}
                    className="text-sm font-bold text-slate-900 hover:text-indigo-700 transition-colors text-left"
                  >
                    {attachedTest.title}
                  </button>
                  <div className="text-slate-500 font-mono text-[11px]">
                    ~{attachedTest.estimatedMinutes} min &middot; {attachedTest.questions.length}{' '}
                    {attachedTest.questions.length === 1 ? 'task' : 'tasks'} &middot; pass mark {passMark}/100
                    {attachedStats && attachedStats.candidatesRanked > 0 && (
                      <> &middot; {attachedStats.candidatesRanked} ranked, avg {attachedStats.averageScore}</>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenTest(attachedTest.id)}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white rounded-lg transition-colors"
                  >
                    Leaderboard
                  </button>
                  <button
                    onClick={() => onStartAttachedTest(attachedTest)}
                    className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{attachedBest !== undefined ? 'Retake' : 'Take test'}</span>
                  </button>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">{attachedTest.description}</p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-slate-500">Your best score</span>
                {attachedBest === undefined ? (
                  <span className="font-mono text-slate-500">Not taken yet</span>
                ) : (
                  <span className={`font-mono font-bold ${attachedBest >= passMark ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {attachedBest}/100 &middot; {attachedBest >= passMark ? 'Passed' : `${passMark - attachedBest} below pass mark`}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl text-xs overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <div className="font-bold text-slate-900">Skills scored from Vetter tests</div>
              <div className="text-slate-500">Your fit for this job comes from your best score on each of these.</div>
            </div>
            <div className="divide-y divide-slate-100">
              {skillTests.map(({ req, test, breakdown }) => {
                const score = breakdown?.candidateScore ?? 0;
                const meets = breakdown?.meetsThreshold ?? false;
                return (
                  <div key={req.skillId} className="px-5 py-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">{req.skillName}</span>
                        <span className="ml-2 text-[10px] uppercase font-mono font-semibold text-slate-500">{req.importance}</span>
                        {test && (
                          <button
                            onClick={() => onOpenTest(test.id)}
                            className="block text-[11px] text-indigo-700 hover:underline text-left"
                          >
                            {test.title} &rarr;
                          </button>
                        )}
                      </div>
                      <div className="font-mono tabular-nums text-right">
                        <span className={score === 0 ? 'text-slate-400' : meets ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          {score === 0 ? 'Not taken' : score}
                        </span>
                        <span className="text-slate-400"> / {req.minScore} min</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${meets ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, (score / (req.minScore || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {business && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900">About {business.name}</h4>
            <p className="text-xs text-slate-700 leading-relaxed">{business.description}</p>
            <div className="text-[11px] text-slate-500">
              {business.industry} &middot; {business.companySize} &middot; HQ {business.headquarters}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {business.techStack.map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 font-mono">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* At-a-glance details */}
      <aside className="p-6 border-t lg:border-t-0 border-slate-200 text-xs space-y-6">
        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Job details</h4>
          <dl className="divide-y divide-slate-100">
            <Detail label="Pay" value={job.salaryRange} note="a year" />
            {job.employmentType && <Detail label="Job type" value={job.employmentType} />}
            <Detail label="Work setting" value={job.workType} />
            <Detail label="Location" value={job.location} />
            {job.experienceLevel && <Detail label="Experience" value={job.experienceLevel} />}
            <Detail label="Department" value={job.department} />
          </dl>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Dates</h4>
          <dl className="divide-y divide-slate-100">
            <Detail label="Posted" value={formatDate(job.postedDate)} note={postedAgo(job.postedDate)} />
            {job.closingDate && (
              <Detail label="Applications close" value={formatDate(job.closingDate)} note={closesIn(job.closingDate)} />
            )}
            {job.startDate && <Detail label="Start date" value={job.startDate} />}
          </dl>
        </div>

        <div className="space-y-3">
          <div className="text-slate-500">{job.applicantCount} people have applied</div>
          {isApplied ? (
            <div className="w-full px-4 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Applied</span>
            </div>
          ) : (
            <button
              onClick={onApply}
              className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Apply now</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
