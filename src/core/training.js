// Plan generation, progression and training statistics. Pure.
import { EXERCISES, EQUIPMENT_SETS, getExercise } from '../data/exercises.js';
import { PRIORITIES, isCountedSet, newPlan, newPlanDay, newPlanItem } from './model.js';
import { conv, dayKey, roundTo, weekdayIndex } from './util.js';

// A day is a list of slots: [movement pattern, tier, variant].
// Tier A = the day's main lift, B = second compound, C = isolation or accessory.
// Variant picks the n-th preferred exercise for the pattern, so A and B days differ.
const DAYS = {
  upperA: ['Upper A', 'Chest, back, shoulders, arms', [['h_push', 'A'], ['h_pull', 'A'], ['v_push', 'B'], ['v_pull', 'B'], ['lateral_raise', 'C'], ['triceps', 'C'], ['biceps', 'C']]],
  upperB: ['Upper B', 'Back, chest, shoulders, arms', [['v_pull', 'A'], ['incline_push', 'A'], ['h_pull', 'B', 1], ['chest_fly', 'C'], ['rear_delt', 'C'], ['biceps', 'C', 1], ['triceps', 'C', 1]]],
  lowerA: ['Lower A', 'Quads, hamstrings, calves', [['squat', 'A'], ['hinge', 'B'], ['lunge', 'B'], ['knee_flex', 'C'], ['calf', 'C'], ['core_flex', 'C']]],
  lowerB: ['Lower B', 'Hamstrings, glutes, quads', [['hinge', 'A', 1], ['squat', 'B', 1], ['hip_thrust', 'B'], ['knee_ext', 'C'], ['calf', 'C', 1], ['core_stab', 'C']]],
  pushA: ['Push A', 'Chest, shoulders, triceps', [['h_push', 'A'], ['v_push', 'B'], ['incline_push', 'B'], ['lateral_raise', 'C'], ['chest_fly', 'C'], ['triceps', 'C']]],
  pushB: ['Push B', 'Shoulders, chest, triceps', [['v_push', 'A', 1], ['incline_push', 'B', 1], ['h_push', 'B', 1], ['lateral_raise', 'C', 1], ['triceps', 'C', 1], ['triceps', 'C', 2]]],
  pullA: ['Pull A', 'Back, rear delts, biceps', [['v_pull', 'A'], ['h_pull', 'A'], ['v_pull', 'B', 1], ['rear_delt', 'C'], ['biceps', 'C'], ['biceps', 'C', 4]]],
  pullB: ['Pull B', 'Back, traps, biceps', [['h_pull', 'A', 1], ['v_pull', 'B', 3], ['h_pull', 'B', 3], ['rear_delt', 'C', 1], ['shrug', 'C'], ['biceps', 'C', 1]]],
  legsA: ['Legs A', 'Quads, hamstrings, calves', [['squat', 'A'], ['hinge', 'B'], ['lunge', 'B'], ['knee_ext', 'C'], ['knee_flex', 'C'], ['calf', 'C']]],
  legsB: ['Legs B', 'Glutes, hamstrings, quads', [['hinge', 'A', 1], ['squat', 'B', 1], ['hip_thrust', 'B'], ['knee_flex', 'C', 1], ['calf', 'C', 1], ['core_flex', 'C']]],
  fullA: ['Full body A', 'Squat, press, row', [['squat', 'A'], ['h_push', 'A'], ['h_pull', 'A'], ['hinge', 'B'], ['lateral_raise', 'C'], ['biceps', 'C'], ['core_flex', 'C']]],
  fullB: ['Full body B', 'Hinge, incline press, pull', [['hinge', 'A'], ['incline_push', 'A'], ['v_pull', 'A'], ['lunge', 'B'], ['triceps', 'C'], ['rear_delt', 'C'], ['core_stab', 'C']]],
  fullC: ['Full body C', 'Overhead press, legs, row', [['squat', 'B', 1], ['v_push', 'A'], ['h_pull', 'B', 1], ['h_push', 'B', 1], ['knee_flex', 'C'], ['biceps', 'C', 1], ['calf', 'C']]],
};

