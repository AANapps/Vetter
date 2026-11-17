import { TestRole } from '../types';

/**
 * The job a candidate said they're after when signing up. Their profile isn't loaded yet at that moment, so it waits
 * here (on this device) until it is, then goes on their profile as targetRole and is cleared.
 */
const KEY = 'praxa-signup-role';

export const rememberSignUpRole = (role: string) => {
  try {
    localStorage.setItem(KEY, role);
  } catch {
    /* private window: they can pick it on Home instead */
  }
};

export const takeSignUpRole = (): TestRole | null => {
  try {
    const role = localStorage.getItem(KEY);
    if (role) localStorage.removeItem(KEY);
    return (role as TestRole) || null;
  } catch {
    return null;
  }
};
