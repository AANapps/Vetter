import React, { useState } from 'react';
import { AssessmentTest, Business, FeedComment, JobPosting, SocialState, User } from '../types';
import {
  FeedFilter,
  FeedItem,
  buildFeed,
  matchesFilter,
  seededKudos,
  timeAgo,
} from '../lib/feed';
import { getBestTestScore } from '../lib/matchingAlgorithm';
import { Heart, MessageCircle } from 'lucide-react';
import { DiscoverSidebar, FollowButton } from './DiscoverSidebar';
import { LiveLeaderboards } from './LiveLeaderboards';

interface DiscoverFeedProps {
  candidate: User;
  allCandidates: User[];
  tests: AssessmentTest[];
  jobs: JobPosting[];
  businesses: Business[];
  social: SocialState;
  onSocialChange: (update: (prev: SocialState) => SocialState) => void;
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
}

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'following', label: 'Following' },
  { id: 'result', label: 'Results' },
  { id: 'post', label: 'Posts' },
  { id: 'job', label: 'Jobs' },
];

const PAGE_SIZE = 20;
const MAX_POST_LENGTH = 500;

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const Avatar: React.FC<{ src: string; size?: 'sm' | 'md' }> = ({ src, size = 'md' }) => (
  <div
    className={`${size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'} rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100`}
  >
    <img src={src} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
  </div>
);

export const DiscoverFeed: React.FC<DiscoverFeedProps> = ({
  candidate,
  allCandidates,
  tests,
  jobs,
  businesses,
  social,
  onSocialChange,
  onOpenTest,
  onOpenJob,
}) => {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [draft, setDraft] = useState('');
  const [draftTestId, setDraftTestId] = useState('');

  const feed = buildFeed(allCandidates, tests, jobs, businesses, social.posts);
  const filtered = feed.filter((item) => matchesFilter(item, filter, social.following));
  const visible = filtered.slice(0, visibleCount);

  // Results the candidate can attach to a post: Vetter tests they've taken
  const shareableTests = tests.filter((t) => t.type === 'standard' && getBestTestScore(candidate, t.id) !== undefined);

  const toggleFollow = (id: string) =>
    onSocialChange((prev) => ({
      ...prev,
      following: prev.following.includes(id) ? prev.following.filter((f) => f !== id) : [...prev.following, id],
    }));

  const toggleKudos = (itemId: string) =>
    onSocialChange((prev) => ({
      ...prev,
      kudosGiven: prev.kudosGiven.includes(itemId)
        ? prev.kudosGiven.filter((k) => k !== itemId)
        : [...prev.kudosGiven, itemId],
    }));

  const addComment = (itemId: string, text: string) => {
    const comment: FeedComment = { id: newId('cmt'), authorId: candidate.id, text, createdAt: new Date().toISOString() };
    onSocialChange((prev) => ({
      ...prev,
      comments: { ...prev.comments, [itemId]: [...(prev.comments[itemId] ?? []), comment] },
    }));
  };

  const publishPost = () => {
    const text = draft.trim();
    if (!text) return;
    onSocialChange((prev) => ({
      ...prev,
      posts: [
        {
          id: newId('post'),
          authorId: candidate.id,
          text,
          createdAt: new Date().toISOString(),
          sharedTestId: draftTestId || undefined,
        },
        ...prev.posts,
      ],
    }));
    setDraft('');
    setDraftTestId('');
    setFilter('all');
  };

  const deletePost = (postId: string) =>
    onSocialChange((prev) => {
      const { [postId]: _removed, ...comments } = prev.comments;
      return { ...prev, posts: prev.posts.filter((p) => p.id !== postId), comments };
    });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Discover</h1>
        <p className="text-xs text-slate-500 mt-1">
          Live leaderboards, and what people on Vetter are passing, sharing and hiring for.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <LiveLeaderboards tests={tests} allCandidates={allCandidates} viewerId={candidate.id} onOpenTest={onOpenTest} />

          {/* Composer */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex gap-3">
              <Avatar src={candidate.avatarUrl} />
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_POST_LENGTH))}
                placeholder="Share a win, a tip, or ask the community something..."
                rows={2}
                className="flex-1 min-w-0 resize-none text-sm text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pl-0 sm:pl-13">
              <select
                value={draftTestId}
                onChange={(e) => setDraftTestId(e.target.value)}
                disabled={shareableTests.length === 0}
                className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 max-w-full"
              >
                <option value="">{shareableTests.length === 0 ? 'Take a test to share a result' : 'Attach a result (optional)'}</option>
                {shareableTests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {getBestTestScore(candidate, t.id)}/100
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-3 ml-auto">
                {draft.length > MAX_POST_LENGTH - 80 && (
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">{MAX_POST_LENGTH - draft.length}</span>
                )}
                <button
                  onClick={publishPost}
                  disabled={!draft.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-xs"
                >
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs w-fit max-w-full">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  filter === f.id ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Feed */}
          {visible.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 shadow-xs">
              {filter === 'following'
                ? 'Nothing from people or companies you follow yet. Follow a few from the suggestions.'
                : 'Nothing here yet.'}
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((item) => (
                <FeedCard
                  key={item.id}
                  item={item}
                  viewer={candidate}
                  allCandidates={allCandidates}
                  following={social.following}
                  comments={social.comments[item.id] ?? []}
                  hasKudos={social.kudosGiven.includes(item.id)}
                  onToggleKudos={() => toggleKudos(item.id)}
                  onToggleFollow={toggleFollow}
                  onAddComment={(text) => addComment(item.id, text)}
                  onDeletePost={deletePost}
                  onOpenTest={onOpenTest}
                  onOpenJob={onOpenJob}
                />
              ))}
              {filtered.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="w-full py-2.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors"
                >
                  Show more
                </button>
              )}
            </div>
          )}
        </div>

        <DiscoverSidebar
          viewer={candidate}
          allCandidates={allCandidates}
          tests={tests}
          businesses={businesses}
          following={social.following}
          onToggleFollow={toggleFollow}
          onOpenTest={onOpenTest}
        />
      </div>
    </div>
  );
};

