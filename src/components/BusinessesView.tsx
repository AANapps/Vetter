import React, { useState } from 'react';
import { Business, JobPosting, AssessmentTest } from '../types';
import { Award, Search } from 'lucide-react';

interface BusinessesViewProps {
  businesses: Business[];
  jobs: JobPosting[];
  tests: AssessmentTest[];
  // Left out in the business view, which has no job pages to open
  onSelectJob?: (jobId: string) => void;
  // Opened from search: start filtered to this company
  initialQuery?: string;
}

export const BusinessesView: React.FC<BusinessesViewProps> = ({
  businesses,
  jobs,
  tests,
  onSelectJob,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedIndustry, setSelectedIndustry] = useState('all');

  const industries = ['all', ...Array.from(new Set(businesses.map((b) => b.industry)))];

  const filteredBusinesses = businesses.filter((b) => {
    if (selectedIndustry !== 'all' && b.industry !== selectedIndustry) return false;
    if (searchQuery && !b.name.toLowerCase().includes(searchQuery.toLowerCase()) && !b.techStack.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Companies</h1>
          <p className="text-xs text-slate-500 mt-1">
            Companies hiring on Vetter, their open jobs, and the tests attached to them.
          </p>
        </div>

        {/* Search & Industry Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search businesses or tech stack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-56 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
            {industries.slice(0, 3).map((ind) => (
              <button
                key={ind}
                onClick={() => setSelectedIndustry(ind)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  selectedIndustry === ind
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ind === 'all' ? 'All Sectors' : ind.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Businesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredBusinesses.map((biz) => {
          const bizJobs = jobs.filter((j) => j.businessId === biz.id && j.status === 'active');
          const bizTestCount = tests.filter((t) => t.type === 'custom' && t.businessId === biz.id).length;

          return (
            <div
              key={biz.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-300 transition-colors shadow-xs space-y-6"
            >
              <div className="space-y-4">
                {/* Logo & Headline */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <img
                        src={biz.logo}
                        alt={biz.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">{biz.name}</h3>
                      <p className="text-xs text-slate-500">{biz.industry}</p>
                    </div>
                  </div>

                  {bizTestCount > 0 && (
                    <span className="text-[10px] font-mono uppercase bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-semibold shrink-0">
                      {bizTestCount} own {bizTestCount === 1 ? 'test' : 'tests'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{biz.description}</p>

                {/* Tech Stack */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">Production Tech Stack:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {biz.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-600"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Active Job Requisitions with Attached Tests */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span>Open Jobs ({bizJobs.length})</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {bizJobs.map((j) => {
                      return (
                        <div
                          key={j.id}
                          className={`p-3 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-1.5 transition-colors ${
                            onSelectJob ? 'hover:bg-indigo-50/40 cursor-pointer' : ''
                          }`}
                          onClick={onSelectJob ? () => onSelectJob(j.id) : undefined}
                        >
                          <div className="flex items-center justify-between font-semibold text-slate-900">
                            <span className="truncate">{j.title}</span>
                            <span className="text-[11px] text-slate-500 font-mono shrink-0 ml-2">{j.workType}</span>
                          </div>

                          {j.testIds.length > 0 && (
                            <div className="flex items-center justify-between text-[11px] text-indigo-700 bg-white border border-indigo-100 rounded px-2 py-1 font-mono">
                              <span className="truncate flex items-center gap-1">
                                <Award className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span>
                                  {j.testIds.length} {j.testIds.length === 1 ? 'test' : 'tests'}
                                </span>
                              </span>
                              <span className="text-slate-400 shrink-0 ml-2">≥{j.testPassingScore} pts</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Business Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>{biz.headquarters} &middot; {biz.companySize}</span>
                <span className="text-indigo-600 font-semibold">{bizJobs.length} open {bizJobs.length === 1 ? 'job' : 'jobs'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
