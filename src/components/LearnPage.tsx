import React, { useState } from 'react';
import { ArrowRight, BadgeCheck, Briefcase, Building2, Clock, GraduationCap } from 'lucide-react';
import { COURSES, Course, CourseAudience, courseHours, courseLessons } from '../data/courses';
import { CourseProgress } from '../lib/courseProgress';

interface LearnPageProps {
  progress: CourseProgress;
  onOpenCourse: (courseId: string) => void;
  onTrainTeam: () => void;
}

type Filter = 'all' | 'bootcamps' | CourseAudience;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All courses' },
  { id: 'bootcamps', label: 'Bootcamps' },
  { id: 'job-seekers', label: 'For job seekers' },
  { id: 'employees', label: 'For employees' },
];

const matches = (course: Course, filter: Filter) =>
  filter === 'all' ? true : filter === 'bootcamps' ? course.format === 'Bootcamp' : course.audiences.includes(filter);

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

// Vetter Learn: the course catalogue. Each course has its own page at /learn/<id>/
export const LearnPage: React.FC<LearnPageProps> = ({ progress, onOpenCourse, onTrainTeam }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const inProgress = COURSES.filter((c) => progress[c.id] && percentDone(c, progress) < 100);
  const shown = COURSES.filter((c) => matches(c, filter));
  const bootcamp = COURSES.find((c) => c.format === 'Bootcamp')!;

  return (
    <div>
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid gap-8 lg:grid-cols-[1fr_380px] items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600">
              <GraduationCap className="w-4 h-4" /> Vetter Learn
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">Learn the skills jobs test for</h1>
            <p className="mt-4 text-lg text-slate-600 max-w-xl">
              Courses and bootcamps for job seekers and for employees growing in their role. Each one ends in a Vetter test, so you finish with a verified score
              companies hire on, not just a certificate.
            </p>
          </div>
          <button onClick={() => onOpenCourse(bootcamp.id)} className="text-left rounded-2xl bg-slate-900 p-6 hover:bg-slate-800 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Featured bootcamp</span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">{bootcamp.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{bootcamp.tagline}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
              See the bootcamp <ArrowRight className="w-4 h-4" />
            </span>
          </button>
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
            <h2 className="text-lg font-bold text-slate-900">Courses</h2>
            <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    filter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
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

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-6">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            <h3 className="mt-3 font-bold text-slate-900">Looking for work?</h3>
            <p className="mt-1 text-sm text-slate-600">
              Learn, take the course's tests, and your scores go on your profile and with every application you send on Vetter.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <h3 className="mt-3 font-bold text-slate-900">Training a team?</h3>
            <p className="mt-1 text-sm text-slate-600">Enrol your employees and see what they can do before and after, measured by the same tests you hire with.</p>
            <button onClick={onTrainTeam} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-800">
              Vetter for business <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
