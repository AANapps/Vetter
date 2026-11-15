import React from 'react';
import { X } from 'lucide-react';
import { AppWindow } from './AppWindow';
import { EnvironmentPage } from '../lib/environments';

// A simulation opened to try out, full width, in a window over the page
export const SimulationPreview: React.FC<{ title: string; subtitle?: string; page: EnvironmentPage | null; onClose: () => void; children?: React.ReactNode }> = ({
  title,
  subtitle,
  page,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 truncate">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {children}
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-3 bg-slate-50">
        {page?.html ? (
          <AppWindow value="" onChange={() => {}} html={page.html} appName={title} callouts={page.callouts} />
        ) : (
          <p className="text-sm text-slate-500 p-6 text-center">This simulation's page couldn't be loaded.</p>
        )}
      </div>
    </div>
  </div>
);
