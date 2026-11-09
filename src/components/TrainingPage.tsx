import React, { useState } from 'react';
import { Award, Eye, GraduationCap, Lock, Pencil, Send, Users } from 'lucide-react';
import { Assignment, AssessmentTest, Business, TeamMember, TestDraft, User } from '../types';
import { AssignDialog } from './TeamPage';
import { CertificateDetails, CertificateDialog } from './Certificate';

/**
 * A company's training: the simulations it made to teach its team an app or a way of working, kept apart from its
 * hiring tests. Each one shows who it was sent to, who finished and who passed (and so has a certificate).
 */
interface TrainingPageProps {
  business: Business;
  training: AssessmentTest[];
  drafts: TestDraft[];
  team: TeamMember[];
  assignments: Assignment[];
  candidates: User[];
  aiAllowed: boolean;
  onCreate: () => void;
  onSeePlans: () => void;
  onContinueDraft: (draft: TestDraft) => void;
  onTry: (test: AssessmentTest) => void;
  onEdit: (test: AssessmentTest) => void;
  onAssign: (members: TeamMember[], test: AssessmentTest, dueDate?: string, note?: string) => void;
  onGoToTeam: () => void;
}

export const TrainingPage: React.FC<TrainingPageProps> = ({
  business,
  training,
  drafts,
  team,
  assignments,
  candidates,
  aiAllowed,
  onCreate,
  onSeePlans,
  onContinueDraft,
  onTry,
  onEdit,
  onAssign,
  onGoToTeam,
}) => {
  const [sending, setSending] = useState<AssessmentTest | null>(null);
  const [cert, setCert] = useState<CertificateDetails | null>(null);
  const active = team.filter((m) => m.status === 'active');
  const nameOf = (m?: TeamMember) => (m ? candidates.find((c) => c.id === m.uid)?.name ?? m.name : 'Left the team');

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Training</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Simulations that teach your team the apps and work they do at {business.name}: guided tasks, no timer, and the worked answers at the end.
            Everyone who passes gets a certificate.
          </p>
        </div>
        <button
          onClick={() => (aiAllowed ? onCreate() : onSeePlans())}
          className="create-border shrink-0 self-start sm:self-auto px-4 py-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 rounded-lg inline-flex items-center gap-1.5"
        >
          {aiAllowed ? <GraduationCap className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
          Create training with AI
        </button>
      </div>

      {drafts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">Still being written</h2>
          <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {drafts.map((d) => (
              <li key={d.id} className="p-3 flex items-center gap-3">
                <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900 truncate">{d.test.title || 'Untitled training'}</span>
                <button onClick={() => onContinueDraft(d)} className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
                  Carry on
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {training.length === 0 ? (
        <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-xl space-y-2">
          <GraduationCap className="w-8 h-8 text-indigo-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-900">No training yet</p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Tell Vetter the app and the areas your team needs (e.g. "refunds and macros in Zendesk"), and it builds a copy of the app with guided tasks for them.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {training.map((t) => {
            const sent = assignments.filter((a) => a.testId === t.id);
            const done = sent.filter((a) => a.completedAt);
            const passed = sent.filter((a) => a.certifiedAt);
            return (
              <li key={t.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-slate-900">{t.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t.totalQuestions} tasks · about {t.estimatedMinutes} min, untimed · pass mark {t.passingScore}
                    </div>
                    {t.skillsTested.length > 0 && <div className="text-xs text-slate-600 mt-1">Teaches {t.skillsTested.slice(0, 4).join(', ')}</div>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => onTry(t)} className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Try it
                    </button>
                    <button onClick={() => onEdit(t)} className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg inline-flex items-center gap-1">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => (active.length ? setSending(t) : onGoToTeam())}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1"
                    >
                      {active.length ? <Send className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                      {active.length ? 'Send to team' : 'Invite your team first'}
                    </button>
                  </div>
                </div>
                {sent.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-xs text-slate-500">
                      Sent to {sent.length} · finished {done.length} · <span className="text-amber-700 font-semibold">certified {passed.length}</span>
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {sent.map((a) => {
                        const m = team.find((x) => x.id === a.memberId);
                        return (
                          <li key={a.id}>
                            {a.certifiedAt ? (
                              <button
                                onClick={() =>
                                  setCert({
                                    id: a.id,
                                    name: nameOf(m),
                                    trainingTitle: t.title,
                                    companyName: a.companyName,
                                    skills: t.skillsTested,
                                    score: a.certificateScore ?? a.score ?? 0,
                                    certifiedAt: a.certifiedAt!,
                                  })
                                }
                                className="px-2.5 py-1 rounded-full border text-xs font-semibold bg-amber-50 border-amber-200 text-amber-800 inline-flex items-center gap-1 hover:bg-amber-100"
                                title="See their certificate"
                              >
                                <Award className="w-3.5 h-3.5" />
                                {nameOf(m)}
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full border text-xs bg-slate-50 border-slate-200 text-slate-600 inline-block">
                                {nameOf(m)} · {a.completedAt ? `${a.score}/100, not passed yet` : a.startedAt ? 'started' : 'not started'}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {sending && (
        <AssignDialog
          members={active}
          initial={active.map((m) => m.id)}
          initialTestId={sending.id}
          tests={training}
          business={business}
          nameOf={(m) => nameOf(m)}
          onClose={() => setSending(null)}
          onAssign={(members, test, due, note) => {
            onAssign(members, test, due, note);
            setSending(null);
          }}
        />
      )}
      {cert && <CertificateDialog cert={cert} onClose={() => setCert(null)} />}
    </div>
  );
};
