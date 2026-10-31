import React, { useState } from 'react';
import { BadgeCheck, BookOpen, Briefcase, Building2, Check, ChevronDown, Clock, FlaskConical, Hammer, PlayCircle, Target, Users } from 'lucide-react';
import { AssessmentTest, JobPosting, User } from '../types';
import { COURSES, Course, LessonKind, courseHours, courseLessons } from '../data/courses';
import { CourseProgress } from '../lib/courseProgress';
import { CourseCard, percentDone } from './LearnPage';

interface CoursePageProps {
  course: Course;
  tests: AssessmentTest[];
  jobs: JobPosting[];
  // The signed-in candidate, to show their scores on the course's tests
  candidate?: User;
  progress: CourseProgress;
  onEnroll: () => void;
  onToggleLesson: (key: string) => void;
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
  onOpenCourse: (courseId: string) => void;
  onTrainTeam: () => void;
  onBack: () => void;
}

const LESSON_ICONS: Record<LessonKind, React.ComponentType<{ className?: string }>> = {
  video: PlayCircle,
  reading: BookOpen,
  exercise: FlaskConical,
  project: Hammer,
};

const AUDIENCE_LABELS = { 'job-seekers': 'Job seekers', employees: 'Employees' };

const minutesLabel = (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10} hr` : `${m} min`);

export const CoursePage: React.FC<CoursePageProps> = ({
  course,
  tests,
  jobs,
  candidate,
  progress,
  onEnroll,
  onToggleLesson,
  onOpenTest,
  onOpenJob,
  onOpenCourse,
  onTrainTeam,
  onBack,
}) => {
  const enrolled = progress[course.id];
  const done = new Set(enrolled?.done ?? []);
  const pct = percentDone(course, progress);
  const lessons = courseLessons(course);
  const [openModules, setOpenModules] = useState<Set<number>>(() => new Set([0]));
  const courseTests = course.testIds.flatMap((id) => tests.filter((t) => t.id === id));
  const relatedJobs = jobs
    .filter((j) => j.status === 'active' && course.jobKeywords.some((k) => j.title.toLowerCase().includes(k)))
    .slice(0, 3);
  const others = COURSES.filter((c) => c.id !== course.id && c.category === course.category).slice(0, 3);
  const nextLesson = lessons.find((l) => !done.has(l.key));

  const toggleModule = (i: number) =>
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div>
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-12">
          <button onClick={onBack} className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            &larr; All courses
          </button>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px] items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <span className="text-indigo-300">{course.format}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">{course.category}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">{course.level}</span>
              </div>
              <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">{course.title}</h1>
              <p className="mt-3 text-lg text-slate-300">{course.tagline}</p>
              <p className="mt-5 text-sm text-slate-300 max-w-2xl leading-relaxed">{course.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {course.skills.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium text-slate-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Enrol, or where you're up to */}
            <div className="rounded-2xl bg-white text-slate-900 p-6 shadow-xl">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Length</dt>
                  <dd className="font-bold">{course.weeks} weeks</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Time</dt>
                  <dd className="font-bold">{course.hoursPerWeek} hrs a week</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Lessons</dt>
                  <dd className="font-bold">{lessons.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Verified tests</dt>
                  <dd className="font-bold">{course.testIds.length}</dd>
                </div>
              </dl>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                <Users className="w-3.5 h-3.5" /> For {course.audiences.map((a) => AUDIENCE_LABELS[a].toLowerCase()).join(' and ')}
              </p>
              {enrolled ? (
                <div className="mt-5">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-indigo-700">
                    {pct}% done · {done.size} of {lessons.length} lessons
                  </p>
                  {nextLesson ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Next: <span className="font-semibold text-slate-900">{nextLesson.title}</span>
                    </p>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-emerald-700">All lessons done. Take the tests below to get verified.</p>
                  )}
                </div>
              ) : (
                <button onClick={onEnroll} className="mt-5 w-full py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                  Start learning, free
                </button>
              )}
              <button onClick={onTrainTeam} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
                <Building2 className="w-3.5 h-3.5" /> Enrol your team
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-10 lg:grid-cols-[1fr_340px] items-start">
        <div className="space-y-10 min-w-0">
          <section>
            <h2 className="text-xl font-bold text-slate-900">What you'll be able to do</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <li key={o} className="flex gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                  {o}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">Curriculum</h2>
              <span className="text-xs text-slate-500">
                {course.modules.length} modules · about {courseHours(course)} hours
              </span>
            </div>
            <ol className="mt-4 rounded-2xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
              {course.modules.map((m, mi) => {
                const isOpen = openModules.has(mi);
                const moduleDone = m.lessons.every((_, li) => done.has(`${mi}.${li}`));
                return (
                  <li key={m.title}>
                    <button onClick={() => toggleModule(mi)} aria-expanded={isOpen} className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50">
                      <span
                        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                          moduleDone && enrolled ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {moduleDone && enrolled ? <Check className="w-4 h-4" /> : mi + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-slate-900">{m.title}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{m.summary}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 mt-1 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <ul className="pb-3">
                        {m.lessons.map((l, li) => {
                          const key = `${mi}.${li}`;
                          const Icon = LESSON_ICONS[l.kind];
                          const isDone = done.has(key);
                          return (
                            <li key={key} className="flex items-center gap-3 pl-14 pr-4 py-2">
                              <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className={`flex-1 min-w-0 text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{l.title}</span>
                              <span className="text-[11px] text-slate-400 capitalize hidden sm:inline">{l.kind}</span>
                              <span className="text-[11px] text-slate-400 tabular-nums w-12 text-right">{minutesLabel(l.minutes)}</span>
                              {enrolled && (
                                <button
                                  onClick={() => onToggleLesson(key)}
                                  aria-label={isDone ? `Mark ${l.title} not done` : `Mark ${l.title} done`}
                                  aria-pressed={isDone}
                                  className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center ${
                                    isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 hover:border-indigo-500'
                                  }`}
                                >
                                  {isDone && <Check className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          {courseTests.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-slate-900">Get verified</h2>
              <p className="mt-1 text-sm text-slate-600">
                Finish with these Vetter tests. Your scores go on your profile and with your applications, and companies on Vetter hire on them.
              </p>
              <ul className="mt-4 space-y-2">
                {courseTests.map((t, i) => {
                  const best = candidate?.testResults.filter((r) => r.testId === t.id).reduce<number | null>((m, r) => Math.max(m ?? 0, r.score), null);
                  return (
                    <li key={t.id}>
                      <button onClick={() => onOpenTest(t.id)} className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 text-left hover:border-indigo-300">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">{t.title}</span>
                          <span className="block text-xs text-slate-500">
                            <Clock className="inline w-3 h-3 -mt-0.5" /> {t.estimatedMinutes} min · pass at {t.passingScore}%
                          </span>
                        </span>
                        {best !== null && best !== undefined ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${best >= t.passingScore ? 'text-emerald-700' : 'text-slate-500'}`}>
                            <BadgeCheck className="w-4 h-4" /> {best}%
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-indigo-700">Take test</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-slate-50 p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Target className="w-4 h-4 text-indigo-600" /> Who it's for
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {course.forWho.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>

          {relatedJobs.length > 0 && (
            <section className="rounded-2xl border border-slate-200 p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Briefcase className="w-4 h-4 text-indigo-600" /> Jobs this leads to
              </h2>
              <ul className="mt-3 space-y-3">
                {relatedJobs.map((j) => (
                  <li key={j.id}>
                    <button onClick={() => onOpenJob(j.id)} className="text-left">
                      <span className="block text-sm font-semibold text-slate-900 hover:text-indigo-700">{j.title}</span>
                      <span className="block text-xs text-slate-500">
                        {j.companyName} · {j.location}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-slate-900">More in {course.category}</h2>
              <div className="mt-3 space-y-3">
                {others.map((c) => (
                  <CourseCard key={c.id} course={c} progress={progress} onOpen={() => onOpenCourse(c.id)} />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};
