import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Granyt's code runner: runs a candidate's program in any language that isn't run in the browser (Java, C#, C++, Go,
 * Rust, PHP, Ruby, TypeScript and the rest), once per test case with that case's input on standard input. The running
 * is done by Judge0 (judge0.com), in its own sandbox, never on Granyt's server:
 *
 * - JUDGE0_URL: a self-hosted Judge0, or leave it out for Judge0 CE on RapidAPI
 * - JUDGE0_KEY: the RapidAPI key, or a self-hosted Judge0's auth token
 *
 * Without either, every run answers "not-configured" and the editor says so. Only signed-in people can run code, and
 * each person is held to a rate a test needs, so the runner can't be used as free computing.
 */

type Env = Record<string, string | undefined>;

const RAPIDAPI = 'https://judge0-ce.p.rapidapi.com';
const MAX_CODE = 64 * 1024;
const MAX_INPUT = 16 * 1024;
const MAX_CASES = 12;
// Runs (one per test case) a person may make a minute, and in an hour
const PER_MINUTE = 60;
const PER_HOUR = 600;

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const projectOf = (env: Env) => env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '';

const configured = (env: Env) => !!(env.JUDGE0_KEY || env.JUDGE0_URL);
const baseUrl = (env: Env) => (env.JUDGE0_URL || RAPIDAPI).replace(/\/+$/, '');
function headers(env: Env): Record<string, string> {
  const url = baseUrl(env);
  if (!env.JUDGE0_KEY) return {};
  if (url.includes('rapidapi.com')) return { 'X-RapidAPI-Key': env.JUDGE0_KEY, 'X-RapidAPI-Host': new URL(url).host };
  return { 'X-Auth-Token': env.JUDGE0_KEY };
}

// Judge0's languages, read once per server: { id, name } such as { 71, "Python (3.8.1)" }
let languages: Promise<{ id: number; name: string }[]> | null = null;
function languageList(env: Env) {
  if (!languages) {
    languages = fetch(`${baseUrl(env)}/languages`, { headers: headers(env) })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`languages ${res.status}`))))
      .catch((err) => {
        languages = null;
        throw err;
      });
  }
  return languages;
}

// The Judge0 language for one of Granyt's: of the ones whose names match, the newest (Judge0 numbers newer versions higher)
async function languageId(env: Env, names: string[]): Promise<number | undefined> {
  const list = await languageList(env);
  const found = list.filter((l) => names.some((prefix) => l.name.startsWith(prefix)) && !/archived|deprecated/i.test(l.name)).sort((a, b) => b.id - a.id);
  return found[0]?.id;
}

// How many runs each person made recently, per server instance: enough to stop a loop or a script, not a ledger
const recent = new Map<string, number[]>();
function allowed(uid: string, runs: number): boolean {
  const now = Date.now();
  const times = (recent.get(uid) ?? []).filter((t) => now - t < 3600_000);
  const lastMinute = times.filter((t) => now - t < 60_000).length;
  if (lastMinute + runs > PER_MINUTE || times.length + runs > PER_HOUR) return false;
  recent.set(uid, [...times, ...Array(runs).fill(now)]);
  return true;
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s: string | null | undefined) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');

interface Run {
  stdout: string;
  stderr: string;
  error?: string;
}

async function runOne(env: Env, languageId: number, code: string, input: string): Promise<Run> {
  const res = await fetch(`${baseUrl(env)}/submissions?base64_encoded=true&wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers(env) },
    body: JSON.stringify({ source_code: b64(code), language_id: languageId, stdin: b64(input), cpu_time_limit: 5, wall_time_limit: 10, memory_limit: 256000 }),
  });
  if (res.status === 429) return { stdout: '', stderr: '', error: 'The code runner is busy. Run it again in a moment.' };
  if (!res.ok) return { stdout: '', stderr: '', error: `The code runner couldn't run it (${res.status}). Try again in a moment.` };
  const out = (await res.json()) as { stdout?: string; stderr?: string; compile_output?: string; message?: string; status?: { id: number; description: string } };
  const stdout = unb64(out.stdout);
  const stderr = unb64(out.stderr);
  const status = out.status?.id ?? 0;
  // 3 is Accepted (it ran and finished); 6 a compile error; 5 time limit; 7 to 12 runtime errors
  if (status === 3) return { stdout, stderr };
  if (status === 6) return { stdout, stderr, error: `It didn't compile:\n${unb64(out.compile_output).trim().slice(0, 2000)}` };
  if (status === 5) return { stdout, stderr, error: 'Stopped: it ran for more than 5 seconds' };
  const detail = [stderr.trim(), unb64(out.message).trim()].filter(Boolean).join('\n').slice(0, 2000);
  return { stdout, stderr, error: `${out.status?.description ?? 'It crashed'}${detail ? `:\n${detail}` : ''}` };
}

export async function runCode(body: unknown, env: Env, authorization?: string): Promise<{ status: number; json: unknown }> {
  const req = (body ?? {}) as { language?: string; runner?: string[]; code?: string; inputs?: string[] };
  const code = String(req.code ?? '');
  const inputs = (Array.isArray(req.inputs) ? req.inputs : []).slice(0, MAX_CASES).map((i) => String(i ?? '').slice(0, MAX_INPUT));
  const names = (Array.isArray(req.runner) ? req.runner : []).map(String).filter((n) => n.length > 1 && n.length < 40).slice(0, 4);
  if (!code.trim() || !inputs.length || !names.length) return { status: 400, json: { error: 'Nothing to run.' } };
  if (code.length > MAX_CODE) return { status: 413, json: { error: 'The code is too long to run.' } };
  if (!configured(env)) return { status: 503, json: { error: 'not-configured' } };

  // Signed in, with accounts on: checked against Google's keys. A demo without accounts runs it as one shared person
  let uid = 'demo';
  const project = projectOf(env);
  if (project) {
    const token = authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return { status: 401, json: { error: 'Sign in to run code.' } };
    try {
      const { payload } = await jwtVerify(token, keys, { issuer: `https://securetoken.google.com/${project}`, audience: project });
      uid = String(payload.sub ?? '');
    } catch {
      return { status: 401, json: { error: 'Your sign-in has expired. Refresh the page and try again.' } };
    }
  }
  if (!allowed(uid, inputs.length)) return { status: 429, json: { error: "You've run code a lot in a short time. Wait a minute and try again." } };

  try {
    const id = await languageId(env, names);
    if (!id) return { status: 400, json: { error: `${req.language ?? 'That language'} isn't available on the code runner.` } };
    const runs = await Promise.all(inputs.map((input) => runOne(env, id, code, input)));
    return { status: 200, json: { runs } };
  } catch (err) {
    console.error('[run-code]', err);
    return { status: 502, json: { error: "Couldn't reach the code runner. Try again in a moment." } };
  }
}
