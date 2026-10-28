import React, { useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { CheckCircle2, Clock, Mail, ShieldCheck, UserPlus, X } from 'lucide-react';
import {
  Account,
  Company,
  MemberRequest,
  accountError,
  companiesInReview,
  decideCompany,
  decideMember,
  finishCompanySetup,
  refreshVerification,
  resendVerification,
  signOut,
  watchMemberRequests,
} from '../lib/accounts';
import { Pulse } from './Pulse';

// What a signed-in person sees before they can use Vetter: verify their email, then (for companies) wait while
// their company is set up, a colleague approves them, or Vetter's team reviews them

const Screen: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
    <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">{icon}</div>
    <h1 className="text-xl font-bold text-slate-900">{title}</h1>
    <div className="text-sm text-slate-600 space-y-3">{children}</div>
    <button onClick={() => signOut()} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
      Sign out
    </button>
  </div>
);

export const AccountGate: React.FC<{ user: FirebaseUser; account: Account | null; company: Company | null }> = ({ user, account, company }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const needsSetup = user.emailVerified && account?.role === 'recruiter' && account.status === 'setup';

  // Once a company sign-up's email is verified, create or join their company
  useEffect(() => {
    if (!needsSetup || !account) return;
    finishCompanySetup(account).catch((err) => setSetupError(accountError(err)));
  }, [needsSetup]);

  // Coming back from the link in the email: check without making them press anything
  useEffect(() => {
    if (user.emailVerified) return;
    const onFocus = () => refreshVerification(user).catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user]);

  if (!user.emailVerified)
    return (
      <Screen icon={<Mail className="w-6 h-6" />} title="Check your inbox">
        <p>
          We sent a link to <span className="font-semibold text-slate-900">{user.email}</span>. Click it to verify your email, then come back here.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <button
            onClick={async () => {
              setChecking(true);
              const ok = await refreshVerification(user).catch(() => false);
              setChecking(false);
              if (!ok) setMessage("Not verified yet. Click the link in the email first; it can take a minute to arrive.");
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          >
            {checking ? 'Checking…' : "I've verified it"}
          </button>
          <button
            onClick={() =>
              resendVerification()
                .then(() => setMessage('Sent again. Check your spam folder too.'))
                .catch((err) => setMessage(accountError(err)))
            }
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg"
          >
            Send it again
          </button>
        </div>
        {message && <p className="text-xs text-slate-500">{message}</p>}
      </Screen>
    );

  if (!account || needsSetup)
    return (
      <div className="flex flex-col items-center py-16">
        <Pulse label="Setting up your account" />
        <p className="text-sm font-semibold text-slate-900">{setupError ?? 'Setting up your account…'}</p>
      </div>
    );

  if (account.status === 'pending-approval')
    return (
      <Screen icon={<UserPlus className="w-6 h-6" />} title={`Waiting to join ${company?.name ?? 'your company'}`}>
        <p>
          {company?.name ?? 'Your company'} is already on Vetter. We've asked {company?.ownerName ?? 'its account owner'} to approve you, and you'll be in as
          soon as they do.
        </p>
      </Screen>
    );

  if (account.status === 'pending-review')
    return (
      <Screen icon={<Clock className="w-6 h-6" />} title="We're checking your company">
        <p>
          You signed up without a work email, so Vetter's team checks {company?.name ?? 'your company'} before you can post jobs. This usually takes less
          than a working day, and this page updates by itself.
        </p>
      </Screen>
    );

  if (account.status === 'rejected')
    return (
      <Screen icon={<X className="w-6 h-6" />} title="Your account wasn't approved">
        <p>If you think this is a mistake, email the Vetter team from your work address and we'll take another look.</p>
      </Screen>
    );

  return null;
};

// Shown to a company's owner: colleagues from their domain asking to join
export const TeamRequests: React.FC<{ company: Company }> = ({ company }) => {
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => watchMemberRequests(company.id, setRequests), [company.id]);
  const pending = requests.filter((r) => r.status === 'pending-approval');
  if (pending.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4 text-indigo-600" />
          {pending.length === 1 ? '1 colleague wants' : `${pending.length} colleagues want`} to join {company.name}
        </h2>
        <ul className="space-y-2">
          {pending.map((r) => (
            <li key={r.uid} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-semibold text-slate-900">{r.name}</span> <span className="text-slate-500">{r.email}</span>
              </span>
              <span className="flex gap-2">
                <button
                  onClick={() => decideMember(company.id, r.uid, true).catch((err) => setError(accountError(err)))}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Approve
                </button>
                <button
                  onClick={() => decideMember(company.id, r.uid, false).catch((err) => setError(accountError(err)))}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Decline
                </button>
              </span>
            </li>
          ))}
        </ul>
        {error && <p className="text-xs text-rose-700">{error}</p>}
      </div>
    </section>
  );
};

// Shown to the Vetter team: companies that signed up without a work email
export const CompanyReview: React.FC = () => {
  const [queue, setQueue] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => companiesInReview().then(setQueue).catch((err) => setError(accountError(err)));
  useEffect(() => {
    load();
  }, []);
  if (!queue || queue.length === 0) return null;
  const decide = (c: Company, approve: boolean) =>
    decideCompany(c, approve)
      .then(load)
      .catch((err) => setError(accountError(err)));
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          {queue.length === 1 ? '1 company' : `${queue.length} companies`} to check: signed up without a work email
        </h2>
        <ul className="divide-y divide-amber-200">
          {queue.map((c) => (
            <li key={c.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="font-semibold text-slate-900">{c.name}</span>
                {c.website && (
                  <a href={/^https?:/.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer noopener" className="ml-2 text-indigo-700 hover:underline">
                    {c.website}
                  </a>
                )}
                <span className="block text-xs text-slate-600">
                  {c.ownerName} &middot; {c.ownerEmail}
                </span>
              </span>
              <span className="flex gap-2">
                <button onClick={() => decide(c, true)} className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button onClick={() => decide(c, false)} className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg">
                  Reject
                </button>
              </span>
            </li>
          ))}
        </ul>
        {error && <p className="text-xs text-rose-700">{error}</p>}
      </div>
    </section>
  );
};
