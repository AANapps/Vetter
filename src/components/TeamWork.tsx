import React from 'react';
import { Award, Building2, Check, Clock, Play, RotateCcw, X } from 'lucide-react';
import { Assignment, AssessmentTest, TeamMember } from '../types';
import { KindChip } from './TeamPage';
import { CertificateDetails, CertificateDialog } from './Certificate';

/**
 * Someone's side of a company's team: invitations to join, and the tests, job simulations and training their companies
 * sent them. Shown at the top of their home.
 */
interface TeamWorkProps {
  invitations: TeamMember[];
  memberships: TeamMember[];
  assignments: Assignment[];
  tests: AssessmentTest[];
  onRespond: (member: TeamMember, accept: boolean) => void;
  onLeave: (member: TeamMember) => void;
  onStart: (assignment: Assignment, test: AssessmentTest) => void;
  personName: string;
}

const shortDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

export const TeamWork: React.FC<TeamWorkProps> = ({ invitations, memberships, assignments, tests, onRespond, onLeave, onStart, personName }) => {
  const [cert, setCert] = React.useState<CertificateDetails | null>(null);
  if (!invitations.length && !memberships.length) return null;
  // Training and tests are kept apart: what's to do first, then what's done
  const isTrainingWork = (a: Assignment) => tests.find((t) => t.id === a.testId)?.purpose === 'training';
  const ordered = (list: Assignment[]) => [...list.filter((a) => !a.completedAt), ...list.filter((a) => a.completedAt)];
  const trainingWork = ordered(assignments.filter(isTrainingWork));
  const testWork = ordered(assignments.filter((a) => !isTrainingWork(a)));
  const certificateOf = (a: Assignment, t: AssessmentTest): CertificateDetails => ({
    id: a.id,
    name: personName,
    trainingTitle: t.title,
    companyName: a.companyName,
    skills: t.skillsTested,
    score: a.certificateScore ?? a.score ?? 0,
    certifiedAt: a.certifiedAt!,
  });
  const row = (a: Assignment) => {
    const t = tests.find((x) => x.id === a.testId);
    if (!t) return null;
    const training = t.purpose === 'training';
    const overdue = !a.completedAt && a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10);
    return (
      <li key={a.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{t.title}</span>
            <KindChip test={t} />
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            From {a.companyName} · ~{t.estimatedMinutes} min{training ? ', untimed' : ''}
            {a.dueDate && <span className={overdue ? 'text-rose-600 font-semibold' : ''}> · due {shortDate(a.dueDate)}</span>}
            {a.note && <span className="block text-slate-600 mt-0.5">“{a.note}”</span>}
          </div>
        </div>
        {a.completedAt ? (
          <div className="flex items-center gap-3 flex-wrap">
            {a.certifiedAt && (
              <button
                onClick={() => setCert(certificateOf(a, t))}
                className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg inline-flex items-center gap-1"
              >
                <Award className="w-3.5 h-3.5" />
                Certificate
              </button>
            )}
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {a.score}/100 <span className="text-xs font-normal text-slate-400">· {shortDate(a.completedAt)}</span>
            </span>
            {training && (
              <button onClick={() => onStart(a, t)} className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg inline-flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                Do it again
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => onStart(a, t)} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-auto">
            <Play className="w-4 h-4" />
            {training ? 'Start training' : 'Start'}
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4 mb-8">
      {invitations.map((m) => (
        <div key={m.id} className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900">{m.companyName} invited you to join its team on Vetter</div>
            <p className="text-xs text-slate-600 mt-0.5">
              They'll be able to send you training, job simulations and tests, and see how you get on with those. Nothing else on your profile changes, and
              those results aren't public.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onRespond(m, false)} className="px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1">
              <X className="w-4 h-4" />
              Decline
            </button>
            <button onClick={() => onRespond(m, true)} className="px-3 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1">
              <Check className="w-4 h-4" />
              Join
            </button>
          </div>
        </div>
      ))}

      {memberships.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">From your team</h2>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {memberships.map((m) => (
                <span key={m.id} className="text-xs text-slate-500 inline-flex items-center gap-1">
                  {m.companyName}
                  <button
                    onClick={() => window.confirm(`Leave ${m.companyName}'s team? They won't be able to send you work any more.`) && onLeave(m)}
                    className="text-slate-400 hover:text-rose-600 underline"
                  >
                    leave
                  </button>
                </span>
              ))}
            </div>
          </div>
          {assignments.length === 0 && (
            <p className="p-4 text-sm text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl inline-flex items-center gap-2 w-full">
              <Clock className="w-4 h-4" />
              Nothing to do yet. Training and tests your team sends you will appear here.
            </p>
          )}
          {trainingWork.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Training</h3>
              <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">{trainingWork.map(row)}</ul>
            </div>
          )}
          {testWork.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tests and simulations</h3>
              <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">{testWork.map(row)}</ul>
            </div>
          )}
        </section>
      )}
      {cert && <CertificateDialog cert={cert} onClose={() => setCert(null)} />}
    </div>
  );
};
