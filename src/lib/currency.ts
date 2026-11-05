import { useSyncExternalStore } from 'react';

/**
 * The currency Vetter shows its own prices in (plans, courses, the cost comparison). It starts as the visitor's local
 * currency, worked out from their time zone (where they are) and then their browser's language, and they can change it;
 * their choice is remembered on this device. Prices are converted at fixed approximate rates and rounded to tidy
 * amounts, so they read like local prices. What's charged doesn't change: AI credit is bought in pounds.
 */

export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'CAD' | 'AUD' | 'INR' | 'SGD' | 'NGN';

export const CURRENCIES: { code: CurrencyCode; label: string; locale: string; perGbp: number }[] = [
  { code: 'GBP', label: 'British pound', locale: 'en-GB', perGbp: 1 },
  { code: 'USD', label: 'US dollar', locale: 'en-US', perGbp: 1.27 },
  { code: 'EUR', label: 'Euro', locale: 'en-IE', perGbp: 1.17 },
  { code: 'CAD', label: 'Canadian dollar', locale: 'en-CA', perGbp: 1.74 },
  { code: 'AUD', label: 'Australian dollar', locale: 'en-AU', perGbp: 1.93 },
  { code: 'INR', label: 'Indian rupee', locale: 'en-IN', perGbp: 106 },
  { code: 'SGD', label: 'Singapore dollar', locale: 'en-SG', perGbp: 1.71 },
  { code: 'NGN', label: 'Nigerian naira', locale: 'en-NG', perGbp: 1950 },
];

const byCode = (code: CurrencyCode) => CURRENCIES.find((c) => c.code === code)!;
const isCode = (v: unknown): v is CurrencyCode => CURRENCIES.some((c) => c.code === v);

// ---------- Where the visitor is ----------

const EURO_COUNTRIES = new Set(['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK']);
const COUNTRY_CURRENCY: Record<string, CurrencyCode> = { GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD', IN: 'INR', SG: 'SGD', NG: 'NGN' };

// Time zones say where someone is better than their language does: plenty of people outside the US use en-US
const ZONE_COUNTRY: [RegExp, string][] = [
  [/^Europe\/(London|Belfast)$|^Europe\/(Jersey|Guernsey|Isle_of_Man)$/, 'GB'],
  [/^Europe\/(Dublin)$/, 'IE'],
  [/^Europe\/(Berlin|Busingen)$/, 'DE'],
  [/^Europe\/(Paris)$/, 'FR'],
  [/^Europe\/(Madrid)$|^Atlantic\/Canary$|^Africa\/Ceuta$/, 'ES'],
  [/^Europe\/(Lisbon)$|^Atlantic\/(Madeira|Azores)$/, 'PT'],
  [/^Europe\/(Amsterdam|Brussels|Luxembourg|Vienna|Rome|Helsinki|Athens|Tallinn|Riga|Vilnius|Ljubljana|Bratislava|Zagreb|Malta)$|^Asia\/Nicosia$/, 'DE'],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton|Whitehorse|Yellowknife|Iqaluit)$/, 'CA'],
  [/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana|Kentucky)|^Pacific\/Honolulu$/, 'US'],
  [/^Australia\//, 'AU'],
  [/^Asia\/(Kolkata|Calcutta)$/, 'IN'],
  [/^Asia\/Singapore$/, 'SG'],
  [/^Africa\/Lagos$/, 'NG'],
];

const currencyOfCountry = (country: string | undefined): CurrencyCode | undefined =>
  !country ? undefined : EURO_COUNTRIES.has(country) ? 'EUR' : COUNTRY_CURRENCY[country];

export function localCurrency(): CurrencyCode {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    const fromZone = currencyOfCountry(ZONE_COUNTRY.find(([re]) => re.test(zone))?.[1]);
    if (fromZone) return fromZone;
    for (const lang of navigator.languages ?? [navigator.language]) {
      const region = new Intl.Locale(lang).maximize().region;
      const fromLang = currencyOfCountry(region);
      if (fromLang) return fromLang;
    }
  } catch {
    // Older browsers: fall through to the default
  }
  return 'GBP';
}

// ---------- The chosen currency, shared by every price on the page ----------

const KEY = 'vetter-currency';
const read = (): CurrencyCode => {
  try {
    const saved = localStorage.getItem(KEY);
    if (isCode(saved)) return saved;
  } catch {
    // Storage blocked: use where they are
  }
  return localCurrency();
};

let current: CurrencyCode | null = null;
const listeners = new Set<() => void>();
const get = () => (current ??= read());

export function setCurrency(code: CurrencyCode) {
  current = code;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    // Not remembered, but still used for this visit
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// ---------- Converting and showing prices ----------

// Tidy local amounts: 79 pounds is 100 dollars, not 100.33; bigger amounts round to fewer figures
function tidy(n: number) {
  if (n === 0) return 0;
  const step = n < 100 ? 1 : n < 1000 ? 5 : n < 10000 ? 50 : n < 100000 ? 500 : n < 1000000 ? 5000 : 50000;
  return Math.max(step, Math.round(n / step) * step);
}

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode) {
  if (from === to) return amount;
  return tidy((amount / byCode(from).perGbp) * byCode(to).perGbp);
}

export function formatMoney(amount: number, code: CurrencyCode, opts: { compact?: boolean } = {}) {
  const c = byCode(code);
  return new Intl.NumberFormat(c.locale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
    ...(opts.compact ? { notation: 'compact', maximumFractionDigits: 0 } : {}),
  }).format(amount);
}

// Every component that shows a price uses this, so they all change together when the currency does
export function useCurrency() {
  const code = useSyncExternalStore(subscribe, get, get);
  return {
    code,
    set: setCurrency,
    // A price set in `from` (pounds unless said otherwise), in the chosen currency
    money: (amount: number, from: CurrencyCode = 'GBP', opts?: { compact?: boolean }) => formatMoney(convert(amount, from, code), code, opts),
    amount: (amount: number, from: CurrencyCode = 'GBP') => convert(amount, from, code),
  };
}
