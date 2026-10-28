import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { User } from '../types';
import { db } from './firebase';
import { initialsAvatar } from '../data/seedCandidates';

/**
 * A candidate's profile and progress (test results, applications, job profiles), kept in Firestore under their
 * account so it follows them to any device. Only they (and the Vetter team) can read it; see firestore.rules.
 */
const profileRef = (uid: string) => doc(db(), 'profiles', uid);

// Null when they haven't saved anything yet. The picture is drawn from their name, so it isn't stored
export async function loadProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;
  const { updatedAt: _, ...profile } = snap.data() as User & { updatedAt?: unknown };
  return { ...profile, id: uid, avatarUrl: initialsAvatar(profile.name) };
}

export function saveProfile(profile: User) {
  const { avatarUrl: _, ...rest } = profile;
  return setDoc(profileRef(profile.id), { ...rest, updatedAt: serverTimestamp() });
}
