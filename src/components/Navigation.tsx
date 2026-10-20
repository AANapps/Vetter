import React, { useState } from 'react';
import { UserRole } from '../types';
import { ArrowLeftRight, Menu, X } from 'lucide-react';

export type AppTab =
  | 'profile'
  | 'discover'
  | 'jobs'
  | 'tests'
  | 'companies'
  | 'business-jobs'
  | 'business-tests'
  | 'business-candidates';

export const NAV_TABS: Record<'candidate' | 'recruiter', { id: AppTab; label: string }[]> = {
  candidate: [
    { id: 'profile', label: 'Profile' },
    { id: 'discover', label: 'Discover' },
    { id: 'jobs', label: 'Job Board' },
    { id: 'tests', label: 'Tests' },
    { id: 'companies', label: 'Companies' },
  ],
  recruiter: [
    { id: 'business-jobs', label: 'Jobs' },
    { id: 'business-tests', label: 'Tests' },
    { id: 'business-candidates', label: 'Candidates' },
  ],
};

interface NavigationProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  activeRole: UserRole;
  onRoleToggle: () => void;
  userAvatar: string;
  userName: string;
}

const Wordmark: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="text-lg font-bold tracking-tight text-indigo-700 hover:text-indigo-800 transition-colors whitespace-nowrap text-left flex items-center gap-1.5"
  >
    <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-tr from-indigo-600 to-violet-500 inline-block" />
    <span>VETTER</span>
  </button>
);

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  activeRole,
  onRoleToggle,
  userAvatar,
  userName,
}) => {
  const tabs = NAV_TABS[activeRole === 'candidate' ? 'candidate' : 'recruiter'];
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const selectTab = (tab: AppTab) => {
    onTabChange(tab);
    setIsMobileOpen(false);
  };

  const sidebarBody = (
    <>
      <nav className="flex-1 flex flex-col gap-1 text-sm font-medium text-slate-600">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            aria-current={currentTab === tab.id ? 'page' : undefined}
            className={`px-3 py-2 rounded-lg text-left transition-colors whitespace-nowrap ${
              currentTab === tab.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Role Switcher (stands in for sign-in until accounts exist) */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
            <img src={userAvatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-semibold text-slate-800 truncate">{userName}</span>
        </div>
        <button
          onClick={() => {
            onRoleToggle();
            setIsMobileOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
          title={`Switch to ${activeRole === 'candidate' ? 'business' : 'candidate'} view`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
          <span>{activeRole === 'candidate' ? 'Candidate View' : 'Business View'}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-60 shrink-0 flex-col gap-8 px-4 py-6 bg-white border-r border-slate-200">
        <div className="px-3">
          <Wordmark onClick={() => selectTab(tabs[0].id)} />
        </div>
        {sidebarBody}
      </aside>

      {/* Mobile: slim bar that opens the sidebar as a drawer */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <Wordmark onClick={() => selectTab(tabs[0].id)} />
        <button
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={isMobileOpen}
          className="p-2 -mr-2 text-slate-600 hover:text-indigo-700 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setIsMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[80vw] flex flex-col gap-8 px-4 py-6 bg-white shadow-2xl">
            <div className="flex items-center justify-between px-3">
              <Wordmark onClick={() => selectTab(tabs[0].id)} />
              <button
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
                className="p-2 -mr-2 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
};
