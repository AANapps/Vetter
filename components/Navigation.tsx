import React from 'react';
import { UserRole } from '../types';
import { ArrowLeftRight, Database } from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  activeRole: UserRole;
  onRoleToggle: () => void;
  onOpenSchemaModal: () => void;
  onOpenPillarsModal: () => void;
  userAvatar: string;
  userName: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  activeRole,
  onRoleToggle,
  onOpenSchemaModal,
  onOpenPillarsModal,
  userAvatar,
  userName,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 py-3.5">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <button
          onClick={() => onTabChange(activeRole === 'candidate' ? 'profile' : 'recruiter-jobs')}
          className="text-lg font-bold tracking-tight text-indigo-700 hover:text-indigo-800 transition-colors whitespace-nowrap shrink-0 text-left flex items-center gap-1.5"
        >
          <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-tr from-indigo-600 to-violet-500 inline-block" />
          <span>VETTED</span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600">
          {activeRole === 'candidate' ? (
            <>
              <button
                onClick={() => onTabChange('profile')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'profile' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Skill Passport
              </button>
              <button
                onClick={() => onTabChange('assessments')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'assessments' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Assessments
              </button>
              <button
                onClick={() => onTabChange('matches')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'matches' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Matched Jobs
              </button>
              <button
                onClick={() => onTabChange('businesses')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'businesses' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Businesses
              </button>
              <button
                onClick={() => onTabChange('leaderboard')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'leaderboard' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Leaderboard
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onTabChange('recruiter-jobs')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'recruiter-jobs' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Job Management
              </button>
              <button
                onClick={() => onTabChange('candidate-pipeline')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'candidate-pipeline' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Match Pipeline
              </button>
              <button
                onClick={() => onTabChange('custom-builder')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'custom-builder' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Custom Tests
              </button>
              <button
                onClick={() => onTabChange('businesses')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'businesses' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Businesses
              </button>
              <button
                onClick={() => onTabChange('leaderboard')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'leaderboard' ? 'text-indigo-600 font-semibold' : 'hover:text-indigo-600'
                }`}
              >
                Talent Index
              </button>
            </>
          )}

          <div className="h-4 w-px bg-slate-200" />

          {/* 4 Pillars Interactive Explainer */}
          <button
            onClick={onOpenPillarsModal}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            title="Learn how Candidates, Tests, Job Posts, and Businesses connect"
          >
            <span>The 4 Pillars</span>
          </button>

          <button
            onClick={onOpenSchemaModal}
            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 text-xs"
            title="Inspect relational database schema and production deployment architecture"
          >
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>Schema</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Role Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRoleToggle}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
            title={`Currently in ${activeRole} mode. Click to switch.`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {activeRole === 'candidate' ? 'Candidate View' : 'Recruiter View'}
            </span>
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
