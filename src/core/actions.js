// Things views do that touch more than one piece of state.
import { state, put, setUI, settings } from './store.js';
import { newSession } from './model.js';
import { doneSessions } from './stats.js';

export const toast = (msg) => setUI({ toast: { msg, id: Date.now() } });
export const activeSession = () => Object.values(state.sessions).filter((s) => s.status === 'active').sort((a, b) => b.startedAt - a.startedAt)[0] || null;

export function startSession(opts = {}) {
  if (activeSession()) { setUI({ screen: { name: 'workout' } }); toast('You already have a workout in progress.'); return; }
  put('sessions', newSession({ ...opts, unit: settings().units }));
  setUI({ screen: { name: 'workout' } });
}
/** In a rotation, the day after the one trained most recently. */
export function nextDayIndex(plan) {
  if (!plan || !plan.days.length) return -1;
  const last = doneSessions(state.sessions).find((s) => s.planId === plan.id && plan.days.some((d) => d.id === s.dayId));
  return last ? (plan.days.findIndex((d) => d.id === last.dayId) + 1) % plan.days.length : 0;
}
export function defaultTarget(ex, restSec) {
  if (ex.kind === 'cardio') return { sets: 1, repMin: 20, repMax: 30, restSec: 0 };
  if (ex.kind === 'timed') return { sets: 3, repMin: 30, repMax: 60, restSec: 60 };
  return { sets: 3, repMin: 8, repMax: 12, restSec };
}
export function targetText(t, kind) {
  if (!t) return '';
  const range = t.repMin === t.repMax ? `${t.repMin}` : `${t.repMin}–${t.repMax}`;
  return kind === 'cardio' ? `${range} min` : `${t.sets} × ${range}${kind === 'timed' ? ' s' : ''}`;
}
