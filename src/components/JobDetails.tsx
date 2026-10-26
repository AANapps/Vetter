import React, { useEffect } from 'react';
import { CheckCircle2, MapPin, Play, Send, X } from 'lucide-react';
import { AssessmentTest, Business, CandidateJobMatch, JobPosting, User } from '../types';
import { getBestTestScore } from '../lib/matchingAlgorithm';
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

// Every test a job uses, in one list: its attached test, then the Vetter test for each skill it asks for
export interface JobTest {
  key: string;
  // What the test is for on this job: "Required to apply", "Required skill"...
  label: string;
  required: boolean;
  name: string;
  test?: AssessmentTest;
  isAttached: boolean;
  score?: number;
  target: number;
}

export const getJobTests = (
  job: JobPosting,
  match: CandidateJobMatch,
  candidate: User,
  tests: AssessmentTest[]
): JobTest[] => {
  const attachedTest = tests.find((t) => t.id === job.attachedTestId);
  const attached: JobTest[] = attachedTest
    ? [
        {
          key: attachedTest.id,
          label: job.isAttachedTestMandatory ? 'Required to apply' : 'Optional',
          required: !!job.isAttachedTestMandatory,
          name: attachedTest.title,
          test: attachedTest,
          isAttached: true,
          score: getBestTestScore(candidate, attachedTest.id),
          target: job.attachedTestPassingScore || attachedTest.passingScore || 75,
        },
      ]
    : [];

  // Each skill requirement is scored by the Vetter test for that skill; the attached test is listed once
  const skillTests = job.requirements
    .map((req): JobTest => {
      const test = tests.find((t) => t.type === 'standard' && SKILL_IDS[t.category] === req.skillId);
      const breakdown = match.breakdown.find((b) => b.skillName === req.skillName);
      return {
        key: req.skillId,
        label: req.importance === 'required' ? 'Required skill' : 'Preferred skill',
        required: req.importance === 'required',
        name: test?.title ?? req.skillName,
        test,
        isAttached: false,
        score: breakdown && breakdown.candidateScore > 0 ? breakdown.candidateScore : undefined,
        target: req.minScore,
      };
    })
    .filter((t) => !t.test || t.test.id !== attachedTest?.id);

  return [...attached, ...skillTests];
};

