import React, { useEffect, useRef, useState } from 'react';
import { UserRole } from '../types';
import { ArrowLeftRight, Briefcase, Building2, ChevronDown, ClipboardCheck, Compass, Search, UserRound, Users } from 'lucide-react';

export type AppTab =
  | 'profile'
  | 'discover'
  | 'jobs'
  | 'tests'
  | 'companies'
  | 'business-jobs'
  | 'business-tests'
  | 'business-candidates';

type TabIcon = React.ComponentType<{ className?: string }>;

export const NAV_TABS: Record<'candidate' | 'recruiter', { id: AppTab; label: string; icon: TabIcon }[]> = {
  candidate: [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'tests', label: 'Tests', icon: ClipboardCheck },
    { id: 'companies', label: 'Companies', icon: Building2 },
  ],
  recruiter: [
    { id: 'business-jobs', label: 'Jobs', icon: Briefcase },
    { id: 'business-tests', label: 'Tests', icon: ClipboardCheck },
    { id: 'business-candidates', label: 'Candidates', icon: Users },
  ],
};

interface NavigationProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  activeRole: UserRole;
  onRoleToggle: () => void;
  userAvatar: string;
  userName: string;
  userTitle: string;
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
  onRoleToggle,
  userAvatar,
  userName,
  userTitle,
  renderSearch,
}) => {
  const tabs = NAV_TABS[activeRole === 'candidate' ? 'candidate' : 'recruiter'];
  const [isMeOpen, setIsMeOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const meRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!meRef.current?.contains(e.target as Node)) setIsMeOpen(false);
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

          {/* Me: account and view switcher */}
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
                {/* Stands in for sign-in until accounts exist */}
                <button
                  role="menuitem"
                  onClick={() => {
                    onRoleToggle();
                    setIsMeOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-slate-700 bg-white rounded-full"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Switch to {activeRole === 'candidate' ? 'business' : 'candidate'} view</span>
                </button>
              </div>
            )}
          </div>
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
