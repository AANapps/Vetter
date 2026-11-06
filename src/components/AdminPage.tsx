import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, GraduationCap, LogOut, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { firebaseEnabled } from '../lib/firebase';
import { useAccount } from '../lib/useAccount';
import { Company, accountError, companiesInReview, continueWithGoogle, decideCompany, signIn, signOut } from '../lib/accounts';
import { CourseSignup, listCourseSignups } from '../lib/courseSignups';
import { GoogleMark } from './AuthDialog';
import { Pulse } from './Pulse';

/**
 * /admin: the Vetter team's own page. Signed out, it's a sign-in screen; the panel only shows for an account whose
 * users/{uid} record has role "admin" and status "active" (firestore.rules enforces the same on every read and write).
 * Anyone else is told they're not an admin, and nothing more.
 */

const Shell: React.FC<{ children: React.ReactNode; onSignOut?: () => void; email?: string | null }> = ({ children, onSignOut, email }) => (
  <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <a href="/" className="font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          Vetter admin
        </a>
        {onSignOut && (
          <div className="flex items-center gap-3 min-w-0">
            {email && <span className="text-xs text-slate-500 truncate hidden sm:inline">{email}</span>}
            <button onClick={onSignOut} className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
  </div>
);

const SignInForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(accountError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-sm mx-auto bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold">Sign in to the admin panel</h1>
        <p className="text-sm text-slate-600 mt-1">For the Vetter team only.</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(continueWithGoogle)}
        className="w-full py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2"
      >
        <GoogleMark />
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-[11px] text-slate-400">
        <span className="flex-1 h-px bg-slate-200" />
        or
        <span className="flex-1 h-px bg-slate-200" />
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => signIn(email, password));
        }}
      >
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
        />
        <button type="submit" disabled={busy} className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg">
          Sign in
        </button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
};

// Shown to a signed-in account that isn't an admin. Says nothing about how admin access works
const NotAdmin: React.FC = () => (
  <div className="max-w-sm mx-auto bg-white border border-slate-200 rounded-2xl p-6 space-y-3 text-center">
    <h1 className="text-lg font-bold">Not an admin</h1>
    <p className="text-sm text-slate-600">This account doesn't have the admin role.</p>
    <button onClick={() => signOut()} className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
      Sign in with another account
    </button>
  </div>
);

const CompaniesQueue: React.FC = () => {
  const [queue, setQueue] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = () => {
    setError(null);
    companiesInReview()
      .then(setQueue)
      .catch((err) => setError(accountError(err)));
  };
  useEffect(load, []);
  const decide = (c: Company, approve: boolean) => {
    setBusyId(c.id);
    decideCompany(c, approve)
      .then(load)
      .catch((err) => setError(accountError(err)))
      .finally(() => setBusyId(null));
  };
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Companies to check
        </h2>
        <button onClick={load} className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Signed up without a work email (Gmail, Outlook and so on). Check the website is real and that the person works there before approving.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {!queue && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {queue && queue.length === 0 && <p className="text-sm text-slate-600">Nothing to check right now.</p>}
      {queue && queue.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {queue.map((c) => (
            <li key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="font-semibold">{c.name}</span>
                {c.website && (
                  <a
                    href={/^https?:/.test(c.website) ? c.website : `https://${c.website}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="ml-2 text-indigo-700 hover:underline break-all"
                  >
                    {c.website}
                  </a>
                )}
                <span className="block text-xs text-slate-600">
                  {c.ownerName} · {c.ownerEmail ?? 'no email on record'}
                </span>
              </span>
              <span className="flex gap-2">
                <button
                  disabled={busyId === c.id}
                  onClick={() => decide(c, true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-50 rounded-lg flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  disabled={busyId === c.id}
                  onClick={() => decide(c, false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 disabled:opacity-50 rounded-lg flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const CourseSignups: React.FC = () => {
  const [rows, setRows] = useState<(CourseSignup & { id: string; createdAt?: Date })[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listCourseSignups()
      .then(setRows)
      .catch((err) => setError(accountError(err)));
  }, []);
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <h2 className="font-bold flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-indigo-600" />
        Career switch sign-ups
      </h2>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {!rows && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {rows && rows.length === 0 && <p className="text-sm text-slate-600">No sign-ups yet.</p>}
      {rows && rows.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="py-3 text-sm space-y-0.5">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold">{r.name}</span>
                <span className="text-xs text-slate-500">{r.createdAt?.toLocaleDateString() ?? ''}</span>
              </div>
              <div className="text-slate-700">{r.courseTitle}</div>
              <div className="text-xs text-slate-600 break-all">
                <a href={`mailto:${r.email}`} className="text-indigo-700 hover:underline">
                  {r.email}
                </a>{' '}
                · <a href={`tel:${r.phone}`} className="text-indigo-700 hover:underline">{r.phone}</a>
              </div>
              {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const AdminPage: React.FC = () => {
  const { loading, user, account } = useAccount();

  useEffect(() => {
    document.title = 'Vetter admin';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (!firebaseEnabled)
    return (
      <Shell>
        <p className="text-sm text-slate-600 text-center">Accounts aren't set up on this site (demo mode), so there's no admin panel.</p>
      </Shell>
    );
  if (loading)
    return (
      <Shell>
        <div className="flex justify-center">
          <Pulse label="Loading" />
        </div>
      </Shell>
    );
  if (!user)
    return (
      <Shell>
        <SignInForm />
      </Shell>
    );

  const isAdmin = account?.role === 'admin' && account.status === 'active';
  return (
    <Shell onSignOut={() => signOut()} email={user.email}>
      {!isAdmin ? (
        <NotAdmin />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Admin panel</h1>
              <p className="text-sm text-slate-600">Signed in as {account.name || user.email}.</p>
            </div>
            <a href="/" className="text-sm font-semibold text-indigo-700 hover:underline flex items-center gap-1">
              Open the Vetter team view
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <CompaniesQueue />
          <CourseSignups />
        </div>
      )}
    </Shell>
  );
};