const SPLITS = {
  2: { name: 'Full body, 2 days', days: ['fullA', 'fullB'], week: [0, null, null, 1, null, null, null] },
  3: { name: 'Full body, 3 days', days: ['fullA', 'fullB', 'fullC'], week: [0, null, 1, null, 2, null, null] },
  4: { name: 'Upper / Lower, 4 days', days: ['upperA', 'lowerA', 'upperB', 'lowerB'], week: [0, 1, null, 2, 3, null, null] },
  5: { name: 'Push / Pull / Legs + Upper / Lower', days: ['pushA', 'pullA', 'legsA', 'upperB', 'lowerB'], week: [0, 1, 2, null, 3, 4, null] },
  6: { name: 'Push / Pull / Legs, twice a week', days: ['pushA', 'pullA', 'legsA', 'pushB', 'pullB', 'legsB'], week: [0, 1, 2, 3, 4, 5, null] },
};

const SPLIT_WHY = {
  2: 'Two full-body sessions train every muscle twice a week, the minimum that still builds well.',
  3: 'Three full-body sessions hit every muscle three times a week with a rest day between each.',
  4: 'Upper and lower days alternate so every muscle is trained twice a week with room to recover.',
  5: 'Three focused days plus an upper and a lower day: each muscle twice a week, with extra volume for the upper body.',
  6: 'Push, pull and legs, run twice: the most weekly volume, for when recovery and time allow.',
};

function prescription(tier, ex, profile) {
  const beginner = profile.experience === 'beginner';
  const advanced = profile.experience === 'advanced';
  const cutting = profile.goal === 'cut';
  if (ex.kind === 'timed') return { sets: 3, repMin: 30, repMax: 60, restSec: 60 };
  if (tier === 'A') return { sets: beginner ? 3 : 4, repMin: 5, repMax: 8, restSec: 180 };
  if (tier === 'B') return { sets: advanced && !cutting ? 4 : 3, repMin: 8, repMax: 12, restSec: 120 };
  return { sets: cutting || beginner ? 2 : 3, repMin: 10, repMax: 15, restSec: 75 };
}

function pick(pattern, variant, allowed, used, preferLoaded) {
  let pool = EXERCISES.filter((e) => e.pattern === pattern && allowed.includes(e.equipment) && !used.has(e.id));
  if (!pool.length) return null;
  // Beginners in a gym start on loadable versions rather than bodyweight pull-ups and dips.
  if (preferLoaded && pool.some((e) => e.kind === 'weight')) pool = pool.filter((e) => e.kind === 'weight');
  return pool[variant % pool.length];
}

/**
 * Build a training plan from a profile.
 * @param {import('./model.js').Profile} profile
 * @returns {import('./model.js').Plan}
 */
export function generatePlan(profile) {
  const n = Math.min(6, Math.max(2, profile.daysPerWeek || 4));
  const split = SPLITS[n];
  const allowed = EQUIPMENT_SETS[profile.equipment] || EQUIPMENT_SETS.full_gym;
  const priority = (PRIORITIES.find((p) => p.id === profile.priority) || PRIORITIES[0]).muscles;
  const preferLoaded = profile.experience === 'beginner' && profile.equipment !== 'bodyweight';
  const cardio = profile.goal === 'cut' && allowed.includes('cardio_machine');

  const days = split.days.map((key, di) => {
    const [name, focus, slots] = DAYS[key];
    const used = new Set();
    const items = [];
    for (const [pattern, tier, variant = 0] of slots) {
      const ex = pick(pattern, variant, allowed, used, preferLoaded);
      if (!ex) continue;
      used.add(ex.id);
      const rx = prescription(tier, ex, profile);
      if (priority.includes(ex.muscle)) rx.sets = Math.min(5, rx.sets + 1);
      items.push(newPlanItem(ex.id, rx));
    }
    if (cardio && di % 2 === 1) items.push(newPlanItem('incline-walk', { sets: 1, repMin: 15, repMax: 25, restSec: 0 }));
    const day = newPlanDay(name, items);
    day.focus = focus;
    return day;
  });

  return newPlan({
    name: split.name,
    description: SPLIT_WHY[n],
    source: 'generated',
    days,
    schedule: { mode: 'weekdays', weekdays: split.week.map((i) => (i == null ? null : days[i].id)) },
  });
}

