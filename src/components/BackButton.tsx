import React from 'react';
import { ArrowLeft } from 'lucide-react';

// Every back button looks the same: coloured and easy to hit. "dark" is for dark headers
export const BackButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'light' | 'dark';
  type?: 'button' | 'submit';
  className?: string;
}> = ({ onClick, children, tone = 'light', type = 'button', className = '' }) => (
  <button
    type={type}
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors shrink-0 ${
      tone === 'dark'
        ? 'text-white bg-white/10 border-white/15 hover:bg-white/20'
        : 'text-indigo-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200'
    } ${className}`}
  >
    <ArrowLeft className="w-4 h-4" />
    {children}
  </button>
);
