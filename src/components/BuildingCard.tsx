import React, { useEffect, useState } from "react";
import { Cog, Hammer } from "lucide-react";

// Shown in the creator's preview while Vetter builds: a cog turning, then a hammer knocking, then the tabs of the test
// settling into place, round and round, with what it's doing right now underneath
// One step (writing a simulation's page) can take minutes, so how long it's been going shows beside it
export const BuildingCard: React.FC<{
  title: string;
  stage: string;
  compact?: boolean;
}> = ({ title, stage, compact }) => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(clock);
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${compact ? "p-4 flex items-center gap-4" : "p-6 w-full max-w-sm flex flex-col items-center text-center gap-4"}`}
    >
      <div
        className={`build-stage relative shrink-0 rounded-xl bg-indigo-50 ${compact ? "w-14 h-14" : "w-20 h-20"}`}
        aria-hidden
      >
        {/* 1. The cog */}
        <span className="build-phase build-phase-1 absolute inset-0 flex items-center justify-center">
          <Cog
            className={`build-cog text-indigo-600 ${compact ? "w-7 h-7" : "w-10 h-10"}`}
            strokeWidth={1.75}
          />
        </span>
        {/* 2. The hammer, striking the bar under it */}
        <span className="build-phase build-phase-2 absolute inset-0 flex items-center justify-center">
          <span className="relative">
            <Hammer
              className={`build-hammer text-indigo-600 ${compact ? "w-7 h-7" : "w-10 h-10"}`}
              strokeWidth={1.75}
            />
            <span className="build-strike absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-indigo-300" />
          </span>
        </span>
        {/* 3. Tabs finding their sizes */}
        <span className="build-phase build-phase-3 absolute inset-0 flex flex-col justify-center gap-1.5 px-3">
          <span className="flex gap-1">
            <span className="build-tab build-tab-a h-2 rounded-sm bg-indigo-500" />
            <span className="build-tab build-tab-b h-2 rounded-sm bg-indigo-300" />
            <span className="build-tab build-tab-c h-2 rounded-sm bg-indigo-200" />
          </span>
          <span className="h-1 w-full rounded-sm bg-indigo-200" />
          <span className="build-tab-line h-1 rounded-sm bg-indigo-200" />
        </span>
      </div>
      <div className={`min-w-0 ${compact ? "flex-1" : "w-full"}`}>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p
          className={`mt-0.5 text-xs text-slate-500 ${compact ? "truncate" : "leading-relaxed"}`}
          title={stage}
        >
          {stage || "Starting…"}
          {seconds >= 5 && (
            <span className="ml-1.5 text-slate-400 tabular-nums">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          )}
        </p>
        <div className="mt-3 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
          <span className="build-bar block h-full w-1/3 rounded-full bg-indigo-500" />
        </div>
      </div>
    </div>
  );
};
