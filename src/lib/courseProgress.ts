import { useEffect, useState } from 'react';

// Which courses someone has started and which lessons they've finished, kept in this browser.
// Learning progress isn't a result anyone hires on (the course's Vetter tests are), so it doesn't need the server
export type CourseProgress = Record<string, { startedAt: string; done: string[] }>;

const KEY = 'vetter-course-progress';

const read = (): CourseProgress => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as CourseProgress;
  } catch {
    return {};
  }
};

export function useCourseProgress() {
  const [progress, setProgress] = useState<CourseProgress>(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      // Private windows can refuse storage; progress then lasts for the visit
    }
  }, [progress]);

  const enroll = (courseId: string) =>
    setProgress((prev) => (prev[courseId] ? prev : { ...prev, [courseId]: { startedAt: new Date().toISOString(), done: [] } }));
  const toggleLesson = (courseId: string, key: string) =>
    setProgress((prev) => {
      const course = prev[courseId] ?? { startedAt: new Date().toISOString(), done: [] };
      const done = course.done.includes(key) ? course.done.filter((k) => k !== key) : [...course.done, key];
      return { ...prev, [courseId]: { ...course, done } };
    });

  return { progress, enroll, toggleLesson };
}
