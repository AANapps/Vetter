import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { User } from '../types';
import { db } from './firebase';
import { initialsAvatar } from '../data/seedCandidates';
import { publicProfile } from './cloud';

/**
 * A candidate's profile and progress (test results, job profiles, studies), kept in Firestore under their account so
 * it follows them to any device. It's public, like their place on the leaderboards, so it leaves out their email;
 * where they applied is kept with each application (src/lib/cloud.ts). See firestore.rules.
 */
const profileRef = (uid: string) => doc(db(), 'profiles', uid);

// Null when they haven't saved anything yet. The picture is drawn from their name, so it isn't stored
export async function loadProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;
  const { updatedAt: _, ...profile } = snap.data() as User & { updatedAt?: unknown };
  return { ...profile, appliedJobIds: profile.appliedJobIds ?? [], id: uid, avatarUrl: initialsAvatar(profile.name) };
}

export const saveProfile = (profile: User) => setDoc(profileRef(profile.id), { ...publicProfile(profile), updatedAt: serverTimestamp() });
