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
  return (
    <button
      role="menuitemcheckbox"
      aria-checked={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-slate-700 bg-white rounded-full"
    >
      {dark ? <Sun className="w-3.5 h-3.5 text-indigo-600" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
      <span>{dark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};
