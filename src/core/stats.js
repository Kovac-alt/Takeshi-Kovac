// Pure calculations and formatting over sessions. No DOM, no storage.
import { isCountedSet } from './model.js';

export const KG_PER_LB = 0.45359237;
export function convert(w, from, to) {
  if (w == null || from === to) return w;
  return from === 'kg' ? w / KG_PER_LB : w * KG_PER_LB;
}
/** Epley estimate of a one-rep max. One rep is the lift itself. */
export const e1rm = (w, reps) => (!(w > 0) || !(reps > 0) ? 0 : reps === 1 ? w : w * (1 + reps / 30));

export const fmt = (n, dp = 2) => (n == null || !isFinite(n) ? '' : String(Math.round(n * 10 ** dp) / 10 ** dp));
export const fmtClock = (sec) => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export function fmtDur(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
export const dayKey = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const fromDayKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtDate = (ts, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat(undefined, opts).format(new Date(ts));
export function startOfWeek(ts, weekStart = 1) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - weekStart + 7) % 7));
  return d.getTime();
}

/** One set as text, e.g. '60 kg × 8'. */
export function setText(set, kind, unit) {
  if (kind === 'cardio') return `${fmt(set.minutes)} min${set.distance ? ` · ${fmt(set.distance)} ${unit === 'kg' ? 'km' : 'mi'}` : ''}`;
  if (kind === 'timed') return `${fmt(set.seconds)} s${set.weight ? ` +${fmt(set.weight)} ${unit}` : ''}`;
  if (kind === 'bodyweight') return `${fmt(set.reps)} reps${set.weight ? ` +${fmt(set.weight)} ${unit}` : ''}`;
  return `${fmt(set.weight)} ${unit} × ${fmt(set.reps)}`;
}
/** The number a set is judged by for progress, per exercise kind. */
export function setScore(set, kind, fromUnit, toUnit) {
  if (kind === 'cardio') return set.minutes || 0;
  if (kind === 'timed') return set.seconds || 0;
  if (kind === 'bodyweight') return set.reps || 0;
  return e1rm(convert(set.weight, fromUnit, toUnit), set.reps);
}
export const SCORE_LABEL = { weight: 'Estimated 1-rep max', bodyweight: 'Most reps in a set', timed: 'Longest hold', cardio: 'Longest effort' };
export const scoreUnit = (kind, unit) => ({ weight: unit, bodyweight: 'reps', timed: 's', cardio: 'min' }[kind]);

export const doneSessions = (sessions) => Object.values(sessions).filter((s) => s.status === 'done').sort((a, b) => b.startedAt - a.startedAt);
export const countedSets = (session) => session.entries.reduce((n, e) => n + e.sets.filter(isCountedSet).length, 0);
/** Total weight moved, in `unit`. Only weight-and-reps sets count. */
export function sessionVolume(session, unit) {
  let v = 0;
  for (const e of session.entries) for (const s of e.sets) if (isCountedSet(s) && s.weight && s.reps) v += convert(s.weight, session.unit, unit) * s.reps;
  return v;
}
/** The most recent finished entry for an exercise: { session, entry } or null. */
export function lastEntry(sessions, exerciseId, excludeId) {
  for (const s of doneSessions(sessions)) {
    if (s.id === excludeId) continue;
    const entry = s.entries.find((e) => e.exerciseId === exerciseId && e.sets.some(isCountedSet));
    if (entry) return { session: s, entry };
  }
  return null;
}
/** Oldest first: one point per session that included the exercise. */
export function exerciseHistory(sessions, exerciseId, kind, unit) {
  const out = [];
  for (const s of doneSessions(sessions).reverse()) {
    let best = null, score = 0;
    for (const e of s.entries) if (e.exerciseId === exerciseId) for (const set of e.sets) if (isCountedSet(set)) {
      const sc = setScore(set, kind, s.unit, unit);
      if (sc > score || !best) { score = sc; best = set; }
    }
    if (best) out.push({ t: s.startedAt, v: score, set: best, unit: s.unit, sessionId: s.id });
  }
  return out;
}
/** Counted sets per primary muscle since `from`. */
export function muscleSets(sessions, getExercise, from) {
  const out = {};
  for (const s of doneSessions(sessions)) {
    if (s.startedAt < from) continue;
    for (const e of s.entries) { const m = getExercise(e.exerciseId).muscle, n = e.sets.filter(isCountedSet).length; if (n) out[m] = (out[m] || 0) + n; }
  }
  return out;
}
/** Daily calorie estimate (Mifflin-St Jeor) with a simple macro split. */
export function estimateTargets({ sex, age, heightCm, weightKg, activity, goal }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : sex === 'female' ? -161 : -78);
  const factor = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[activity] || 1.55;
  const kcal = Math.round(base * factor * ({ lose: 0.85, gain: 1.1 }[goal] || 1) / 10) * 10;
  const protein = Math.round(weightKg * 1.8), fat = Math.round(kcal * 0.25 / 9);
  return { kcal, protein, fat, carbs: Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4)) };
}
