import React, { useEffect, useRef, useState } from 'react';
import { AiMark, BrandSparkle, BrandWordmark } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { Pic } from './Pic';
import { UserRole } from '../types';
import { ArrowLeftRight,
  BookOpen, Building2, LogOut, Menu, ShieldCheck, Trophy, X, Bell, Briefcase, ChevronDown, ClipboardCheck, GraduationCap, House, UsersRound, FolderKanban, Repeat, Search, Users, ListTodo, UserRound, MoreHorizontal, ExternalLink } from 'lucide-react';

export type AppTab =
  | 'home'
  | 'profile'
  | 'work'
  | 'jobs'
  | 'tests'
  | 'companies'
  | 'learn'
  | 'upskill'
  | 'business-home'
  | 'business-jobs'
  | 'business-tests'
  | 'business-candidates'
  | 'business-team'
  | 'business-projects'
  | 'business-training'
  | 'ranked'
  | 'guides';

type TabIcon = React.ComponentType<{ className?: string }>;

// Companies have jobs, tests and candidates: each job's tests go out to candidates, who take them
export const NAV_TABS: Record<'candidate' | 'recruiter', { id: AppTab; label: string; icon: TabIcon; group?: string }[]> = {
  // Kept to what a candidate does when looking for work: their home, tests, jobs, where they rank and their profile.
  // Work from their team is a
  // mode of its own, switched to from their name (Work mode). The rest is
  // under More (MORE_TABS)
  candidate: [
    { id: 'home', label: 'Home', icon: House },
    { id: 'tests', label: 'Tests', icon: ClipboardCheck },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'ranked', label: 'Ranked', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: UserRound },
  ],
  // The first is the AI chat (Create with AI); then two groups kept apart: hiring (jobs, candidates and the tests they
  // take) and the company's own people (the team, training). Projects & CRM is a mode of its own (Work), opened from
  // the name menu in a new tab (STAFF_WORK_TAB)
  recruiter: [
    { id: 'business-home', label: 'Home', icon: House },
    { id: 'business-jobs', label: 'Jobs', icon: Briefcase, group: 'Hiring' },
    { id: 'business-candidates', label: 'Candidates', icon: Users, group: 'Hiring' },
    { id: 'business-tests', label: 'Tests', icon: ClipboardCheck, group: 'Hiring' },
    { id: 'business-team', label: 'Team', icon: UsersRound, group: 'Your team' },
    { id: 'business-training', label: 'Training', icon: GraduationCap, group: 'Your team' },
  ],
};

// A company's Work mode: its projects and CRM, kept apart from hiring
const STAFF_WORK_TAB: { id: AppTab; label: string; icon: TabIcon; group?: string } = { id: 'business-projects', label: 'Projects & CRM', icon: FolderKanban };

// A candidate's other pages, under More: still a click away, never in the way
export const MORE_TABS: { id: AppTab; label: string; icon: TabIcon; blurb: string }[] = [
  { id: 'learn', label: 'Courses', icon: Repeat, blurb: 'Switch career or grow in the job you have' },
];

const VIEWS: { role: UserRole; label: string }[] = [
  { role: 'candidate', label: 'candidate view' },
  { role: 'recruiter', label: 'business view' },
  { role: 'admin', label: 'Praxa team view' },
];

export interface NavNotification {
  id: string;
  text: string;
  detail: string;
  when: string;
  read: boolean;
}

interface NavigationProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  activeRole: UserRole;
  // Who's looking isn't known yet: just the logo, so the wrong menu never flashes up
  pending?: boolean;
  onRoleChange: (role: UserRole) => void;
  // With accounts: sign in and out, and the view switcher only for the Praxa team. Without, the demo's view switcher
  accounts?: {
    signedIn: boolean;
    email?: string;
    canSwitchViews: boolean;
    onSignIn: () => void;
    onJoin: () => void;
    onSignOut: () => void;
  };
  userAvatar: string;
  userName: string;
  userTitle: string;
  // The signed-in candidate's notifications, newest first
  notifications?: NavNotification[];
  onOpenNotification?: (id: string) => void;
  // Signed-out visitors get a plain website header instead of the app's
  visitor?: { onSignIn: () => void; onJoin: () => void };
  // The search box, rendered in the bar (and full width on phones)
  renderSearch: (mobile: { onClose: () => void } | null) => React.ReactNode;
  // Companies: start a fresh chat with Praxa on the home page
  onNewChat?: () => void;
  // Candidates: what their teams have sent them, shown on the Work mode switch
  work?: { open: number; late: number; companies?: string[] };
}

