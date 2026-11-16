import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';

/**
 * A company's booking of live, tutor-led training (src/data/trainingCatalogue.ts). The company asks; the Praxa team
 * confirms it, sets the dates and the tutor, and marks it done. Kept in Firestore trainingBookings (the company and the
 * Praxa team read them; the company creates and can cancel a request; the Praxa team does the rest), or in the browser
 * without Firebase.
 */

export type BookingStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

export interface TrainingBooking {
  id: string;
  businessId: string;
  companyName: string;
  itemId: string;
  title: string;
  // The whole Junior-to-Advanced path of a bootcamp, booked together
  path?: boolean;
  people: number;
  // Team members booked on, by team member id (the rest are named in notes or added later)
  memberIds: string[];
  // The week they'd like to start, as YYYY-MM-DD
  start: string;
  delivery: 'Live online' | 'At your office';
  notes?: string;
  pricePerPerson: number;
  total: number;
  status: BookingStatus;
  // Set by the Praxa team
  tutor?: string;
  schedule?: string;
  createdAt: string;
}

const LOCAL = 'vetter-training-bookings';
const readLocal = (): TrainingBooking[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]');
  } catch {
    return [];
  }
};
const writeLocal = (list: TrainingBooking[]) => {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(list));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event('vetter-bookings'));
};

// A company's bookings, or every booking for the Praxa team ('all'), newest first, kept up to date
export function useTrainingBookings(businessId: string | 'all' | null): TrainingBooking[] {
  const [list, setList] = useState<TrainingBooking[]>([]);
  useEffect(() => {
    if (!businessId) return setList([]);
    const sort = (xs: TrainingBooking[]) => [...xs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!firebaseEnabled) {
      const load = () => setList(sort(readLocal().filter((b) => businessId === 'all' || b.businessId === businessId)));
      load();
      window.addEventListener('vetter-bookings', load);
      return () => window.removeEventListener('vetter-bookings', load);
    }
    const q = businessId === 'all' ? collection(db(), 'trainingBookings') : query(collection(db(), 'trainingBookings'), where('businessId', '==', businessId));
    return onSnapshot(
      q,
      (snap) => setList(sort(snap.docs.map((d) => d.data() as TrainingBooking))),
      () => setList([])
    );
  }, [businessId]);
  return list;
}

export async function saveBooking(b: TrainingBooking): Promise<void> {
  const clean = JSON.parse(JSON.stringify(b)) as TrainingBooking;
  if (!firebaseEnabled) return writeLocal([clean, ...readLocal().filter((x) => x.id !== b.id)]);
  await setDoc(doc(db(), 'trainingBookings', b.id), clean);
}

export async function updateBooking(id: string, change: Partial<TrainingBooking>): Promise<void> {
  const clean = JSON.parse(JSON.stringify(change));
  if (!firebaseEnabled) return writeLocal(readLocal().map((x) => (x.id === id ? { ...x, ...clean } : x)));
  await updateDoc(doc(db(), 'trainingBookings', id), clean);
}
