/**
 * Firestore can't store an array inside an array (a desktop web page's table rows, an email rule's mustMention groups).
 * Tests and drafts are written through toFirestore, which keeps any such array as { $nested: "<its JSON>" }, and read
 * through fromFirestore, which turns it back. Anything without one comes back as the same object.
 */
const KEY = '$nested';

export function toFirestore<T>(value: T): T {
  return walkOut(value) as T;
}

function walkOut(v: unknown): unknown {
  if (Array.isArray(v)) return v.map((item) => (Array.isArray(item) ? { [KEY]: JSON.stringify(item) } : walkOut(item)));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, walkOut(x)]));
  return v;
}

const done = new WeakMap<object, unknown>();

export function fromFirestore<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  if (done.has(value as object)) return done.get(value as object) as T;
  const out = walkIn(value) as T;
  done.set(value as object, out);
  return out;
}

// The same object back when nothing inside it was wrapped
function walkIn(v: unknown): unknown {
  if (Array.isArray(v)) {
    let changed = false;
    const next = v.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item) && typeof (item as Record<string, unknown>)[KEY] === 'string' && Object.keys(item).length === 1) {
        changed = true;
        try {
          return JSON.parse((item as Record<string, string>)[KEY]);
        } catch {
          return [];
        }
      }
      const n = walkIn(item);
      if (n !== item) changed = true;
      return n;
    });
    return changed ? next : v;
  }
  if (v && typeof v === 'object') {
    let changed = false;
    const entries = Object.entries(v).map(([k, x]) => {
      const n = walkIn(x);
      if (n !== x) changed = true;
      return [k, n];
    });
    return changed ? Object.fromEntries(entries) : v;
  }
  return v;
}
