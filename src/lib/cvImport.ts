import { CareerStage, Certification, Education, ProfileLink, User, WorkExperience } from '../types';
import { aiFetch } from './aiRequest';
import { safeUrl, sortExperience } from './experience';

/**
 * Filling a candidate's profile from their CV: the file (a PDF, or text) or pasted text goes to Corprax's AI
 * (server/readCv.ts), and what comes back is tidied into profile fields for the candidate to check before saving.
 * Skills aren't taken from the CV: a profile's skills are only the ones Corprax's tests have proven.
 */

export type ProfilePatch = Pick<User, 'title' | 'bio' | 'location' | 'yearsExperience' | 'careerStage' | 'experience' | 'education' | 'certifications' | 'links'>;

const MAX_PDF_BYTES = 3 * 1024 * 1024;
const ym = (s: unknown) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(s ?? '').trim()) ? String(s).trim() : /^\d{4}$/.test(String(s ?? '').trim()) ? `${String(s).trim()}-01` : '');
const text = (s: unknown, max: number) => String(s ?? '').trim().slice(0, max);
const stamp = () => Date.now().toString(36);

// Sorted most recent first: still going, then by when it ended, then started
const recentFirst = <T extends { start?: string; end?: string }>(list: T[]) => [...list].sort((a, b) => (b.end || '9999').localeCompare(a.end || '9999') || (b.start ?? '').localeCompare(a.start ?? ''));

function tidy(raw: Record<string, any>): ProfilePatch {
  const experience: WorkExperience[] = (raw.experience ?? [])
    .map((j: any, i: number) => ({ id: `exp-${stamp()}-${i}`, role: text(j.role, 80), company: text(j.company, 80), start: ym(j.start), ...(ym(j.end) && { end: ym(j.end) }), ...(text(j.summary, 600) && { summary: text(j.summary, 600) }) }))
    .filter((j: WorkExperience) => j.role && j.company && j.start)
    .slice(0, 12);
  const education: Education[] = recentFirst<Education>(
    (raw.education ?? [])
      .map((e: any, i: number) => ({
        id: `edu-${stamp()}-${i}`,
        school: text(e.school, 100),
        ...(text(e.qualification, 60) && { qualification: text(e.qualification, 60) }),
        ...(text(e.subject, 100) && { subject: text(e.subject, 100) }),
        ...(ym(e.start) && { start: ym(e.start) }),
        ...(ym(e.end) && { end: ym(e.end) }),
        ...(text(e.grade, 40) && { grade: text(e.grade, 40) }),
      }))
      .filter((e: Education) => e.school)
  ).slice(0, 8);
  const certifications: Certification[] = (raw.certifications ?? [])
    .map((c: any, i: number) => ({
      id: `cert-${stamp()}-${i}`,
      name: text(c.name, 100),
      ...(text(c.issuer, 80) && { issuer: text(c.issuer, 80) }),
      ...(ym(c.issued) && { issued: ym(c.issued) }),
      ...(ym(c.expires) && { expires: ym(c.expires) }),
      ...(safeUrl(String(c.url ?? '')) && String(c.url ?? '').trim() && { url: safeUrl(String(c.url))! }),
    }))
    .filter((c: Certification) => c.name)
    .slice(0, 12);
  const links: ProfileLink[] = (raw.links ?? []).flatMap((l: any) => {
    const url = String(l.url ?? '').trim() && safeUrl(String(l.url));
    return url ? [{ label: text(l.label, 40), url }] : [];
  }).slice(0, 4);
  const stage = ['Student', 'Graduate', 'Working'].includes(raw.careerStage) ? (raw.careerStage as CareerStage) : undefined;
  return {
    title: text(raw.title, 80),
    bio: text(raw.bio, 800),
    location: text(raw.location, 80),
    yearsExperience: Math.max(0, Math.min(50, Math.round(Number(raw.yearsExperience) || 0))),
    ...(stage && { careerStage: stage }),
    experience: sortExperience(experience),
    education,
    certifications,
    links,
  };
}

const asBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

// Reads a CV (a PDF or text file) or pasted text into profile fields; the reason it couldn't, otherwise
export async function readCv(input: { file?: File; text?: string }): Promise<{ patch?: ProfilePatch; error?: string }> {
  let payload: { pdf?: string; text?: string };
  const file = input.file;
  if (file) {
    const name = file.name.toLowerCase();
    if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
      if (file.size > MAX_PDF_BYTES) return { error: 'That PDF is over 3MB. Try a smaller one, or paste the text instead.' };
      payload = { pdf: await asBase64(file) };
    } else if (file.type.startsWith('text/') || /\.(txt|md|rtf)$/.test(name)) payload = { text: await file.text() };
    else return { error: 'Add your CV as a PDF (save a Word document as PDF first), or paste its text.' };
  } else if (input.text?.trim()) payload = { text: input.text };
  else return { error: 'Add your CV or paste its text.' };

  try {
    const res = await aiFetch('/api/read-cv', payload);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error === 'not-configured' || res.status === 404 ? "Reading CVs isn't available here yet. Fill your profile in by hand." : body.error || "Corprax couldn't read that CV. Try again." };
    if (!body.found) return { error: "That doesn't look like a CV. Try another file, or paste the text from your CV or LinkedIn." };
    return { patch: tidy(body) };
  } catch {
    return { error: "Couldn't reach Corprax. Check your connection and try again." };
  }
}

const same = (a = '', b = '') => a.trim().toLowerCase() === b.trim().toLowerCase();

// What the CV adds to the profile. Filling gaps keeps everything the candidate already wrote and adds what's new;
// replacing puts the CV's version in its place (fields the CV left blank are kept either way)
export function mergeProfile(user: User, patch: ProfilePatch, replace: boolean): Partial<User> {
  const keep = <T>(mine: T | undefined, theirs: T | undefined, empty: (v: T | undefined) => boolean) => (empty(theirs) ? mine : replace || empty(mine) ? theirs : mine);
  const blank = (v: unknown) => v === undefined || v === '' || v === 0;
  const add = <T>(mine: T[] = [], theirs: T[] = [], match: (a: T, b: T) => boolean) => (!theirs.length ? mine : replace ? theirs : [...mine, ...theirs.filter((t) => !mine.some((m) => match(m, t)))]);
  return {
    title: keep(user.title, patch.title, blank),
    bio: keep(user.bio, patch.bio, blank),
    location: keep(user.location, patch.location, blank),
    yearsExperience: keep(user.yearsExperience, patch.yearsExperience, blank),
    ...(patch.careerStage && { careerStage: keep(user.careerStage, patch.careerStage, blank) }),
    experience: sortExperience(add(user.experience, patch.experience, (a, b) => same(a.role, b.role) && same(a.company, b.company))),
    education: recentFirst(add(user.education, patch.education, (a, b) => same(a.school, b.school) && same(a.subject, b.subject))),
    certifications: add(user.certifications, patch.certifications, (a, b) => same(a.name, b.name)),
    links: add(user.links, patch.links, (a, b) => same(a.url, b.url)).slice(0, 4),
  };
}
