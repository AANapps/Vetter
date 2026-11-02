import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Course, coursePriceLabel } from '../data/courses';
import { submitCourseSignup, validEmail, validPhone } from '../lib/courseSignups';
import { User } from '../types';

// Signing up for a career switch course: email and phone are required, and the Vetter team gets in touch
export const CourseSignupDialog: React.FC<{ course: Course; candidate?: User; uid?: string; onClose: () => void }> = ({ course, candidate, uid, onClose }) => {
  const [name, setName] = useState(candidate?.name ?? '');
  const [email, setEmail] = useState(candidate?.email ?? '');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const problems = {
    name: !name.trim() ? 'Enter your name.' : '',
    email: !validEmail(email) ? 'Enter a valid email address.' : '',
    phone: !validPhone(phone) ? 'Enter a phone number with at least 7 digits.' : '',
  };
  const ok = !problems.name && !problems.email && !problems.phone;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!ok || sending) return;
    setSending(true);
    setError('');
    try {
      await submitCourseSignup({ courseId: course.id, courseTitle: course.title, price: course.price, name, email, phone, note, uid });
      setDone(true);
    } catch {
      setError("That didn't go through. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const field = 'mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200';
  const border = (bad: string) => (tried && bad ? 'border-rose-400' : 'border-slate-300 focus:border-indigo-500');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="signup-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">{course.format} · {coursePriceLabel(course)}</p>
            <h2 id="signup-title" className="mt-1 text-lg font-bold text-slate-900">{done ? "You're signed up" : `Sign up for ${course.title}`}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="mt-4 space-y-4">
            <p className="flex gap-2 text-sm text-slate-600">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              Thanks, {name.trim().split(/\s+/)[0]}. Someone from the Vetter team will call or email you to talk through the course, start dates and payment.
            </p>
            <button onClick={onClose} className="w-full py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">Leave your details and we'll contact you to talk it through. Nothing is charged now.</p>
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} className={`${field} ${border(problems.name)}`} />
              {tried && problems.name && <span className="mt-1 block text-xs text-rose-600">{problems.name}</span>}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={200} className={`${field} ${border(problems.email)}`} />
              {tried && problems.email && <span className="mt-1 block text-xs text-rose-600">{problems.email}</span>}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Phone
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={25} placeholder="+44 7700 900123" className={`${field} ${border(problems.phone)}`} />
              {tried && problems.phone && <span className="mt-1 block text-xs text-rose-600">{problems.phone}</span>}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Anything we should know? <span className="font-normal text-slate-400">(optional)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className={`${field} border-slate-300 focus:border-indigo-500 resize-none`} />
            </label>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button type="submit" disabled={sending} className="w-full py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
              {sending ? 'Signing you up…' : 'Sign up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