// A job's tests on the job board: each one to do, or your result
export const JobTests: React.FC<{ items: JobTest[] }> = ({ items }) => {
  if (items.length === 0) return null;
  const done = items.filter((t) => t.score !== undefined).length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h4 className="text-sm font-bold text-slate-900">Tests for this job</h4>
        <span className="text-[11px] text-slate-500">
          {done} of {items.length} done
        </span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((t) => {
          const passed = t.score !== undefined && t.score >= t.target;
          return (
            <li
              key={t.key}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-sm ${
                t.score === undefined
                  ? 'bg-white border-slate-200'
                  : passed
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-amber-50/60 border-amber-200'
              }`}
            >
              {t.isAttached && t.required && (
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-700">Required to apply</span>
              )}
              <span className="font-semibold text-slate-900">{t.name}</span>
              {t.score === undefined ? (
                <span className="text-[11px] font-mono font-semibold text-indigo-700">
                  {t.test ? 'To do' : 'No test yet'}
                </span>
              ) : passed ? (
                <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t.score}/100
                </span>
              ) : (
                <span className="text-[11px] font-mono font-semibold text-amber-700">
                  {t.score}/100 &middot; {t.target} needed
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

interface JobDetailsProps {
  job: JobPosting;
  match: CandidateJobMatch;
  candidate: User;
  allCandidates: User[];
  tests: AssessmentTest[];
  business?: Business;
  isApplied: boolean;
  onApply: () => void;
  // The job's attached test (passing it can send the application); skill tests start on their own
  onStartAttachedTest: (test: AssessmentTest) => void;
  onStartTest: (test: AssessmentTest) => void;
  onOpenTest: (testId: string) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({
  job,
  match,
  candidate,
  tests,
  business,
  onStartAttachedTest,
  onStartTest,
  onOpenTest,
}) => {
  const testRows = (
    <ul className="divide-y divide-slate-100 bg-white rounded-xl text-xs">
      {getJobTests(job, match, candidate, tests).map((t) =>
        t.test ? (
          <TestRow
            key={t.key}
            label={t.label}
            labelTone={t.required ? 'required' : 'muted'}
            test={t.test}
            score={t.score}
            target={t.target}
            onStart={() => (t.isAttached ? onStartAttachedTest(t.test!) : onStartTest(t.test!))}
            onOpenTest={onOpenTest}
          />
        ) : (
          <li key={t.key} className="px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="font-semibold text-slate-900">{t.name}</span>
            <span className="text-slate-500">No Vetter test yet</span>
          </li>
        )
      )}
    </ul>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3">
      {/* Left: the full description */}
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

      {/* Right: job details, dates, then the tests for this job */}
      <aside className="p-6 border-t lg:border-t-0 border-slate-200 text-xs space-y-5">
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

          <div className="text-slate-500">{job.applicantCount} people have applied</div>

        <section className="space-y-2 pt-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Tests for this job</h4>
            <p className="text-[11px] text-slate-500">Your scores decide your fit</p>
          </div>
          {testRows}
        </section>
      </aside>
    </div>
  );
};

// One test on the job, on one line: what it's for, then your score or a button to take it
const TestRow: React.FC<{
  label: string;
  labelTone: 'required' | 'muted';
  test: AssessmentTest;
  score?: number;
  target: number;
  onStart: () => void;
  onOpenTest: (testId: string) => void;
}> = ({ label, labelTone, test, score, target, onStart, onOpenTest }) => {
  const passed = score !== undefined && score >= target;
  return (
    <li className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
      <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
        <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${labelTone === 'required' ? 'text-rose-700' : 'text-slate-500'}`}>
          {label}
        </span>
        <button onClick={() => onOpenTest(test.id)} className="font-semibold text-slate-900 hover:text-indigo-700 text-left">
          {test.title}
        </button>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 ml-auto">
        {score === undefined ? (
          <span className="text-[11px] font-medium text-amber-700">Not taken &middot; {target} needed</span>
        ) : (
          <span className={`font-mono font-bold tabular-nums ${passed ? 'text-emerald-700' : 'text-amber-700'}`}>
            {score}/100
            <span className="font-sans font-medium text-[11px]">
              {' '}
              &middot; {passed ? 'Passed' : `${target - score} short`}
            </span>
          </span>
        )}
        <button
          onClick={onStart}
          className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1 ${
            score === undefined ? 'text-white bg-indigo-600 hover:bg-indigo-700' : 'text-slate-700 bg-white'
          }`}
        >
          {score === undefined && <Play className="w-3 h-3 fill-current" />}
          <span>{score === undefined ? 'Take test' : 'Retake'}</span>
        </button>
      </div>
    </li>
  );
};

// Company, title, pay and fit: the top of both the pop-up and the job page
const JobHeader: React.FC<{
  job: JobPosting;
  match: CandidateJobMatch;
  titleAs: 'h1' | 'h2';
  isApplied: boolean;
  onApply: () => void;
  children?: React.ReactNode;
}> = ({ job, match, titleAs: Title, isApplied, onApply, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-start gap-4 min-w-0">
      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100">
        <img src={job.companyLogo} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      </div>
      <div className="space-y-1 min-w-0">
        <div className="text-xs text-slate-500">
          {job.companyName} &middot; {job.department}
        </div>
        <Title className="text-lg font-bold text-slate-900 tracking-tight">{job.title}</Title>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            {job.location} ({job.workType})
          </span>
          <span aria-hidden="true">&middot;</span>
          <span className="font-mono text-slate-700 font-medium">{job.salaryRange}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {isApplied ? (
            <span className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Applied</span>
            </span>
          ) : (
            <button
              onClick={onApply}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Apply now</span>
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
    <div className="sm:text-right shrink-0">
      <div className="text-[11px] text-slate-500 font-medium">Your Fit</div>
      <div className="text-2xl font-extrabold font-mono tabular-nums text-indigo-600">{match.overallFitPercentage}%</div>
      <div className="text-[10px] text-slate-500 font-medium">{match.matchTier}</div>
    </div>
  </div>
);

// The full listing as a pop-up over the job board: a quick view of the job page
export const JobDetailsModal: React.FC<JobDetailsProps & { onClose: () => void; onOpenPage: () => void }> = ({
  onClose,
  onOpenPage,
  ...props
}) => {
  const { job, match } = props;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={job.title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-900"
      >
        <div className="sm:sticky top-0 z-10 bg-white border-b border-slate-200 p-6 pr-14">
          <JobHeader job={job} match={match} titleAs="h2" isApplied={props.isApplied} onApply={props.onApply}>
            <button onClick={onOpenPage} className="text-xs font-semibold text-indigo-700 hover:underline">
              Open job page &rarr;
            </button>
          </JobHeader>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <JobDetails {...props} />
      </div>
    </div>
  );
};

// The job's own page, linkable at #/jobs/<id>
export const JobPage: React.FC<JobDetailsProps & { onBack: () => void }> = ({ onBack, ...props }) => (
  <div className="space-y-6">
    <button onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-indigo-700 transition-colors">
      &larr; Job Board
    </button>
    <div className="bg-white rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <JobHeader job={props.job} match={props.match} titleAs="h1" isApplied={props.isApplied} onApply={props.onApply} />
      </div>
      <JobDetails {...props} />
    </div>
  </div>
);