interface FeedCardProps {
  item: FeedItem;
  viewer: User;
  allCandidates: User[];
  following: string[];
  comments: FeedComment[];
  hasKudos: boolean;
  onToggleKudos: () => void;
  onToggleFollow: (id: string) => void;
  onAddComment: (text: string) => void;
  onDeletePost: (postId: string) => void;
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({
  item,
  viewer,
  allCandidates,
  following,
  comments,
  hasKudos,
  onToggleKudos,
  onToggleFollow,
  onAddComment,
  onDeletePost,
  onOpenTest,
  onOpenJob,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [reply, setReply] = useState('');

  // Who the card is about: a candidate, or the company behind a job
  const subject =
    item.kind === 'job'
      ? { id: item.job.businessId, name: item.job.companyName, avatar: item.business?.logo ?? item.job.companyLogo, subtitle: item.business?.industry }
      : { id: item.actor.id, name: item.actor.name, avatar: item.actor.avatarUrl, subtitle: item.actor.title };
  const isViewer = subject.id === viewer.id;
  const kudosCount = seededKudos(item.id) + (hasKudos ? 1 : 0);

  const submitReply = () => {
    const text = reply.trim();
    if (!text) return;
    onAddComment(text);
    setReply('');
  };

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
      <header className="flex items-start gap-3">
        <Avatar src={subject.avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-slate-900">{isViewer ? `${subject.name} (you)` : subject.name}</span>
            <span className="text-[11px] text-slate-400">{timeAgo(item.date)}</span>
          </div>
          {subject.subtitle && <div className="text-xs text-slate-500 truncate">{subject.subtitle}</div>}
        </div>
        {!isViewer && subject.id && (
          <FollowButton following={following.includes(subject.id)} onClick={() => onToggleFollow(subject.id!)} />
        )}
        {item.kind === 'post' && isViewer && (
          <button
            onClick={() => onDeletePost(item.post.id)}
            className="text-[11px] font-semibold text-slate-400 hover:text-rose-700 transition-colors shrink-0"
          >
            Delete
          </button>
        )}
      </header>

      {item.kind === 'result' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            {item.improvedFrom !== undefined ? 'Set a new personal best on ' : 'Passed '}
            <button onClick={() => onOpenTest(item.test.id)} className="font-semibold text-slate-900 hover:text-indigo-700">
              {item.test.title}
            </button>
            {item.improvedFrom !== undefined && <span className="text-slate-500"> (up from {item.improvedFrom})</span>}
          </p>
          <ResultChip test={item.test} score={item.score} rank={item.rank} onOpenTest={onOpenTest} />
        </div>
      )}

      {item.kind === 'post' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{item.post.text}</p>
          {item.sharedTest && (
            <ResultChip test={item.sharedTest} score={item.sharedScore} onOpenTest={onOpenTest} />
          )}
        </div>
      )}

      {item.kind === 'job' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">Is hiring.</p>
          <button
            onClick={() => onOpenJob(item.job.id)}
            className="w-full text-left p-4 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors space-y-1"
          >
            <div className="text-sm font-semibold text-slate-900">{item.job.title}</div>
            <div className="text-xs text-slate-500">
              {item.job.location} &middot; {item.job.workType} &middot; {item.job.salaryRange}
            </div>
            {item.job.attachedTestTitle && (
              <div className="text-[11px] font-mono text-indigo-700 pt-1">Test: {item.job.attachedTestTitle}</div>
            )}
          </button>
        </div>
      )}

