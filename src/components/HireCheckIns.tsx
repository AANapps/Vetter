import React, { useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { HireCheckIn } from '../types';
import { LeadRow } from '../lib/leads';
import { RATINGS, dueCheckIns, outcomeSummary } from '../lib/outcomes';

// The company home's check-ins on people it hired, 30 and 90 days in: one question, two taps
export const HireCheckIns: React.FC<{ rows: LeadRow[]; onSave: (row: LeadRow, checkIn: HireCheckIn) => void }> = ({ rows, onSave }) => {
  const due = dueCheckIns(rows);
  if (!due.length) return null;
  return (
    <div className="max-w-3xl mx-auto text-left space-y-2">
      {due.slice(0, 3).map(({ row, day }) => (
        <CheckInCard key={row.id} row={row} day={day} onSave={onSave} />
      ))}
    </div>
  );
};

const CheckInCard: React.FC<{ row: LeadRow; day: 30 | 90; onSave: (row: LeadRow, checkIn: HireCheckIn) => void }> = ({ row, day, onSave }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [stayed, setStayed] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const first = row.candidate.name.split(' ')[0];
  return (
    <div className="ai-glass rounded-2xl border border-emerald-200 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <HeartHandshake className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">
            {day} days in: how is {row.candidate.name} doing as {row.job.title}?
          </p>
          <p className="text-xs text-slate-500">Private to you. It shows whether the scores you hired on predict who does well.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {RATINGS.map((label, i) => (
          <button
            key={label}
            onClick={() => setRating(i + 1)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${rating === i + 1 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
        <span>Still with you?</span>
        {[true, false].map((v) => (
          <button
            key={String(v)}
            onClick={() => setStayed(v)}
            className={`px-2.5 py-1 rounded-lg border font-medium ${stayed === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 hover:border-slate-400'}`}
          >
            {v ? 'Yes' : 'No, they left'}
          </button>
        ))}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder={`Anything about ${first}'s work (optional)`}
          className="flex-1 min-w-[12rem] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
        />
        <button
          disabled={rating === null || stayed === null}
          onClick={() => rating !== null && stayed !== null && onSave(row, { day, at: new Date().toISOString(), rating, stillEmployed: stayed, ...(note.trim() && { note: note.trim() }) })}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold"
        >
          Save
        </button>
      </div>
    </div>
  );
};

// For the Granyt team: do higher scores mean better hires? From every company's answered check-ins
export const OutcomeSummary: React.FC<{ rows: LeadRow[] }> = ({ rows }) => {
  const s = outcomeSummary(rows);
  return (
    <div className="max-w-3xl mx-auto text-left ai-glass rounded-2xl border border-slate-200 p-4 text-xs text-slate-700">
      <p className="text-sm font-bold text-slate-900">Hiring outcomes (Granyt team only)</p>
      {s.hires === 0 ? (
        <p className="mt-1">No 30 or 90-day check-ins answered yet. They appear on a company's home 30 days after it marks someone Hired.</p>
      ) : (
        <p className="mt-1">
          {s.hires} hire{s.hires === 1 ? '' : 's'} checked in, {s.stayed} still employed. Doing well (4–5): {s.goodCount}, average fit {s.good ?? '–'}. Not working out (1–2):{' '}
          {s.poorCount}, average fit {s.poor ?? '–'}.
        </p>
      )}
    </div>
  );
};
