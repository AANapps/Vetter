import React, { useState } from 'react';
import { AssessmentTest, Business, TestShare, User } from '../types';
import { Check, Copy, Mail } from 'lucide-react';

interface ShareTestPanelProps {
  test: AssessmentTest;
  business: Business;
  candidates: User[];
  shares: TestShare[];
  onShare: (share: TestShare) => void;
}

const today = () => new Date().toISOString().split('T')[0];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The test's link for this company: whoever follows it has their results shared back with the company
export const referralLink = (testId: string, businessId: string) =>
  `${window.location.origin}${window.location.pathname}#/tests/${encodeURIComponent(testId)}?ref=${encodeURIComponent(businessId)}`;

// A company sends a test to students by email, or copies its link to share anywhere
export const ShareTestPanel: React.FC<ShareTestPanelProps> = ({ test, business, candidates, shares, onShare }) => {
  const [emailsText, setEmailsText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = referralLink(test.id, business.id);

  const ourShares = shares.filter((s) => s.testId === test.id && s.businessId === business.id);
  const sentTo = new Set(ourShares.flatMap((s) => s.emails));
  // Students who came through the link, or who were emailed it and have an account
  const students = candidates
    .filter((c) => c.testReferrals?.some((r) => r.testId === test.id && r.businessId === business.id) || sentTo.has(c.email.toLowerCase()))
    .map((c) => {
      const results = c.testResults.filter((r) => r.testId === test.id && r.referredBy === business.id);
      return { candidate: c, best: results.length ? Math.max(...results.map((r) => r.score)) : undefined };
    });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard blocked: the link is selectable in the box
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = () => {
    const emails = [...new Set(emailsText.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
    const invalid = emails.filter((e) => !EMAIL.test(e));
    if (emails.length === 0 || invalid.length > 0) {
      setError(emails.length === 0 ? 'Enter at least one email address.' : `Not an email address: ${invalid.join(', ')}`);
      return;
    }
    setError(null);
    onShare({ id: `share-${Date.now()}`, testId: test.id, businessId: business.id, emails, sentAt: today() });
    const subject = `${business.name} invites you to take the ${test.title} test`;
    const body = `Hi,\n\n${business.name} would like you to take the ${test.title} test (${test.difficulty}, about ${test.estimatedMinutes} minutes) on Vetter. Your result will be shared with ${business.name}.\n\nStart here: ${link}\n`;
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setEmailsText('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-slate-900">Send to students</h2>
        <p className="text-xs text-slate-500">
          Students who take the test from {business.name}'s link have their results shared with you here.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="share-link" className="block text-xs font-semibold text-slate-700">
          Your link
        </label>
        <div className="flex gap-2">
          <input
            id="share-link"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
          />
          <button
            onClick={copyLink}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy link'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="share-emails" className="block text-xs font-semibold text-slate-700">
          Email it to students
        </label>
        <textarea
          id="share-emails"
          rows={2}
          value={emailsText}
          onChange={(e) => {
            setEmailsText(e.target.value);
            setError(null);
          }}
          placeholder="alex@uni.ac.uk, sam@uni.ac.uk"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
        />
        {error && <p className="text-[11px] font-semibold text-rose-700">{error}</p>}
        <button
          onClick={send}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Send email</span>
        </button>
        <p className="text-[11px] text-slate-500">Opens your email app with the link filled in. Students are BCC'd, so they don't see each other.</p>
      </div>

      {(students.length > 0 || sentTo.size > 0) && (
        <div className="space-y-2 pt-4 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            From your link ({students.length}) &middot; emailed {sentTo.size}
          </h3>
          {students.length === 0 ? (
            <p className="text-xs text-slate-500">Nobody has opened the link yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {students.map(({ candidate: c, best }) => (
                <li key={c.id} className="px-3 py-2.5 flex items-center gap-3 text-xs">
                  <img src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover bg-slate-100 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                    <div className="text-slate-500 truncate">{c.email}</div>
                  </div>
                  <span
                    className={`font-semibold shrink-0 ${
                      best === undefined ? 'text-slate-500' : best >= test.passingScore ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {best === undefined ? 'Not taken yet' : `${best}/100`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
