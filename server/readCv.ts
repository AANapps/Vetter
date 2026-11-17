import Anthropic from '@anthropic-ai/sdk';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { meter } from './meter.js';
import { apiFailure } from './generateTest.js';

/**
 * Reads a candidate's CV (a PDF, or text pasted from a CV or LinkedIn) and pulls out their profile: headline, about,
 * jobs, education, certifications and links (not skills: those come only from Praxa's tests), for them to check before it's saved (src/lib/cvImport.ts).
 * Praxa pays for it, so only signed-in people can use it, a few times an hour each.
 */

type Env = Record<string, string | undefined>;

const MAX_TEXT = 40000;
// A PDF as base64: about 3MB of file, inside the host's request limit
const MAX_PDF = 4_200_000;
const PER_HOUR = 8;

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const uses = new Map<string, number[]>();
const allowed = (uid: string) => {
  const now = Date.now();
  const recent = (uses.get(uid) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= PER_HOUR) return false;
  uses.set(uid, [...recent, now]);
  return true;
};

const str = { type: 'string' };
const schema = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    title: str,
    bio: str,
    location: str,
    yearsExperience: { type: 'integer' },
    careerStage: { type: 'string', enum: ['Student', 'Graduate', 'Working'] },
    experience: {
      type: 'array',
      items: { type: 'object', properties: { role: str, company: str, start: str, end: str, summary: str }, required: ['role', 'company', 'start', 'end', 'summary'], additionalProperties: false },
    },
    education: {
      type: 'array',
      items: { type: 'object', properties: { school: str, qualification: str, subject: str, start: str, end: str, grade: str }, required: ['school', 'qualification', 'subject', 'start', 'end', 'grade'], additionalProperties: false },
    },
    certifications: {
      type: 'array',
      items: { type: 'object', properties: { name: str, issuer: str, issued: str, expires: str, url: str }, required: ['name', 'issuer', 'issued', 'expires', 'url'], additionalProperties: false },
    },
    links: { type: 'array', items: { type: 'object', properties: { label: str, url: str }, required: ['label', 'url'], additionalProperties: false } },
  },
  required: ['found', 'title', 'bio', 'location', 'yearsExperience', 'careerStage', 'experience', 'education', 'certifications', 'links'],
  additionalProperties: false,
};

const today = () => new Date().toISOString().slice(0, 7);
const RULES = () => `You read a candidate's CV (or text copied from their LinkedIn) and fill in their profile on Praxa, a hiring
platform. Take only what the CV says: never invent a job, a date, a grade or a skill. British English, no em dashes.
- found: false if this isn't a CV or profile at all (then everything else empty).
- title: their headline, e.g. "Data Analyst" or "Computer Science student at Leeds", under 80 characters.
- bio: a short first-person "about" of 2 to 4 sentences, drawn from their own summary and what the CV shows; "" if there's
  too little to go on.
- location: town or city and country, as written; "" if none. yearsExperience: whole years of work, counting
  internships and placements, 0 if none. careerStage: Student (studying now), Graduate (finished within about two
  years, little work since) or Working.
- experience: every job, internship and placement, most recent first. Dates as YYYY-MM (a year alone as YYYY-01);
  end "" if they work there now. summary: one or two lines in the first person of what they did and achieved, from
  the CV's bullets; keep figures.
- education: degrees, school qualifications, bootcamps; most recent first; dates YYYY-MM or "".
- certifications: professional certifications and licences (AWS, CIPD, CompTIA, first aid...), not degrees.
- links: LinkedIn, GitHub, portfolio and the like, as written.
Unknown text fields are "". Today is ${today()}.`;

export async function readCv(body: unknown, env: Env, authorization: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = (body ?? {}) as { text?: string; pdf?: string };
  const text = String(req.text ?? '').trim().slice(0, MAX_TEXT);
  const pdf = String(req.pdf ?? '');
  if (!text && !pdf) return { status: 400, json: { error: 'Add your CV or paste its text.' } };
  if (pdf.length > MAX_PDF) return { status: 413, json: { error: 'That PDF is too big. Try one under 3MB, or paste the text instead.' } };
  if (!env.ANTHROPIC_API_KEY) return { status: 503, json: { error: 'not-configured' } };

  // Signed in, with accounts on: checked against Google's keys
  let uid = 'demo';
  const project = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '';
  if (project) {
    const token = authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return { status: 401, json: { error: 'Sign in to fill your profile from a CV.' } };
    try {
      const { payload } = await jwtVerify(token, keys, { issuer: `https://securetoken.google.com/${project}`, audience: project });
      uid = String(payload.sub ?? '');
    } catch {
      return { status: 401, json: { error: 'Your sign-in has expired. Refresh the page and try again.' } };
    }
  }
  if (!allowed(uid)) return { status: 429, json: { error: "You've read a few CVs in the last hour. Try again later, or fill it in by hand." } };

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const content: Anthropic.Beta.BetaContentBlockParam[] = pdf
    ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf } }, { type: 'text', text: 'Fill in my profile from this CV.' }]
    : [{ type: 'text', text: `Fill in my profile from this:\n\n${text}` }];
  try {
    const message = await client.beta.messages
      .stream({
        model,
        max_tokens: 8000,
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        system: RULES(),
        messages: [{ role: 'user', content }],
      })
      .finalMessage();
    meter(model, message.usage);
    if (message.stop_reason === 'refusal') return { status: 422, json: { error: "Praxa couldn't read that. Try pasting the text instead." } };
    return { status: 200, json: JSON.parse(message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')) };
  } catch (err) {
    return apiFailure('read-cv', err);
  }
}
