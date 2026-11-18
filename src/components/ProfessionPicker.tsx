import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PROFESSIONS } from '../data/professions';

interface ProfessionPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
}

// A searchable dropdown of professions. Typing filters the list; one that isn't listed can still be used as typed
export const ProfessionPicker: React.FC<ProfessionPickerProps> = ({ value, onChange, className = '', autoFocus }) => {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [value]);

  const q = query.trim().toLowerCase();
  const options = useMemo(() => {
    // While the box shows the picked profession, list everything; once they type, filter (starts-with first)
    if (!q || query === value) return PROFESSIONS;
    const starts = PROFESSIONS.filter((p) => p.toLowerCase().startsWith(q));
    const contains = PROFESSIONS.filter((p) => !p.toLowerCase().startsWith(q) && p.toLowerCase().includes(q));
    return [...starts, ...contains];
  }, [q, query, value]);
  const custom = query.trim() && !PROFESSIONS.some((p) => p.toLowerCase() === q) ? query.trim() : null;
  const items = custom ? [...options, custom] : options;

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (p: string) => {
    onChange(p);
    setQuery(p);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls="profession-list"
        aria-autocomplete="list"
        value={query}
        autoFocus={autoFocus}
        placeholder="Search professions, e.g. Data Analyst"
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && open && items[active]) {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === 'Escape' && open) {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            setOpen(false);
            setQuery(value);
          }
        }}
        className={`${className} pr-8`}
      />
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      {open && items.length > 0 && (
        <ul
          id="profession-list"
          ref={listRef}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          {items.map((p, i) => (
            <li
              key={p + i}
              data-i={i}
              role="option"
              aria-selected={p === value}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-1.5 text-sm cursor-pointer ${i === active ? 'bg-indigo-50 text-indigo-900' : 'text-slate-800'} ${
                p === value ? 'font-semibold' : ''
              }`}
            >
              {p === custom ? `Use "${p}"` : p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
