// Dates, units and number formatting. Pure.

const pad = (n) => String(n).padStart(2, '0');

/** Local day key 'YYYY-MM-DD'. */
export function dayKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** A day key as a local Date at noon, which keeps day arithmetic clear of DST changes. */
export function keyDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key, n) {
  const d = keyDate(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(key) {
  return (keyDate(key).getDay() + 6) % 7;
}

/** The Monday of the week a day falls in. */
export function weekStart(key) {
  return addDays(key, -weekdayIndex(key));
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Tue 17 Nov' */
export function fmtDay(key) {
  const d = keyDate(key);
  return `${WEEKDAYS[weekdayIndex(key)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
/** '17 Nov' */
export function fmtShort(key) {
  const d = keyDate(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
/** 'Today', 'Yesterday', 'Tomorrow' or 'Tue 17 Nov'. */
export function fmtRelDay(key, today = dayKey()) {
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key === addDays(today, 1)) return 'Tomorrow';
  return fmtDay(key);
}

export const LB_PER_KG = 2.2046226218;
/** Convert a weight between 'kg' and 'lb'. */
export function conv(w, from, to) {
  if (w == null || from === to) return w;
  return from === 'kg' ? w * LB_PER_KG : w / LB_PER_KG;
}

/** A weight for display: at most one decimal, no trailing zero. */
export function fmtNum(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '';
  const p = 10 ** digits;
  return String(Math.round(n * p) / p);
}

/** Round to the nearest step (e.g. 2.5). */
export function roundTo(n, step) {
  if (!step) return n;
  return Math.round(n / step) * step;
}

/** Parse a text field into a number, accepting a decimal comma. Null when empty or not a number. */
export function parseNum(text) {
  if (text == null) return null;
  const t = String(text).trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function fmtDuration(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad(m % 60)} min`;
}

export function fmtClock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (f(x) || 0), 0);

/** A small deterministic random generator, so a generated plan can be reproduced from its seed. */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
