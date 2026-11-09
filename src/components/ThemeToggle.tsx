import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';

// Switches between light and dark. compact: an icon button for headers; otherwise a full-width menu row
export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const [theme, setTheme] = useTheme();
  const dark = theme === 'dark';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  if (compact)
    return (
      <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={label} title={label} className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100">
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  // In the account menu: a row with an on/off switch that slides across
  return (
    <button
      role="switch"
      aria-checked={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-full hover:bg-slate-100"
    >
      <span className="flex items-center gap-2">
        <Moon className="w-3.5 h-3.5 text-indigo-600" />
        Dark mode
      </span>
      <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${dark ? 'bg-indigo-600' : 'bg-slate-300'}`} aria-hidden="true">
        <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-[#ffffff] shadow transition-transform duration-200 ${dark ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
    </button>
  );
};
