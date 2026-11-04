import { auth, firebaseEnabled } from './firebase';

// Every request to Vetter's AI carries who's asking, so the server can charge the company's credit
// (server/credits.ts). Without accounts (the demo) there's nobody to name, and nothing is charged
export async function aiFetch(path: string, payload: unknown): Promise<Response> {
  const user = firebaseEnabled ? auth().currentUser : null;
  const token = user ? await user.getIdToken().catch(() => '') : '';
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(payload),
  });
}

// The company's AI credit, in pence. billing is false when the site doesn't charge (no Stripe set up) or for the
// Vetter team
export interface Credit {
  billing: boolean;
  balance?: number;
  packs?: number[];
  // On confirming a payment: what it added
  added?: number;
  error?: string;
}

async function credits(payload: Record<string, unknown>): Promise<Credit> {
  try {
    const res = await aiFetch('/api/credits', payload);
    // A static host with no endpoint: no billing either
    if (res.status === 404) return { billing: false };
    const body = await res.json().catch(() => ({}));
    return res.ok ? body : { billing: true, error: body.error || "Couldn't check your credit." };
  } catch {
    return { billing: true, error: "Couldn't check your credit. Check your connection." };
  }
}

export const loadCredit = () => credits({ action: 'balance' });
export const confirmTopUp = (sessionId: string) => credits({ action: 'confirm', sessionId });
// A Stripe Checkout page for one of the packs
export async function topUpUrl(pence: number): Promise<{ url?: string; error?: string }> {
  try {
    const res = await aiFetch('/api/credits', { action: 'top-up', pence });
    const body = await res.json().catch(() => ({}));
    return res.ok && body.url ? { url: body.url } : { error: body.error || "Couldn't open the payment page." };
  } catch {
    return { error: "Couldn't open the payment page. Check your connection." };
  }
}

export const pounds = (pence: number) => `£${(Math.max(0, pence) / 100).toFixed(2)}`;
