import React from 'react';
import { JobPosting } from '../types';

// Which of the company's jobs a leaderboard's fit column is worked out for
export const FitFor: React.FC<{ jobs: JobPosting[]; job: JobPosting; onPick: (jobId: string) => void }> = ({ jobs, job, onPick }) =>
  jobs.length > 1 ? (
    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      Fit for
      <select value={job.id} onChange={(e) => onPick(e.target.value)} onClick={(e) => e.stopPropagation()} className="max-w-[14rem] px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800">
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
    </label>
  ) : (
    <span className="text-xs text-slate-600">
      Fit for <span className="font-semibold text-slate-800">{job.title}</span>
    </span>
  );
