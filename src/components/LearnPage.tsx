import React, { useState } from 'react';
import { ArrowRight, BadgeCheck, Briefcase, Building2, Clock, Repeat, TrendingUp } from 'lucide-react';
import { COURSES, Course, courseHours, courseLessons } from '../data/courses';
import { CourseProgress } from '../lib/courseProgress';

// Two ways in: switching to a new career, or upskilling in the job you have
export type LearnTrack = 'switch' | 'upskill';

interface LearnPageProps {
  track: LearnTrack;
  progress: CourseProgress;
  onOpenCourse: (courseId: string) => void;
  onTrainTeam: () => void;
}

// Where career switchers often come from and the course that gets them there
const SWITCH_PATHS: { from: string; to: string; courseId: string }[] = [
  { from: 'Retail or hospitality', to: 'Data analyst', courseId: 'data-analysis-bootcamp' },
  { from: 'Customer support', to: 'QA tester', courseId: 'software-testing-bootcamp' },
  { from: 'Teaching', to: 'Project manager', courseId: 'project-management' },
  { from: 'Admin or office work', to: 'Finance analyst', courseId: 'finance-fundamentals' },
  { from: 'Hospitality or events', to: 'B2B sales', courseId: 'b2b-sales' },
  { from: 'Graduate, any degree', to: 'Consultant', courseId: 'consulting-case-interviews' },
];

// What people in a role usually add to get better at it, or to move up
const UPSKILL_PATHS: { role: string; add: string; courseIds: string[] }[] = [
  { role: 'Finance & accounting', add: 'Pull your own numbers instead of waiting for reports', courseIds: ['excel-for-work', 'sql-for-analysts'] },
  { role: 'Marketing', add: 'Measure campaigns and prove what worked', courseIds: ['digital-marketing', 'sql-for-analysts'] },
  { role: 'Operations', add: 'Build reports that update themselves', courseIds: ['excel-for-work', 'data-analysis-bootcamp'] },
  { role: 'Team leads', add: 'Run projects people can follow', courseIds: ['project-management'] },
  { role: 'Developers', add: 'Move up to senior on frontend or backend', courseIds: ['frontend-development', 'backend-and-apis'] },
  { role: 'Sales', add: 'Keep a pipeline you can forecast', courseIds: ['b2b-sales'] },
];

const TRACKS: Record<
  LearnTrack,
  { icon: React.ComponentType<{ className?: string }>; label: string; title: string; intro: string; audience: Course['audiences'][number] }
> = {
  switch: {
    icon: Repeat,
    label: 'Career switch',
    title: 'Switch to a career you want',
    intro:
      "Bootcamps and courses for changing careers, whatever you do now. Each one ends in a Vetter test, so you finish with a verified score companies hire on, and you don't need the experience on your CV.",
    audience: 'career-switchers',
  },
  upskill: {
    icon: TrendingUp,
    label: 'Upskill',
    title: 'Get better at the job you have',
    intro:
      'Short courses for employees who want to grow in their role, take on more, or go for a promotion. Learn alongside work, a few hours a week, and prove it with a verified score.',
    audience: 'employees',
  },
};

const CATEGORIES = ['All', ...new Set(COURSES.map((c) => c.category))];

export const percentDone = (course: Course, progress: CourseProgress) => {
  const done = progress[course.id]?.done.length ?? 0;
  return Math.round((done / courseLessons(course).length) * 100);
};

export const CourseCard: React.FC<{ course: Course; progress: CourseProgress; onOpen: () => void }> = ({ course, progress, onOpen }) => {
  const started = !!progress[course.id];
  const pct = percentDone(course, progress);
  return (
    <button
      onClick={onOpen}
      className="group text-left rounded-2xl border border-slate-200 bg-white p-5 flex flex-col hover:border-indigo-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
        <span className={course.format === 'Bootcamp' ? 'text-indigo-600' : 'text-slate-500'}>{course.format}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{course.category}</span>
      </div>
      <h3 className="mt-2 text-lg font-bold text-slate-900 group-hover:text-indigo-700">{course.title}</h3>
      <p className="mt-1 text-sm text-slate-600 flex-1">{course.tagline}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {course.weeks} weeks · {courseHours(course)} hrs
        </span>
        <span>{course.level}</span>
        <span className="inline-flex items-center gap-1">
          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
          {course.testIds.length} verified {course.testIds.length === 1 ? 'test' : 'tests'}
        </span>
      </div>
      {started && (
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
          </div>
          <span className="mt-1 block text-[11px] font-semibold text-indigo-700">{pct}% done</span>
        </div>
      )}
    </button>
  );
};