/** Exercises that could stand in for one: same movement pattern first, then same muscle. */
export function alternatives(exerciseId, equipmentSetup, custom = []) {
  const ex = getExercise(exerciseId, custom);
  const allowed = EQUIPMENT_SETS[equipmentSetup] || EQUIPMENT_SETS.full_gym;
  const all = [...EXERCISES, ...custom].filter((e) => e.id !== ex.id && allowed.includes(e.equipment));
  const same = all.filter((e) => e.pattern === ex.pattern);
  const muscle = all.filter((e) => e.pattern !== ex.pattern && e.muscle === ex.muscle);
  return [...same, ...muscle];
}

// ---- progression ----

/** Estimated one-rep max, Epley. Reps above 12 are too far from a max to say much. */
export function e1rm(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + Math.min(reps, 12) / 30);
}

export function doneSessions(sessions) {
  return Object.values(sessions)
    .filter((s) => s.status === 'done' && !s.deleted)
    .sort((a, b) => a.startedAt - b.startedAt);
}

/** The most recent finished entry for an exercise, with its session. */
export function lastEntry(sessions, exerciseId) {
  const done = doneSessions(sessions);
  for (let i = done.length - 1; i >= 0; i--) {
    const entry = done[i].entries.find((e) => e.exerciseId === exerciseId && e.sets.some(isCountedSet));
    if (entry) return { entry, session: done[i] };
  }
  return null;
}

/**
 * What to aim for today, by double progression: add reps inside the range, and once every
 * set reaches the top of the range, add weight and start again from the bottom.
 * @returns {{weight:number|null, reps:number, text:string, last:string}|null}
 */
export function suggest(ex, target, last, unit, increment) {
  const t = target || { repMin: 8, repMax: 12 };
  if (!last) return null;
  const sets = last.entry.sets.filter(isCountedSet);
  if (!sets.length) return null;
  const from = last.session.unit;
  if (ex.kind === 'timed' || ex.kind === 'cardio') {
    const key = ex.kind === 'timed' ? 'seconds' : 'minutes';
    const best = Math.max(...sets.map((s) => s[key] || 0));
    const u = ex.kind === 'timed' ? 's' : 'min';
    return { weight: null, reps: best, text: `Match or beat ${best} ${u}`, last: `${sets.map((s) => s[key] || 0).join(', ')} ${u}` };
  }
  const top = sets.reduce((a, s) => ((s.weight || 0) > (a.weight || 0) ? s : a), sets[0]);
  const w = top.weight == null ? null : roundTo(conv(top.weight, from, unit), unit === from ? 0 : 0.5);
  const atTop = sets.filter((s) => (s.weight || 0) === (top.weight || 0));
  const minReps = Math.min(...atTop.map((s) => s.reps || 0));
  const lastText = `${w ? `${fmt(w)} ${unit} × ` : ''}${sets.map((s) => s.reps || 0).join(', ')}`;
  if (minReps >= t.repMax) {
    if (ex.kind === 'weight' && w && increment) {
      const next = w + increment;
      return { weight: next, reps: t.repMin, text: `Go up to ${fmt(next)} ${unit}, aim for ${t.repMin} or more`, last: lastText };
    }
    return { weight: w, reps: minReps + 1, text: `Top of the range. Add a rep or a little weight`, last: lastText };
  }
  const aim = Math.max(t.repMin, minReps + 1);
  return { weight: w, reps: aim, text: `${w ? `Stay at ${fmt(w)} ${unit}, ` : ''}aim for ${aim} reps`, last: lastText };
}

const fmt = (n) => String(Math.round(n * 100) / 100);

// ---- statistics ----

