import React, { useState } from 'react';
import { LeaderboardRank } from '../types';
import { TrendingUp, Award, ShieldCheck, Search, Flame } from 'lucide-react';

interface LeaderboardViewProps {
  leaderboard: LeaderboardRank[];
  currentUserId: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ leaderboard, currentUserId }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = leaderboard.filter((entry) => {
    if (selectedCategory !== 'all' && !entry.skillName.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }
    if (searchQuery && !entry.candidateName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Verified Engineering Talent Index</h1>
            <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold shadow-2xs">
              Audited by Sandbox Runs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standardized global percentile rankings updated in real-time as engineers complete practical assessments.
          </p>
        </div>

        {/* Search & Domain Filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search talent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-48 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
            {['all', 'Databases', 'System', 'Frontend'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6 font-semibold text-slate-500 w-16 text-center">Rank</th>
                <th className="py-3.5 px-6 font-semibold text-slate-500">Engineer</th>
                <th className="py-3.5 px-6 font-semibold text-slate-500">Primary Domain</th>
                <th className="py-3.5 px-6 font-semibold text-slate-500 text-right">Score</th>
                <th className="py-3.5 px-6 font-semibold text-slate-500 text-right">Percentile</th>
                <th className="py-3.5 px-6 font-semibold text-slate-500">Verified Badges</th>
                <th className="py-3.5 px-6 font-semibold text-slate-500 text-right">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.map((entry) => {
                const isCurrentUser = entry.candidateId === currentUserId;

                return (
                  <tr
                    key={entry.candidateId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrentUser ? 'bg-indigo-50/60' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-4 px-6 text-center font-mono font-bold">
                      {entry.rank === 1 ? (
                        <span className="text-amber-600 flex items-center justify-center gap-1">
                          <Flame className="w-4 h-4 fill-amber-500 text-amber-600" />
                          <span>1</span>
                        </span>
                      ) : entry.rank <= 3 ? (
                        <span className="text-indigo-600">#{entry.rank}</span>
                      ) : (
                        <span className="text-slate-400">#{entry.rank}</span>
                      )}
                    </td>

                    {/* Candidate */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-2xs">
                          <img
                            src={entry.avatarUrl}
                            alt={entry.candidateName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{entry.candidateName}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded font-mono font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {entry.totalAssessmentsPassed} verified assessments passed
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Domain */}
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      {entry.skillName}
                    </td>

                    {/* Score */}
                    <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 tabular-nums text-sm">
                      {entry.score}
                      <span className="text-[10px] text-slate-400 font-normal">/100</span>
                    </td>

                    {/* Percentile */}
                    <td className="py-4 px-6 text-right font-mono font-bold text-indigo-600 tabular-nums">
                      {entry.percentile}th
                    </td>

                    {/* Badges */}
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {entry.badges.map((b) => (
                          <span
                            key={b}
                            className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700 font-mono font-medium"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Activity */}
                    <td className="py-4 px-6 text-right text-slate-500 text-[11px] font-mono">
                      {entry.lastActive}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
