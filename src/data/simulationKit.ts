// Shared pieces for simulations: seeded data, rounding, and the checks their tasks are marked on

// A seeded random generator: the same numbers on every build
export function seeded(seed: number) {
  let h = seed >>> 0;
  return () => (h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round1 = (n: number) => Math.round(n * 10) / 10;
export const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
export const pad2 = (n: number) => String(n).padStart(2, '0');

// The ISO date `day` days after a start date
export const dayAfter = (startIso: string, day: number) => new Date(Date.parse(`${startIso}T00:00:00Z`) + day * 86400000).toISOString().slice(0, 10);

export const tc = (id: string, description: string, input: string, expectedOutput = '') => ({ id, description, input, expectedOutput });

// A fraction a spreadsheet check accepts either as a fraction or as a percentage number
export const fractionOrPercent = (f: number) => `${f}|${f * 100}`;

// Typed answers for a percentage to 1 decimal place: "41.3%", "41.3", and "41%" too when it's whole
export function percentAnswers(pct: number): string[] {
  const one = pct.toFixed(1);
  const forms = [`${one}%`, one];
  if (one.endsWith('.0')) forms.push(`${one.slice(0, -2)}%`, one.slice(0, -2));
  return forms;
}