/** Best estimated max per session for one exercise, oldest first, in `unit`. */
export function exerciseHistory(sessions, exerciseId, unit) {
  const out = [];
  for (const s of doneSessions(sessions)) {
    let best = null;
    for (const e of s.entries) {
      if (e.exerciseId !== exerciseId) continue;
      for (const set of e.sets) {
        if (!isCountedSet(set) || !set.reps) continue;
        const w = conv(set.weight || 0, s.unit, unit);
        const score = w ? e1rm(w, set.reps) : set.reps;
        if (!best || score > best.value) best = { value: score, weight: w, reps: set.reps };
      }
    }
    if (best) out.push({ date: dayKey(new Date(s.startedAt)), ...best });
  }
  return out;
}

/** Total working volume of a session (weight × reps), in the session's unit. */
export function sessionStats(session) {
  let sets = 0;
  let volume = 0;
  for (const e of session.entries) {
    for (const s of e.sets) {
      if (!isCountedSet(s)) continue;
      sets += 1;
      volume += (s.weight || 0) * (s.reps || 0);
    }
  }
  return { sets, volume: Math.round(volume) };
}

/** Personal records set in a session: exercises whose best set beat everything before it. */
export function sessionRecords(session, sessions, custom = []) {
  const before = {};
  for (const s of doneSessions(sessions)) {
    if (s.id === session.id || s.startedAt >= session.startedAt) continue;
    for (const e of s.entries) {
      for (const set of e.sets) {
        if (!isCountedSet(set) || !set.weight || !set.reps) continue;
        const v = e1rm(conv(set.weight, s.unit, session.unit), set.reps);
        if (v > (before[e.exerciseId] || 0)) before[e.exerciseId] = v;
      }
    }
  }
  const records = [];
  for (const e of session.entries) {
    let best = null;
    for (const set of e.sets) {
      if (!isCountedSet(set) || !set.weight || !set.reps) continue;
      const v = e1rm(set.weight, set.reps);
      if (!best || v > best.v) best = { v, set };
    }
    // Only a record when there was something to beat.
    if (best && before[e.exerciseId] && best.v > before[e.exerciseId] + 0.01) {
      records.push({ exercise: getExercise(e.exerciseId, custom), weight: best.set.weight, reps: best.set.reps });
    }
  }
  return records;
}

/**
 * Hard sets per muscle for the 7 days starting at `weekStartKey`.
 * A set counts in full for the primary muscle and as half for each secondary one.
 */
export function weeklyMuscleSets(sessions, weekStartKey, weekEndKey, custom = []) {
  const out = {};
  for (const s of doneSessions(sessions)) {
    const k = dayKey(new Date(s.startedAt));
    if (k < weekStartKey || k > weekEndKey) continue;
    for (const e of s.entries) {
      const ex = getExercise(e.exerciseId, custom);
      const n = e.sets.filter(isCountedSet).length;
      if (!n || ex.muscle === 'cardio') continue;
      out[ex.muscle] = (out[ex.muscle] || 0) + n;
      for (const m of ex.secondary) out[m] = (out[m] || 0) + n / 2;
    }
  }
  return out;
}

/** The plan day scheduled for a date, or null on a rest day. */
export function scheduledDay(plan, key) {
  if (!plan || !plan.schedule || !plan.schedule.weekdays) return null;
  const id = plan.schedule.weekdays[weekdayIndex(key)];
  return plan.days.find((d) => d.id === id) || null;
}

/** The day that follows the last one trained, for training off-schedule. */
export function nextInRotation(plan, sessions) {
  if (!plan || !plan.days.length) return null;
  const done = doneSessions(sessions).filter((s) => s.planId === plan.id);
  const last = done[done.length - 1];
  const i = last ? plan.days.findIndex((d) => d.id === last.dayId) : -1;
  return plan.days[(i + 1) % plan.days.length];
}

/** Rough session length in minutes from sets and rest. */
export function estimateMinutes(day) {
  let sec = 0;
  for (const it of day.items) {
    const ex = getExercise(it.exerciseId);
    if (ex.kind === 'cardio') sec += ((it.repMin + it.repMax) / 2) * 60;
    else sec += it.sets * (45 + it.restSec) + 60;
  }
  return Math.round(sec / 300) * 5;
}