// The sparkle and the name in the brand's gradient: ✦ Praxa
const Wordmark: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} aria-label="Praxa home" className="flex items-center shrink-0 hover:opacity-85 transition-opacity">
    <BrandWordmark />
  </button>
);

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  activeRole,
  pending,
  onRoleChange,
  accounts,
  userAvatar,
  userName,
  userTitle,
  notifications,
  onOpenNotification,
  visitor,
  renderSearch,
  onNewChat,
  work,
}) => {
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unread = notifications?.filter((n) => !n.read).length ?? 0;
  const tabs = NAV_TABS[activeRole === 'candidate' ? 'candidate' : 'recruiter'];
  // A candidate in Work mode: the bar shows the mode instead of the job-seeking tabs
  const inWork = activeRole === 'candidate' && currentTab === 'work';
  // A company in Work mode (Projects & CRM): the menu shows only that
  const staffWork = activeRole !== 'candidate' && currentTab === 'business-projects';
  const [isMeOpen, setIsMeOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBottomRef = useRef<HTMLDivElement>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const meRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!meRef.current?.contains(e.target as Node)) setIsMeOpen(false);
      if (!bellRef.current?.contains(e.target as Node)) setIsBellOpen(false);
      if (!moreRef.current?.contains(e.target as Node) && !moreBottomRef.current?.contains(e.target as Node)) setIsMoreOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // The account menu: who's signed in, guides, the admin page and view switcher for the Praxa team, sign out
  const meMenu = () => (
    <>
      <div className="flex items-center gap-3">
                  <Pic src={userAvatar} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover bg-slate-100 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{userName}</div>
                    <div className="text-xs text-slate-500 line-clamp-2">{userTitle}</div>
                  </div>
                </div>
                {activeRole === 'candidate' && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onTabChange('profile');
                      setIsMeOpen(false);
                    }}
                    className="w-full py-1.5 text-xs font-semibold text-indigo-700 bg-white rounded-full"
                  >
                    View profile
                  </button>
                )}
                {/* A company's two modes: hiring, and Work (projects and the CRM), which opens in its own tab */}
                {activeRole !== 'candidate' && (
                  <div className="space-y-1">
                    <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mode</div>
                    {(
                      [
                        { id: 'hiring', label: 'Hiring', blurb: 'Jobs, candidates, tests and your team', icon: Briefcase, active: !staffWork },
                        { id: 'work', label: 'Work', blurb: 'Projects and CRM, in a new tab', icon: FolderKanban, active: staffWork },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        role="menuitemradio"
                        aria-checked={m.active}
                        onClick={() => {
                          setIsMeOpen(false);
                          if (m.active) return;
                          if (m.id === 'work') window.open('/business/projects/', '_blank', 'noopener');
                          else onTabChange('business-home');
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left border ${m.active ? 'border-indigo-300 bg-indigo-50' : 'border-transparent hover:bg-slate-100'}`}
                      >
                        <m.icon className={`w-4 h-4 shrink-0 ${m.active ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">{m.label}</span>
                          <span className="block text-[11px] text-slate-500">{m.blurb}</span>
                        </span>
                        {m.active ? <span className="w-2 h-2 rounded-full bg-indigo-600" /> : m.id === 'work' && <ExternalLink className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    ))}
                  </div>
                )}
                {/* Two modes: looking for work, and Work (what their teams send them) */}
                {activeRole === 'candidate' && (
                  <div className="space-y-1">
                    <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mode</div>
                    {(
                      [
                        { id: 'seek', label: 'Job seeking', blurb: 'Tests, jobs and your profile', icon: Briefcase, active: !inWork, go: 'home' as AppTab },
                        {
                          id: 'work',
                          label: 'Work',
                          blurb: `${work?.companies?.length ? `${work.companies.join(', ')} · ` : ''}${work && work.open ? `${work.open} to do${work.late ? ` · ${work.late} late` : ''}` : 'Projects, tasks and training'}`,
                          icon: ListTodo,
                          active: inWork,
                          go: 'work' as AppTab,
                        },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        role="menuitemradio"
                        aria-checked={m.active}
                        onClick={() => {
                          setIsMeOpen(false);
                          // Work opens in a tab of its own, as the company's workspace does; job seeking comes back here
                          if (m.id === 'work' && !m.active) window.open('/work/', '_blank', 'noopener');
                          else if (!m.active) onTabChange(m.go);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left border ${m.active ? 'border-indigo-300 bg-indigo-50' : 'border-transparent hover:bg-slate-100'}`}
                      >
                        <m.icon className={`w-4 h-4 shrink-0 ${m.active ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">{m.label}</span>
                          <span className={`block text-[11px] ${m.id === 'work' && work?.late ? 'text-rose-600' : 'text-slate-500'}`}>{m.blurb}</span>
                        </span>
                        {m.active ? <span className="w-2 h-2 rounded-full bg-indigo-600" /> : m.id === 'work' && <ExternalLink className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  role="menuitem"
                  onClick={() => {
                    onTabChange('guides');
                    setIsMeOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-slate-700 bg-white rounded-full"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>How-to guides</span>
                </button>
                <ThemeToggle />
                {accounts?.email && <div className="text-[11px] text-slate-500 truncate -mt-1">{accounts.email}</div>}
                {/* The Praxa team's admin page */}
                {accounts?.canSwitchViews && (
                  <a
                    role="menuitem"
                    href="/admin"
                    className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin panel</span>
                  </a>
                )}
                {/* The demo's views, and with accounts the Praxa team's */}
                {(!accounts || accounts.canSwitchViews) && VIEWS.filter((v) => v.role !== activeRole).map((v) => (
                  <button
                    key={v.role}
                    role="menuitem"
                    onClick={() => {
                      onRoleChange(v.role);
                      setIsMeOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-slate-700 bg-white rounded-full"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Switch to {v.label}</span>
                  </button>
                ))}
                {accounts && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsMeOpen(false);
                      accounts.onSignOut();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border-t border-slate-100 pt-3"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                )}
    </>
  );

  // Companies and the Praxa team: laid out like a chat app, with the menu down the right
  if (!pending && !visitor && activeRole !== 'candidate')
    return (
      <StaffNav
        tabs={staffWork ? [STAFF_WORK_TAB] : tabs}
        currentTab={currentTab}
        onTabChange={onTabChange}
        onNewChat={onNewChat}
        renderSearch={renderSearch}
        userAvatar={userAvatar}
        userName={userName}
        userTitle={userTitle}
        meMenu={meMenu}
        isMeOpen={isMeOpen}
        setIsMeOpen={setIsMeOpen}
        meRef={meRef}
      />
    );

  if (pending)
    return (
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200" aria-busy="true">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Wordmark onClick={() => {}} />
        </div>
      </header>
    );
  if (visitor) return <VisitorHeader currentTab={currentTab} onTabChange={onTabChange} {...visitor} />;

  const tabButton = (tab: (typeof tabs)[number], placement: 'top' | 'bottom') => {
    const Icon = tab.icon;
    const isActive = currentTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
          placement === 'top' ? 'h-14 min-w-[4.5rem] px-2' : 'flex-1 min-w-0 h-14 px-0.5'
        } ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : ''}`} />
        <span className={`${placement === 'top' ? 'text-[11px]' : 'text-[10px] max-w-full truncate'} ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
        {isActive && (
          <span
            className={`absolute left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-slate-900 ${
              placement === 'top' ? 'bottom-0 w-full' : 'top-0 w-10'
            }`}
          />
        )}
      </button>
    );
  };

  // A candidate's other pages: a small menu opening down from the top bar. top: among the page links (tablets and up);
  // phone: an icon of its own in the phone's top bar, left of Notifications
  const moreButton = (placement: 'top' | 'phone') => {
    const isActive = MORE_TABS.some((t) => t.id === currentTab) || currentTab === 'upskill';
    return (
      <div ref={placement === 'top' ? moreRef : moreBottomRef} className={`relative ${placement === 'phone' ? 'md:hidden' : ''}`}>
        <button
          onClick={() => setIsMoreOpen((o) => !o)}
          aria-expanded={isMoreOpen}
          aria-haspopup="menu"
          aria-label={placement === 'phone' ? 'More pages' : undefined}
          className={`relative w-full flex flex-col items-center justify-center gap-0.5 transition-colors ${placement === 'top' ? 'h-14 min-w-[4.5rem] px-2' : 'h-14 min-w-[3rem] px-1'} ${
            isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MoreHorizontal className={`w-5 h-5 ${isActive ? 'text-indigo-600' : ''}`} />
          {placement === 'top' && (
            <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'} inline-flex items-center`}>
              More
              <ChevronDown className="w-3 h-3" />
            </span>
          )}
        </button>
        {isMoreOpen && (
          <div role="menu" className="absolute right-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] menu-panel z-50 p-1.5">
            {MORE_TABS.map((t) => (
              <button
                key={t.id}
                role="menuitem"
                onClick={() => {
                  onTabChange(t.id);
                  setIsMoreOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-100 ${currentTab === t.id || (t.id === 'learn' && currentTab === 'upskill') ? 'bg-slate-100' : ''}`}
              >
                <t.icon className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{t.label}</span>
                  <span className="block text-xs text-slate-500">{t.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Wordmark onClick={() => onTabChange(tabs[0].id)} />

          {/* Search: inline from tablet up, an icon on phones */}
          <div className="hidden md:block w-72 lg:w-80">{renderSearch(null)}</div>
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className="md:hidden flex-1 h-9 flex items-center gap-2 px-3 bg-slate-100 rounded-md text-sm text-slate-500 text-left"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>

          <nav className="hidden md:flex items-center ml-auto">
            {inWork ? (
              <button
                onClick={() => setIsMeOpen(true)}
                className="h-9 px-4 mr-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold inline-flex items-center gap-2"
                title="Switch mode"
              >
                <ListTodo className="w-4 h-4" />
                {work?.companies?.length ? <span className="max-w-[16rem] truncate">Work · {work.companies.join(', ')}</span> : 'Work mode'}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                {tabs.map((tab) => tabButton(tab, 'top'))}
                {activeRole === 'candidate' && moreButton('top')}
              </>
            )}
          </nav>

          {/* Phones: More sits up here, left of Notifications */}
          {activeRole === 'candidate' && !inWork && moreButton('phone')}

          {notifications && (
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setIsBellOpen((o) => !o)}
                aria-expanded={isBellOpen}
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                className="relative h-14 min-w-[3.5rem] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="hidden md:block text-[11px] font-medium">Notifications</span>
                {unread > 0 && (
                  <span className="absolute top-2 left-1/2 ml-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unread}
                  </span>
                )}
              </button>
              {isBellOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 menu-panel z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-900">Notifications</div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-xs text-slate-500 text-center">Nothing new.</p>
                  ) : (
                    <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <button
                            onClick={() => {
                              onOpenNotification?.(n.id);
                              setIsBellOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-100 ${n.read ? '' : 'bg-indigo-50/40'}`}
                          >
                            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-indigo-600'}`} />
                            <span className="min-w-0">
                              <span className="block text-xs text-slate-900">{n.text}</span>
                              <span className="block text-[11px] text-slate-500 mt-0.5">{n.detail}</span>
                              <span className="block text-[11px] text-slate-400 mt-0.5">{n.when}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {accounts && !accounts.signedIn && (
            <div className="flex items-center gap-2 pl-2 md:border-l md:border-slate-200 md:ml-1">
              <button onClick={accounts.onSignIn} className="px-3 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900">
                Sign in
              </button>
              <button onClick={accounts.onJoin} className="px-3.5 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full">
                Join now
              </button>
            </div>
          )}

          {/* Me: account and view switcher */}
          {(!accounts || accounts.signedIn) && (
          <div ref={meRef} className="relative md:border-l md:border-slate-200 md:pl-2 md:ml-1">
            <button
              onClick={() => setIsMeOpen((o) => !o)}
              aria-expanded={isMeOpen}
              aria-haspopup="menu"
              className="h-14 min-w-[4rem] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span className="relative">
                <Pic src={userAvatar} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover bg-slate-100" />
                {/* Work waiting from their team, while they're job seeking */}
                {!inWork && !!work?.open && (
                  <span className={`absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white ${work.late ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                    {work.open}
                  </span>
                )}
              </span>
              <span className="hidden md:flex items-center text-[11px] font-medium">
                Me <ChevronDown className="w-3 h-3" />
              </span>
            </button>

            {isMeOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1 w-64 menu-panel p-4 space-y-3 z-50">
                {meMenu()}
              </div>
            )}
          </div>
          )}
        </div>

        {isMobileSearchOpen && (
          <div className="md:hidden absolute inset-x-0 top-0 h-14 px-4 flex items-center bg-white border-b border-slate-200">
            {renderSearch({ onClose: () => setIsMobileSearchOpen(false) })}
          </div>
        )}
      </header>

      {/* Phones: tabs along the bottom, like the LinkedIn app */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        {inWork ? (
          <button onClick={() => onTabChange('home')} className="flex-1 h-14 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            Back to job seeking
          </button>
        ) : (
          <>
            {tabs.map((tab) => tabButton(tab, 'bottom'))}
          </>
        )}
      </nav>
    </>
  );
};

// Signed out, Praxa is a website: the name, what's on it, and signing in or joining
const VisitorHeader: React.FC<{ currentTab: AppTab; onTabChange: (tab: AppTab) => void; onSignIn: () => void; onJoin: () => void }> = ({
  currentTab,
  onTabChange,
  onSignIn,
  onJoin,
}) => {
  const links: { id: AppTab; label: string }[] = [
    // Only what a newcomer needs; Leaderboards and Courses are in the footer
    { id: 'tests', label: 'Tests' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'guides', label: 'Guides' },
  ];
  // Clear glass over the hero, firming up with an edge once the page scrolls under it
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl backdrop-saturate-150 border-b transition-colors duration-300 ${
        scrolled ? 'bg-white/80 border-slate-200/80' : 'bg-white/40 border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
        <button onClick={() => onTabChange('home')} aria-label="Praxa home" className="flex items-center gap-2 mr-4">
          <BrandWordmark />
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => onTabChange(l.id)}
              aria-current={currentTab === l.id ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                currentTab === l.id ? 'text-slate-900 bg-slate-900/[0.06]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle compact />
          <button onClick={onSignIn} className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900">
            Sign in
          </button>
          <button onClick={onJoin} className="px-4 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-full">
            Join free
          </button>
        </div>
      </div>
      {/* Phones: the same links in a row under the bar */}
      <nav className="md:hidden flex items-center gap-1 px-4 pb-2 -mt-1 overflow-x-auto">
        {links.map((l) => (
          <button
            key={l.id}
            onClick={() => onTabChange(l.id)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${currentTab === l.id ? 'text-slate-900 bg-slate-100' : 'text-slate-600'}`}
          >
            {l.label}
          </button>
        ))}
      </nav>
    </header>
  );
};

// Companies' and the Praxa team's menu, like a chat app's: a panel down the left of the window with a new chat,
// search, the pages and the account. On phones and tablets it slides in from the left from a slim top bar
const StaffNav: React.FC<{
  tabs: { id: AppTab; label: string; icon: TabIcon; group?: string }[];
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onNewChat?: () => void;
  renderSearch: (mobile: { onClose: () => void } | null) => React.ReactNode;
  userAvatar: string;
  userName: string;
  userTitle: string;
  meMenu: () => React.ReactNode;
  isMeOpen: boolean;
  setIsMeOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  meRef: React.RefObject<HTMLDivElement | null>;
}> = ({ tabs, currentTab, onTabChange, onNewChat, renderSearch, userAvatar, userName, userTitle, meMenu, isMeOpen, setIsMeOpen, meRef }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Wide screens: a rail of icons that slides open over the page while the pointer (or keyboard focus) is on it
  const [railOpen, setRailOpen] = useState(false);
  const railTimer = useRef<number | undefined>(undefined);
  const openRail = () => {
    window.clearTimeout(railTimer.current);
    railTimer.current = window.setTimeout(() => setRailOpen(true), 120);
  };
  const closeRail = () => {
    window.clearTimeout(railTimer.current);
    railTimer.current = window.setTimeout(() => {
      setRailOpen(false);
      setIsMeOpen(false);
    }, 200);
  };
  useEffect(() => () => window.clearTimeout(railTimer.current), []);
  const go = (tab: AppTab) => {
    onTabChange(tab);
    setDrawerOpen(false);
    setRailOpen(false);
  };
  // Closes with Escape, and the page behind doesn't scroll while it's open
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [drawerOpen]);

  // Home is the chat; the rest are the company's pages, then the shared ones
  const pages = tabs.filter((t) => t.id !== tabs[0].id);
  const extra: { id: AppTab; label: string; icon: TabIcon }[] = [{ id: 'guides', label: 'How-to guides', icon: BookOpen }];
  const item = (t: { id: AppTab; label: string; icon: TabIcon }, collapsed = false) => {
    const Icon = t.icon;
    const active = currentTab === t.id;
    return (
      <button
        key={t.id}
        onClick={() => go(t.id)}
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? t.label : undefined}
        title={collapsed ? t.label : undefined}
        className={`w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm transition-colors ${
          active ? 'bg-slate-200/70 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
        {!collapsed && <span className="truncate whitespace-nowrap">{t.label}</span>}
      </button>
    );
  };

  const panel = (collapsed: boolean) => (
    <div className="h-full flex flex-col bg-slate-50 border-r border-slate-200">
      <div className={`h-14 flex items-center justify-between gap-2 shrink-0 ${collapsed ? 'px-3' : 'px-4'}`}>
        {collapsed ? (
          <button onClick={() => go(tabs[0].id)} aria-label="Praxa home" className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-200/60">
            <BrandSparkle className="w-6 h-6" />
          </button>
        ) : (
          <Wordmark onClick={() => go(tabs[0].id)} />
        )}
        <button onClick={() => setDrawerOpen(false)} className="lg:hidden p-2 -mr-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60" aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-3 space-y-2 shrink-0">
        {collapsed ? (
          <>
            <button
              onClick={() => {
                onNewChat?.();
                go(tabs[0].id);
              }}
              aria-label="Create with AI"
              title="Create with AI"
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-sm"
            >
              <AiMark bare className="w-4 h-4" />
            </button>
            <button onClick={() => setRailOpen(true)} aria-label="Search people and tests" title="Search" className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-900">
              <Search className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                onNewChat?.();
                go(tabs[0].id);
              }}
              className="w-full h-10 flex items-center justify-center gap-2 px-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:via-violet-500 hover:to-fuchsia-500 shadow-sm whitespace-nowrap"
            >
              <AiMark bare className="w-4 h-4" />
              Create with AI
            </button>
            <div className="[&_input]:bg-white">{renderSearch(null)}</div>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-0.5" aria-label="Pages">
        {pages.map((t, i) => (
          <React.Fragment key={t.id}>
            {/* A heading over each group: Hiring, then Project Manager */}
            {t.group && t.group !== pages[i - 1]?.group &&
              (collapsed ? <div className="my-3 mx-2 border-t border-slate-200" /> : <div className="pt-4 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">{t.group}</div>)}
            {item(t, collapsed)}
          </React.Fragment>
        ))}
        {collapsed ? <div className="my-3 mx-2 border-t border-slate-200" /> : <div className="pt-4 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">More</div>}
        {extra.map((t) => item(t, collapsed))}
      </nav>

      {/* The account, its menu opening upwards */}
      <div ref={collapsed ? undefined : meRef} className="relative p-3 border-t border-slate-200 shrink-0">
        <button
          onClick={() => (collapsed ? setRailOpen(true) : setIsMeOpen((o) => !o))}
          aria-expanded={isMeOpen}
          aria-haspopup="menu"
          aria-label={collapsed ? userName : undefined}
          className={`w-full flex items-center gap-3 py-2 rounded-lg hover:bg-slate-200/50 text-left ${collapsed ? 'px-1 justify-center' : 'px-2'}`}
        >
          <Pic src={userAvatar} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover bg-slate-100 shrink-0" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 truncate">{userName}</span>
                <span className="block text-[11px] text-slate-500 truncate">{userTitle}</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isMeOpen ? '' : 'rotate-180'}`} />
            </>
          )}
        </button>
        {isMeOpen && !collapsed && (
          <div role="menu" className="absolute bottom-full right-3 left-3 mb-1 menu-panel p-4 space-y-3 z-50">
            {meMenu()}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Wide screens: always there, down the left */}
      {/* Wide screens: a rail of icons down the left; it slides open to the full menu, over the page, on hover */}
      <aside
        onMouseEnter={openRail}
        onMouseLeave={() => !isMeOpen && closeRail()}
        onFocus={() => setRailOpen(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && !isMeOpen && closeRail()}
        className={`hidden lg:block fixed inset-y-0 left-0 z-40 overflow-hidden transition-[width,box-shadow] duration-200 ease-out ${
          railOpen ? 'w-64 shadow-2xl shadow-slate-900/15' : 'w-16'
        }`}
      >
        <div className={railOpen ? 'w-64 h-full' : 'w-16 h-full'}>{panel(!railOpen)}</div>
      </aside>

      {/* Phones and tablets: a slim bar, and the panel slides in from the left */}
      <header className="lg:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button onClick={() => setDrawerOpen(true)} className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100" aria-label="Open menu" aria-expanded={drawerOpen}>
            <Menu className="w-5 h-5" />
          </button>
          <Wordmark onClick={() => go(tabs[0].id)} />
        </div>
        <button
          onClick={() => {
            onNewChat?.();
            go(tabs[0].id);
          }}
          className="create-border px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          Create with AI
        </button>
      </header>
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40 animate-[fade-in_150ms_ease-out]" onClick={() => setDrawerOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-[slide-in-left_200ms_ease-out]">
            {panel(false)}
          </div>
        </div>
      )}
    </>
  );
};
