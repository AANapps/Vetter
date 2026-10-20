import React, { useEffect, useRef, useState } from 'react';
import { AssessmentTest, Business, User } from '../types';
import { Search, X } from 'lucide-react';

interface GlobalSearchProps {
  people: User[];
  tests: AssessmentTest[];
  businesses: Business[];
  onOpenPerson: (personId: string) => void;
  onOpenTest: (testId: string) => void;
  onOpenCompany: (businessId: string) => void;
  // Phones show the search as a full-width bar under the header
  onClose?: () => void;
  autoFocus?: boolean;
}

type SearchResult =
  | { kind: 'person'; id: string; title: string; subtitle: string; image: string }
  | { kind: 'test'; id: string; title: string; subtitle: string }
  | { kind: 'company'; id: string; title: string; subtitle: string; image: string };

const GROUP_LABELS: Record<SearchResult['kind'], string> = { person: 'People', test: 'Tests', company: 'Companies' };
const PER_GROUP = 5;

const matches = (query: string, ...fields: (string | undefined)[]) =>
  fields.some((f) => f?.toLowerCase().includes(query));

export function searchEverything(query: string, people: User[], tests: AssessmentTest[], businesses: Business[]): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const personResults: SearchResult[] = people
    .filter((p) => matches(q, p.name, p.title, p.location, ...p.verifiedSkills.map((s) => s.skillName)))
    .slice(0, PER_GROUP)
    .map((p) => ({ kind: 'person', id: p.id, title: p.name, subtitle: `${p.title} · ${p.location}`, image: p.avatarUrl }));
  const testResults: SearchResult[] = tests
    .filter((t) => matches(q, t.title, t.category, t.companyName, ...t.skillsTested))
    .slice(0, PER_GROUP)
    .map((t) => ({
      kind: 'test',
      id: t.id,
      title: t.title,
      subtitle: `${t.category} · ${t.type === 'standard' ? 'Made by Vetter' : t.companyName}`,
    }));
  const companyResults: SearchResult[] = businesses
    .filter((b) => matches(q, b.name, b.industry, b.headquarters, ...b.techStack))
    .slice(0, PER_GROUP)
    .map((b) => ({ kind: 'company', id: b.id, title: b.name, subtitle: b.industry, image: b.logo }));
  return [...personResults, ...testResults, ...companyResults];
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  people,
  tests,
  businesses,
  onOpenPerson,
  onOpenTest,
  onOpenCompany,
  onClose,
  autoFocus,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = searchEverything(query, people, tests, businesses);

  // Close the results when clicking anywhere else
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const choose = (result: SearchResult) => {
    if (result.kind === 'person') onOpenPerson(result.id);
    else if (result.kind === 'test') onOpenTest(result.id);
    else onOpenCompany(result.id);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
    onClose?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      onClose?.();
    } else if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[activeIndex]) {
      choose(results[activeIndex]);
    }
  };

  const showPanel = isOpen && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search people, tests and companies"
        aria-label="Search people, tests and companies"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        className="w-full h-9 pl-9 pr-9 bg-slate-100 border border-transparent rounded-md text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-indigo-500 [&::-webkit-search-cancel-button]:hidden"
      />
      {(query || onClose) && (
        <button
          onClick={() => {
            if (query) {
              setQuery('');
              inputRef.current?.focus();
            } else {
              onClose?.();
            }
          }}
          aria-label={query ? 'Clear search' : 'Close search'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-[70vh] overflow-y-auto py-2 md:min-w-[26rem]"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">No people, tests or companies match “{query.trim()}”.</div>
          ) : (
            (['person', 'test', 'company'] as const).map((kind) => {
              const group = results.filter((r) => r.kind === kind);
              if (group.length === 0) return null;
              return (
                <div key={kind} className="py-1">
                  <div className="px-4 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    {GROUP_LABELS[kind]}
                  </div>
                  {group.map((r) => {
                    const index = results.indexOf(r);
                    return (
                      <div
                        key={`${r.kind}-${r.id}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => choose(r)}
                        className={`px-4 py-2 flex items-center gap-3 cursor-pointer ${index === activeIndex ? 'bg-slate-100' : ''}`}
                      >
                        {r.kind === 'test' ? (
                          <div className="w-8 h-8 rounded-md tier-solid tier-solid-silver flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                            {r.title.slice(0, 2).toUpperCase()}
                          </div>
                        ) : (
                          <img
                            src={r.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            className={`w-8 h-8 object-cover bg-slate-100 shrink-0 ${r.kind === 'person' ? 'rounded-full' : 'rounded-md'}`}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{r.title}</div>
                          <div className="text-xs text-slate-500 truncate">{r.subtitle}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