      {/* Reactions */}
      <footer className="flex items-center gap-4 pt-3 border-t border-slate-100 text-xs">
        <button
          onClick={onToggleKudos}
          aria-pressed={hasKudos}
          className={`flex items-center gap-1.5 font-semibold transition-colors ${
            hasKudos ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${hasKudos ? 'fill-current' : ''}`} />
          <span>Kudos{kudosCount > 0 && <span className="tabular-nums"> · {kudosCount}</span>}</span>
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          aria-expanded={showComments}
          className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-indigo-700 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>
            {comments.length === 0 ? 'Comment' : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
          </span>
        </button>
      </footer>

      {showComments && (
        <div className="space-y-3">
          {comments.map((c) => {
            const author = allCandidates.find((u) => u.id === c.authorId);
            if (!author) return null;
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar src={author.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1 bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-slate-900">{author.name}</span>
                    <span className="text-[11px] text-slate-400">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">{c.text}</p>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2.5">
            <Avatar src={viewer.avatarUrl} size="sm" />
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value.slice(0, MAX_POST_LENGTH))}
              onKeyDown={(e) => e.key === 'Enter' && submitReply()}
              placeholder="Write a comment..."
              className="flex-1 min-w-0 text-xs text-slate-900 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={submitReply}
              disabled={!reply.trim()}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              Reply
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

const ResultChip: React.FC<{ test: AssessmentTest; score?: number; rank?: number; onOpenTest: (testId: string) => void }> = ({
  test,
  score,
  rank,
  onOpenTest,
}) => (
  <button
    onClick={() => onOpenTest(test.id)}
    className="w-full flex items-center justify-between gap-4 p-4 bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 rounded-lg transition-colors text-left"
  >
    <div className="min-w-0">
      <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 font-bold">{test.category}</div>
      <div className="text-xs font-semibold text-slate-900 truncate">{test.title}</div>
      {rank !== undefined && <div className="text-[11px] text-slate-500 mt-0.5">#{rank} on this test</div>}
    </div>
    {score !== undefined && (
      <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums shrink-0">
        {score}
        <span className="text-xs text-slate-400 font-normal">/100</span>
      </div>
    )}
  </button>
);