const courseTitle = (id: string) => COURSES.find((c) => c.id === id)?.title ?? id;

// The course catalogue, framed for career switchers (/learn/) or employees upskilling (/upskill/). Each course has its own page
export const LearnPage: React.FC<LearnPageProps> = ({ track, progress, onOpenCourse, onTrainTeam }) => {
  const [category, setCategory] = useState('All');
  const t = TRACKS[track];
  const Icon = t.icon;
  const forTrack = COURSES.filter((c) => c.audiences.includes(t.audience));
  const inProgress = forTrack.filter((c) => progress[c.id] && percentDone(c, progress) < 100);
  // Switchers see bootcamps first; employees see the shortest courses first
  const shown = forTrack
    .filter((c) => category === 'All' || c.category === category)
    .sort((a, b) => (track === 'switch' ? Number(b.format === 'Bootcamp') - Number(a.format === 'Bootcamp') : courseHours(a) - courseHours(b)));

  return (
    <div>
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <Icon className="w-4 h-4" /> {t.label}
          </span>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">{t.title}</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">{t.intro}</p>

          {/* Popular routes: from what you do now to where you want to be */}
          <div className="mt-10">
            <h2 className="text-sm font-bold text-slate-900">{track === 'switch' ? 'Popular switches' : 'Popular by role'}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {track === 'switch'
                ? SWITCH_PATHS.map((s) => (
                    <button
                      key={s.from + s.to}
                      onClick={() => onOpenCourse(s.courseId)}
                      className="group text-left rounded-xl bg-white border border-slate-200 p-4 hover:border-indigo-300"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">{s.from}</span>
                        <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-bold text-slate-900">{s.to}</span>
                      </span>
                      <span className="mt-1 block text-xs text-indigo-700 font-semibold group-hover:underline">{courseTitle(s.courseId)}</span>
                    </button>
                  ))
                : UPSKILL_PATHS.map((u) => (
                    <div key={u.role} className="rounded-xl bg-white border border-slate-200 p-4">
                      <span className="block text-sm font-bold text-slate-900">{u.role}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{u.add}</span>
                      <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {u.courseIds.map((id) => (
                          <button key={id} onClick={() => onOpenCourse(id)} className="text-xs font-semibold text-indigo-700 hover:underline">
                            {courseTitle(id)}
                          </button>
                        ))}
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {inProgress.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900">Continue learning</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inProgress.map((c) => (
                <CourseCard key={c.id} course={c} progress={progress} onOpen={() => onOpenCourse(c.id)} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">{track === 'switch' ? 'Bootcamps and courses' : 'Courses'}</h2>
            <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    category === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => (
              <CourseCard key={c.id} course={c} progress={progress} onOpen={() => onOpenCourse(c.id)} />
            ))}
          </div>
        </section>

        {track === 'switch' ? (
          <section className="rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
            <Briefcase className="w-6 h-6 text-indigo-600 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-900">No experience in the field? That's the point.</h3>
              <p className="mt-1 text-sm text-slate-600">
                Companies on Vetter hire on test scores, not job history. Finish a course, take its tests, and your verified scores go with every
                application.
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-slate-900 p-6 sm:p-8 flex flex-col sm:flex-row gap-4 sm:items-center">
            <Building2 className="w-6 h-6 text-indigo-300 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-white">Upskilling your whole team?</h3>
              <p className="mt-1 text-sm text-slate-300">
                Enrol your employees and see what they can do before and after, measured by the same tests you hire with.
              </p>
            </div>
            <button onClick={onTrainTeam} className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100">
              Vetter for business <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        )}
      </div>
    </div>
  );
};
