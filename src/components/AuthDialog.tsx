import React, { useEffect, useState } from 'react';
import { AlertCircle, Briefcase, CheckCircle2, Search, X } from 'lucide-react';
import { accountError, continueWithGoogle, createAccount, resetPassword, signIn, signUp } from '../lib/accounts';
import { domainOf, domainsMatch, isFreeEmail } from '../lib/emailDomains';

export type AuthMode = 'sign-in' | 'sign-up' | 'reset';

interface AuthDialogProps {
  initialMode: AuthMode;
  // Shown above the form when an action needs an account, e.g. "Sign in to take this test"
  reason?: string;
  // Which kind of account sign-up starts on; companies coming from the pricing page start as a company
  initialRole?: 'candidate' | 'recruiter';
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

// Signing in, creating an account (as a candidate or a company) and resetting a password
export const AuthDialog: React.FC<AuthDialogProps> = ({ initialMode, reason, initialRole = 'candidate', onClose }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<'candidate' | 'recruiter'>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [noWorkEmail, setNoWorkEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const freeEmail = role === 'recruiter' && email.includes('@') && isFreeEmail(email);
  const siteMismatch = role === 'recruiter' && !freeEmail && email.includes('@') && website.trim() !== '' && !domainsMatch(domainOf(email), website);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'sign-up' && role === 'recruiter' && freeEmail && !noWorkEmail) {
      setError('Use your work email so we can match you to your company, or tick the box below if you don’t have one.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(email);
        setNotice(`If there's an account for ${email}, a link to reset the password is on its way.`);
      } else {
        await signUp({
          role,
          name,
          email,
          password,
          ...(role === 'recruiter' && { company: { name: companyName.trim(), website: website.trim(), noWorkEmail: noWorkEmail || freeEmail } }),
        });
        onClose();
      }
    } catch (err) {
      setError(accountError(err));
    } finally {
      setBusy(false);
    }
  };

  // Google: an existing account just signs in. A new one is created from what's been filled in here, or, if that
  // isn't enough, finished on the next screen
  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      const { user, hasAccount } = await continueWithGoogle();
      const enough = role === 'candidate' || companyName.trim() !== '';
      if (!hasAccount && mode === 'sign-up' && enough) {
        await createAccount(user, {
          role,
          name: name.trim() || user.displayName || user.email!.split('@')[0],
          ...(role === 'recruiter' && { company: { name: companyName.trim(), website: website.trim(), noWorkEmail: isFreeEmail(user.email ?? '') } }),
        });
      }
      onClose();
    } catch (err) {
      setError(accountError(err));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'sign-in' ? 'Sign in to Vetter' : mode === 'reset' ? 'Reset your password' : 'Create your Vetter account';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white sm:rounded-2xl rounded-t-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl"
      >
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {reason && <p className="text-xs text-slate-500 mt-0.5">{reason}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 space-y-4">
          {mode !== 'reset' && (
            <>
              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="w-full py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2.5"
              >
                <GoogleMark />
                Continue with Google
              </button>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or with email
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          )}
          {mode === 'sign-up' && (
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="sr-only">I'm</legend>
              {(
                [
                  { id: 'candidate', label: "I'm looking for work", icon: Search },
                  { id: 'recruiter', label: "I'm hiring", icon: Briefcase },
                ] as const
              ).map((r) => (
                <label
                  key={r.id}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-semibold cursor-pointer text-center ${
                    role === r.id ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <input type="radio" name="role" checked={role === r.id} onChange={() => setRole(r.id)} className="sr-only" />
                  <r.icon className="w-5 h-5" />
                  {r.label}
                </label>
              ))}
            </fieldset>
          )}

          {mode === 'sign-up' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Your name
              </label>
              <input id="auth-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1">
              {mode === 'sign-up' && role === 'recruiter' ? 'Work email' : 'Email'}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setNoWorkEmail(false);
              }}
              autoComplete="email"
              placeholder={mode === 'sign-up' && role === 'recruiter' ? 'you@yourcompany.com' : ''}
              className={inputClass}
            />
            {mode === 'sign-up' && role === 'recruiter' && !freeEmail && (
              <p className="text-[11px] text-slate-500 mt-1">Colleagues with the same work email domain join your company once you approve them.</p>
            )}
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                {mode === 'sign-in' && (
                  <button type="button" onClick={() => setMode('reset')} className="text-[11px] font-semibold text-indigo-700 hover:underline">
                    Forgot it?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={mode === 'sign-up' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                className={inputClass}
              />
              {mode === 'sign-up' && <p className="text-[11px] text-slate-500 mt-1">At least 8 characters.</p>}
            </div>
          )}

          {mode === 'sign-up' && role === 'recruiter' && (
            <div className="p-4 bg-slate-50 rounded-xl space-y-3">
              <div>
                <label htmlFor="auth-company" className="block text-xs font-semibold text-slate-700 mb-1">
                  Company name
                </label>
                <input id="auth-company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} autoComplete="organization" className={inputClass} />
              </div>
              <div>
                <label htmlFor="auth-website" className="block text-xs font-semibold text-slate-700 mb-1">
                  Company website
                </label>
                <input id="auth-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yourcompany.com" autoComplete="url" className={inputClass} />
                {siteMismatch && (
                  <p className="text-[11px] text-amber-800 mt-1">Your email domain doesn't match this website. Check both; it helps candidates trust your jobs.</p>
                )}
              </div>
              {freeEmail && (
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={noWorkEmail} onChange={(e) => setNoWorkEmail(e.target.checked)} className="mt-0.5 accent-indigo-600" />
                  <span>
                    I don't have a work email. <span className="text-slate-500">Vetter's team will check your company before you can post jobs, usually within a working day.</span>
                  </span>
                </label>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs font-semibold text-rose-700 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
          {notice && (
            <p className="text-xs text-emerald-800 flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              {notice}
            </p>
          )}

          <button type="submit" disabled={busy} className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg">
            {busy ? 'One moment…' : mode === 'sign-in' ? 'Sign in' : mode === 'reset' ? 'Send reset link' : 'Create account'}
          </button>

          <p className="text-xs text-slate-500 text-center">
            {mode === 'sign-up' ? (
              <>
                Already on Vetter?{' '}
                <button type="button" onClick={() => setMode('sign-in')} className="font-semibold text-indigo-700 hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to Vetter?{' '}
                <button type="button" onClick={() => setMode('sign-up')} className="font-semibold text-indigo-700 hover:underline">
                  Create an account
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

// Google's "G", in its colours
const GoogleMark: React.FC = () => (
  <svg viewBox="0 0 48 48" className="w-4.5 h-4.5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

