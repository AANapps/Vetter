import React from 'react';
import { X, Users, Code, Briefcase, Building, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Layers } from 'lucide-react';

interface FourPillarsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTo: (tab: string) => void;
}

export const FourPillarsModal: React.FC<FourPillarsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-900 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-mono font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>Core Platform Architecture</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">The 4 Core Pillars of Vetted</h2>
          <p className="text-xs text-slate-500">
            A skills-based hiring loop where candidates take tests, businesses post jobs, and tests are attached to jobs as an integral part of the application process.
          </p>
        </div>

        {/* Interactive Architecture Flow Diagram */}
        <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl space-y-3">
          <div className="text-[11px] font-mono text-indigo-700 uppercase font-bold tracking-wider text-center">
            The Skills-Based Verified Hiring Pipeline
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[10px] font-mono text-slate-400">Pillar 1</span>
              <h4 className="font-bold text-xs text-slate-900">Candidates</h4>
              <p className="text-[11px] text-slate-500 mt-1">Take standardized & attached tests in live sandboxes</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[10px] font-mono text-slate-400">Pillar 2</span>
              <h4 className="font-bold text-xs text-indigo-700">Tests</h4>
              <p className="text-[11px] text-slate-500 mt-1">Generate verified scores & attach directly to job requisitions</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[10px] font-mono text-slate-400">Pillar 3</span>
              <h4 className="font-bold text-xs text-slate-900">Job Posts</h4>
              <p className="text-[11px] text-slate-500 mt-1">Specify score vectors & require attached assessments to apply</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-[10px] font-mono text-slate-400">Pillar 4</span>
              <h4 className="font-bold text-xs text-slate-900">Businesses</h4>
              <p className="text-[11px] text-slate-500 mt-1">Govern technical bars and review pre-screened applicants</p>
            </div>
          </div>
        </div>

        {/* Detailed 4 Pillars Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pillar 1: Candidates */}
          <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Pillar 1</span>
                <h3 className="text-sm font-bold text-slate-900">Candidates</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Software engineers and data practitioners who solve practical challenges in interactive SQL and code execution sandboxes.
            </p>
            <ul className="text-xs text-slate-500 space-y-1 font-mono">
              <li>&bull; Builds verifiable skill passports & gold/silver badges</li>
              <li>&bull; Automatic match percentage for all active job openings</li>
              <li>&bull; 1-click application when attached tests are pre-qualified</li>
            </ul>
          </div>

          {/* Pillar 2: Tests */}
          <div className="p-5 border-2 border-indigo-500/70 rounded-xl bg-indigo-50/20 space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-indigo-700 font-bold">Pillar 2 (Key Anchor)</span>
                <h3 className="text-sm font-bold text-slate-900">Tests & Assessments</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standardized benchmarks and custom business assessments. <strong>Tests are attached to job posts as part of the application process.</strong>
            </p>
            <ul className="text-xs text-slate-600 space-y-1 font-mono">
              <li>&bull; In-browser SQL engine & JavaScript test case runners</li>
              <li>&bull; Anti-cheat proctoring & focus loss integrity metrics</li>
              <li>&bull; Can be attached to specific job posts as mandatory gates</li>
            </ul>
          </div>

          {/* Pillar 3: Job Posts */}
          <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Pillar 3</span>
                <h3 className="text-sm font-bold text-slate-900">Job Posts</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Open requisitions defined by businesses with minimum score thresholds, salary transparency, and attached skill evaluations.
            </p>
            <ul className="text-xs text-slate-500 space-y-1 font-mono">
              <li>&bull; Multi-vector skill requirements (required vs preferred)</li>
              <li>&bull; Attached test requirements displayed on job cards</li>
              <li>&bull; Real-time candidate fit recalculation</li>
            </ul>
          </div>

          {/* Pillar 4: Businesses */}
          <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Pillar 4</span>
                <h3 className="text-sm font-bold text-slate-900">Businesses</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Companies (PrismaScale AI, FinTech Core, CloudFlow SaaS) seeking high-fit engineering talent without resume keyword screening.
            </p>
            <ul className="text-xs text-slate-500 space-y-1 font-mono">
              <li>&bull; Author proprietary tests via Custom Assessment Builder</li>
              <li>&bull; Attach bespoke tests to technical requisitions</li>
              <li>&bull; Review applicants ranked objectively by verified score</li>
            </ul>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            Got It &middot; Explore Platform
          </button>
        </div>
      </div>
    </div>
  );
};
