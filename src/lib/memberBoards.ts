import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';
import { Project, ProjectTask } from '../types';

/**
 * A company's projects and CRM boards, as someone on its team sees them in Work mode: every board of the company, live,
 * and their changes saved straight back (firestore.rules lets an active team member read the company's boards and work
 * on its items; making or deleting a board stays with the company). Without accounts (the demo) the app's own state
 * holds every board, so this isn't used.
 */
export function useMemberBoards(businessId: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProjects([]);
    setTasks([]);
    setError(null);
    if (!firebaseEnabled || !businessId) return;
    const fail = (err: unknown) => setError(err instanceof Error ? err.message : String(err));
    const offProjects = onSnapshot(
      query(collection(db(), 'projects'), where('businessId', '==', businessId)),
      (snap) => setProjects(snap.docs.map((d) => ({ ...(d.data() as Project), id: d.id }))),
      fail
    );
    const offTasks = onSnapshot(
      query(collection(db(), 'projectTasks'), where('businessId', '==', businessId)),
      (snap) => setTasks(snap.docs.map((d) => ({ ...(d.data() as ProjectTask), id: d.id })).sort((a, b) => a.createdAt.localeCompare(b.createdAt))),
      fail
    );
    return () => {
      offProjects();
      offTasks();
    };
  }, [businessId]);

  const write = (name: 'projects' | 'projectTasks', item: { id: string }) => setDoc(doc(db(), name, item.id), JSON.parse(JSON.stringify(item))).catch((e) => setError(e.message));
  return {
    projects,
    tasks,
    error,
    saveProject: (p: Project) => write('projects', p),
    saveTask: (t: ProjectTask) => write('projectTasks', t),
    deleteTask: (t: ProjectTask) => deleteDoc(doc(db(), 'projectTasks', t.id)).catch((e) => setError(e.message)),
  };
}
