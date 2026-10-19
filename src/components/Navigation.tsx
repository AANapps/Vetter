import React from 'react';
import { UserRole } from '../types';
import { ArrowLeftRight } from 'lucide-react';

export type AppTab =
  | 'profile'
  | 'jobs'
  | 'tests'
  | 'companies'
  | 'business-jobs'
  | 'business-tests'
  | 'business-candidates';

export const NAV_TABS: Record<'candidate' | 'recruiter', { id: AppTab; label: string }[]> = {
  candidate: [
    { id: 'profile', label: 'Profile' },
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

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  activeRole,
  onRoleToggle,
  userAvatar,
  userName,
}) => {
  const tabs = NAV_TABS[activeRole === 'candidate' ? 'candidate' : 'recruiter'];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3.5">
        {/* Brand Wordmark */}
        <button
          onClick={() => onTabChange(tabs[0].id)}
          className="text-lg font-bold tracking-tight text-indigo-700 hover:text-indigo-800 transition-colors whitespace-nowrap shrink-0 text-left flex items-center gap-1.5"
        >
          <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-tr from-indigo-600 to-violet-500 inline-block" />
          <span>VETTER</span>
        </button>

        {/* Navigation Links: own row on small screens, inline on large */}
        <nav className="order-last lg:order-none w-full lg:w-auto flex items-center gap-5 text-sm font-medium text-slate-600 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                currentTab === tab.id ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Role Switcher (stands in for sign-in until accounts exist) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRoleToggle}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
            title={`Switch to ${activeRole === 'candidate' ? 'business' : 'candidate'} view`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
            <span>{activeRole === 'candidate' ? 'Candidate View' : 'Business View'}</span>
          </button>

          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
            <img
              src={userAvatar}
              alt={userName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
