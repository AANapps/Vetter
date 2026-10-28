import React from 'react';
import { AssessmentTest, Business, User } from '../types';
import { suggestedPeople, trendingTests } from '../lib/feed';

interface FollowSuggestionsProps {
  viewer: User;
  allCandidates: User[];
  businesses: Business[];
  following: string[];
  onToggleFollow: (id: string) => void;
}

// Under the leaderboards in Home's right-hand column: people to follow, and companies
export const FollowSuggestions: React.FC<FollowSuggestionsProps> = ({ viewer, allCandidates, businesses, following, onToggleFollow }) => {
  const people = suggestedPeople(allCandidates, viewer.id, following);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">People to follow</h2>
        {people.length === 0 ? (
          <p className="text-xs text-slate-500">You follow everyone. Impressive.</p>
        ) : (
          <ul className="space-y-3">
            {people.map(({ candidate: person, best }) => (
              <li key={person.id} className="flex items-center gap-3">
                <Avatar src={person.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900 truncate">{person.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {person.title} &middot; best <span className="font-mono">{best}</span>
                  </div>
                </div>
                <FollowButton following={false} onClick={() => onToggleFollow(person.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Companies</h2>
        <ul className="space-y-3">
          {businesses.map((biz) => (
            <li key={biz.id} className="flex items-center gap-3">
              <Avatar src={biz.logo} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 truncate">{biz.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{biz.industry}</div>
              </div>
              <FollowButton following={following.includes(biz.id)} onClick={() => onToggleFollow(biz.id)} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// In the Discover feed: the tests most people are taking this month
export const TrendingTests: React.FC<{ allCandidates: User[]; tests: AssessmentTest[]; onOpenTest: (testId: string) => void }> = ({
  allCandidates,
  tests,
  onOpenTest,
}) => {
  const trending = trendingTests(allCandidates, tests);
  return (
    <>
      {trending.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Trending tests</h2>
          <ol className="space-y-2.5">
            {trending.map(({ test, attempts }, i) => (
              <li key={test.id} className="flex items-baseline gap-2.5 text-xs">
                <span className="font-mono text-slate-400 tabular-nums">{i + 1}</span>
                <div className="min-w-0">
                  <button
                    onClick={() => onOpenTest(test.id)}
                    className="font-semibold text-slate-900 hover:text-indigo-700 text-left"
                  >
                    {test.title}
                  </button>
                  <div className="text-[11px] text-slate-500">
                    {attempts} {attempts === 1 ? 'attempt' : 'attempts'} this month
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
};

const Avatar: React.FC<{ src: string }> = ({ src }) => (
  <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
    <img src={src} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
  </div>
);

export const FollowButton: React.FC<{ following: boolean; onClick: () => void }> = ({ following, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors shrink-0 ${
      following
        ? 'text-slate-600 bg-slate-50 border-slate-200 hover:text-rose-700 hover:border-rose-200'
        : 'text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50'
    }`}
  >
    {following ? 'Following' : 'Follow'}
  </button>
);
