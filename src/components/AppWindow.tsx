import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Lock, RotateCcw } from 'lucide-react';
import { appDocument, parseAppState, readAppMessage } from '../lib/appSimulation';

interface AppWindowProps {
  value: string;
  onChange: (json: string) => void;
  html: string;
  appName: string;
}

// A simulated product the candidate works in, framed like a browser window. Its state is saved as they go, and the
// app resumes from it when they come back to the task
export const AppWindow: React.FC<AppWindowProps> = ({ value, onChange, html, appName }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // The page is built once per load: rebuilding it on every save would reload the app under the candidate
  const [doc, setDoc] = useState(() => appDocument(html, parseAppState(value)));
  const [error, setError] = useState<string | null>(null);
  // Bumped on reset, so the frame reloads even when the page is the same as when it first loaded
  const [loads, setLoads] = useState(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const msg = readAppMessage(e, frameRef.current);
      if (msg?.state) onChangeRef.current(JSON.stringify(msg.state));
      if (msg?.error) setError(msg.error);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const reset = () => {
    if (!window.confirm(`Start ${appName} again from the beginning? Your work in it will be lost.`)) return;
    setError(null);
    onChange('');
    setDoc(appDocument(html, null));
    setLoads((n) => n + 1);
  };

  return (
    <div className="h-full flex flex-col bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
      <div className="h-9 px-3 flex items-center gap-3 bg-slate-100 border-b border-slate-200 shrink-0">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-500">
          <Lock className="w-3 h-3 shrink-0" />
          <span className="truncate">{appName} &middot; practice workspace</span>
        </div>
        <button onClick={reset} className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900" title="Start the app again">
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>
      {error && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Part of the app stopped working ({error}). Your saved work is kept; Reset starts it again.</span>
        </div>
      )}
      {/* No same-origin, forms, popups or navigation: the app can run its own code and nothing else */}
      <iframe key={loads} ref={frameRef} title={appName} srcDoc={doc} sandbox="allow-scripts" className="flex-1 w-full border-0 bg-white" />
    </div>
  );
};
