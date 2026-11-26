import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';
import { AssessmentTest, TestRole } from '../types';
import { ROLE_GROUPS } from './testRoles';

/**
 * What the Corprax team has hidden from the library: whole industries (categories), single roles, and single tests (a
 * test's every level). Hidden ones aren't listed to candidates or companies; the Corprax team still sees everything.
 * Kept in one Firestore document, settings/library, that anyone can read and only an admin can change. Without
 * Firebase (local work) it's kept in the browser.
 */

export interface LibraryVisibility {
  hiddenIndustries: string[];
  hiddenRoles: string[];
  hiddenTests: string[];
}

export const EMPTY_VISIBILITY: LibraryVisibility = { hiddenIndustries: [], hiddenRoles: [], hiddenTests: [] };
const LOCAL_KEY = 'vetter-library-visibility';

const clean = (v: Partial<LibraryVisibility> | undefined): LibraryVisibility => ({
  hiddenIndustries: Array.isArray(v?.hiddenIndustries) ? v!.hiddenIndustries : [],
  hiddenRoles: Array.isArray(v?.hiddenRoles) ? v!.hiddenRoles : [],
  hiddenTests: Array.isArray(v?.hiddenTests) ? v!.hiddenTests : [],
});

const readLocal = (): LibraryVisibility => {
  try {
    return clean(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}'));
  } catch {
    return EMPTY_VISIBILITY;
  }
};

// Everyone using the page sees changes as soon as the Corprax team saves them
export function useLibraryVisibility(): LibraryVisibility {
  const [v, setV] = useState<LibraryVisibility>(() => (firebaseEnabled ? EMPTY_VISIBILITY : readLocal()));
  useEffect(() => {
    if (!firebaseEnabled) {
      const onStorage = () => setV(readLocal());
      window.addEventListener('vetter-visibility', onStorage);
      return () => window.removeEventListener('vetter-visibility', onStorage);
    }
    return onSnapshot(
      doc(db(), 'settings', 'library'),
      (snap) => setV(clean(snap.data() as Partial<LibraryVisibility> | undefined)),
      () => setV(EMPTY_VISIBILITY)
    );
  }, []);
  return v;
}

export async function saveLibraryVisibility(v: LibraryVisibility): Promise<void> {
  const next = clean(v);
  if (!firebaseEnabled) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch {
      /* private mode: kept for this page only */
    }
    window.dispatchEvent(new Event('vetter-visibility'));
    return;
  }
  await setDoc(doc(db(), 'settings', 'library'), next);
}

// The industry a role is listed under
const industryOf = (role: TestRole) => ROLE_GROUPS.find((g) => g.roles.includes(role))?.industry;

export const roleHidden = (v: LibraryVisibility, role: TestRole) => v.hiddenRoles.includes(role) || v.hiddenIndustries.includes(industryOf(role) ?? '');

// A test is hidden when it's hidden itself, or when every role it's for is hidden (alone or by its industry). A test
// for no role is only hidden by name
export const testHidden = (v: LibraryVisibility, t: AssessmentTest) =>
  v.hiddenTests.includes(t.familyId ?? t.id) || (!!t.roles?.length && t.roles.every((r) => roleHidden(v, r)));
