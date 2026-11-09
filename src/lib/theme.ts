import { useEffect, useState } from 'react';

/**
 * Light or dark: what the person picked, kept in this browser, or their device's setting until they pick. The class is
 * set on <html> before the app loads (index.html), so the page never flashes the wrong colours; dark.css rules in
 * src/index.css do the rest.
 */
export type Theme = 'light' | 'dark';
const KEY = 'vetter:theme';

const systemTheme = (): Theme => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function saved(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function apply(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-switching');
    window.setTimeout(() => root.classList.remove('theme-switching'), 250);
  }
  root.classList.toggle('dark', theme === 'dark');
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => saved() ?? systemTheme());
  // Following the device until they choose: it changes with it
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const onChange = () => {
      if (saved()) return;
      const next = systemTheme();
      setThemeState(next);
      apply(next, true);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not kept (private mode): it still changes for this visit
    }
    setThemeState(next);
    apply(next, true);
  };
  return [theme, setTheme];
}
