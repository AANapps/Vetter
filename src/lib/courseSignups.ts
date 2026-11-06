import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';

/**
 * Career switch courses are sold by sign-up, not checkout: the person leaves their email and phone, and the Vetter
 * team contacts them. Sign-ups go to Firestore `courseSignups`, which only admins can read (see firestore.rules).
 */
export interface CourseSignup {
  courseId: string;
  courseTitle: string;
  price: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  // Set when the person was signed in
  uid?: string;
}

export const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
// At least 7 digits, allowing spaces, dashes, brackets and a leading +
export const validPhone = (phone: string) => /^\+?[\d\s\-().]{7,25}$/.test(phone.trim()) && phone.replace(/\D/g, '').length >= 7;

export async function submitCourseSignup(signup: CourseSignup): Promise<void> {
  const data = {
    ...signup,
    name: signup.name.trim(),
    email: signup.email.trim().toLowerCase(),
    phone: signup.phone.trim(),
    note: signup.note.trim(),
  };
  if (!firebaseEnabled) {
    // Demo mode has no database; the form still works so it can be tried
    console.info('Course sign-up (demo, not saved):', data);
    return;
  }
  await addDoc(collection(db(), 'courseSignups'), { ...data, createdAt: serverTimestamp() });
}

// The Vetter team's list of course sign-ups, newest first (admins only; see firestore.rules)
export async function listCourseSignups(): Promise<(CourseSignup & { id: string; createdAt?: Date })[]> {
  const snap = await getDocs(query(collection(db(), 'courseSignups'), orderBy('createdAt', 'desc'), limit(200)));
  return snap.docs.map((d) => {
    const data = d.data();
    return { ...(data as CourseSignup), id: d.id, createdAt: data.createdAt?.toDate?.() };
  });
}
