import React, { useEffect, useRef, useState } from 'react';
import { UserRole } from '../types';
import { ArrowLeftRight,
  LogOut, Bell, Briefcase, ChevronDown, ClipboardCheck, House, Search, Tag, Users } from 'lucide-react';

export type AppTab =
  | 'home'
  | 'profile'
  | 'jobs'
  | 'tests'
  | 'companies'
  | 'business-jobs'
  | 'business-tests'
  | 'business-candidates'
  | 'pricing';

type TabIcon = React.ComponentType<{ className?: string }>;

// Companies have jobs, tests and candidates: each job's tests go out to candidates, who take them
export const NAV_TABS: Record<'candidate' | 'recruiter', { id: AppTab; label: string; icon: TabIcon }[]> = {
  candidate: [
    { id: 'home', label: 'Home', icon: House },
    { id: 'tests', label: 'Tests', icon: ClipboardCheck },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
  ],
  recruiter: [
    { id: 'business-jobs', label: 'Jobs', icon: Briefcase },
    { id: 'business-tests', label: 'Tests', icon: ClipboardCheck },
    { id: 'business-candidates', label: 'Candidates', icon: Users },
  ],
};

const VIEWS: { role: UserRole; label: string }[] = [
  { role: 'candidate', label: 'candidate view' },
  { role: 'recruiter', label: 'business view' },
  { role: 'admin', label: 'Vetter team view' },
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
  onRoleChange: (role: UserRole) => void;
  // With accounts: sign in and out, and the view switcher only for the Vetter team. Without, the demo's view switcher
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
  // Visitors also get a Pricing tab
  showPricing?: boolean;
  // The search box, rendered in the bar (and full width on phones)
  renderSearch: (mobile: { onClose: () => void } | null) => React.ReactNode;
}

const Wordmark: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Vetter home"
    className="w-9 h-9 rounded-md tier-solid tier-solid-silver flex items-center justify-center text-base font-extrabold tracking-tight shrink-0"
  >
    V
  </button>
);

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  activeRole,
  onRoleChange,
  accounts,
  userAvatar,
  userName,
  userTitle,
  notifications,
  onOpenNotification,
  showPricing,
  renderSearch,
}) => {
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unread = notifications?.filter((n) => !n.read).length ?? 0;
  const roleTabs = NAV_TABS[activeRole === 'candidate' ? 'candidate' : 'recruiter'];
  const tabs = showPricing ? [...roleTabs, { id: 'pricing' as AppTab, label: 'Pricing', icon: Tag }] : roleTabs;
  const [isMeOpen, setIsMeOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const meRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!meRef.current?.contains(e.target as Node)) setIsMeOpen(false);
      if (!bellRef.current?.contains(e.target as Node)) setIsBellOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const tabButton = (tab: (typeof tabs)[number], placement: 'top' | 'bottom') => {
    const Icon = tab.icon;
    const isActive = currentTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
          placement === 'top' ? 'h-14 min-w-[4.5rem] px-2' : 'flex-1 h-14'
        } ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : ''}`} />
        <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
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

          <nav className="hidden md:flex items-center ml-auto">{tabs.map((tab) => tabButton(tab, 'top'))}</nav>

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
                <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
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
                            className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 ${n.read ? '' : 'bg-indigo-50/40'}`}
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

          {/* Visitors: sign in or join */}
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
              <img src={userAvatar} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover bg-slate-100" />
              <span className="hidden md:flex items-center text-[11px] font-medium">
                Me <ChevronDown className="w-3 h-3" />
              </span>
            </button>

            {isMeOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 space-y-3 z-50">
                <div className="flex items-center gap-3">
                  <img src={userAvatar} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover bg-slate-100 shrink-0" />
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
                {accounts?.email && <div className="text-[11px] text-slate-500 truncate -mt-1">{accounts.email}</div>}
                {/* The demo's views, and with accounts the Vetter team's */}
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
        {tabs.map((tab) => tabButton(tab, 'bottom'))}
      </nav>
    </>
  );
};
