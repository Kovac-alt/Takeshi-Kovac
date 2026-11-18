// Builds a plan from the onboarding answers: a weekly split, then one exercise per movement slot,
// chosen from what the person's equipment allows.
import { newPlan, newPlanDay, newPlanItem } from './model.js';
import { LIBRARY } from './exercises.js';

const ALLOWED = { full_gym: null, home_barbell: ['barbell', 'bodyweight', 'other'], dumbbells: ['dumbbell', 'bodyweight', 'other'], bodyweight: ['bodyweight'] };
// When the kit has nothing for a slot, try these patterns instead.
const FALLBACK = {
  v_pull: ['h_pull'], h_pull: ['v_pull'], h_push: ['dip'], v_push: ['h_push'], incline_push: ['h_push'], chest_fly: ['h_push'], dip: ['h_push'],
  rear_delt: ['h_pull'], lateral_raise: ['v_push'], shrug: ['h_pull'], squat: ['lunge'], lunge: ['squat'], hinge: ['hip_thrust'], hip_thrust: ['hinge'],
  knee_flex: ['hinge', 'hip_thrust'], knee_ext: ['lunge', 'squat'], biceps: ['v_pull', 'h_pull'], triceps: ['dip', 'h_push'], forearm: ['carry'],
  core_flex: ['core_stab', 'core_rot'], core_stab: ['core_flex'], calf: [],
};
const SLOTS = {
  fullA: ['squat', 'h_push', 'h_pull', 'v_push', 'knee_flex', 'core_stab', 'biceps', 'triceps'],
  fullB: ['hinge', 'incline_push', 'v_pull', 'lunge', 'lateral_raise', 'core_flex', 'triceps', 'biceps'],
  fullC: ['squat', 'h_push', 'h_pull', 'hip_thrust', 'rear_delt', 'core_stab', 'calf', 'biceps'],
  upperA: ['h_push', 'h_pull', 'v_push', 'v_pull', 'biceps', 'triceps', 'lateral_raise', 'rear_delt'],
  upperB: ['incline_push', 'v_pull', 'h_push', 'h_pull', 'lateral_raise', 'triceps', 'biceps', 'rear_delt'],
  lowerA: ['squat', 'hinge', 'lunge', 'knee_flex', 'calf', 'core_flex', 'knee_ext', 'hip_thrust'],
  lowerB: ['hinge', 'squat', 'hip_thrust', 'knee_ext', 'knee_flex', 'calf', 'core_stab', 'lunge'],
  push: ['h_push', 'v_push', 'incline_push', 'lateral_raise', 'triceps', 'chest_fly', 'triceps', 'dip'],
  pull: ['v_pull', 'h_pull', 'h_pull', 'rear_delt', 'biceps', 'biceps', 'shrug', 'forearm'],
  legs: ['squat', 'hinge', 'lunge', 'knee_flex', 'knee_ext', 'calf', 'core_flex', 'hip_thrust'],
};
const NAMES = { fullA: 'Full body A', fullB: 'Full body B', fullC: 'Full body C', upperA: 'Upper A', upperB: 'Upper B', lowerA: 'Lower A', lowerB: 'Lower B', push: 'Push', pull: 'Pull', legs: 'Legs' };
const SPLITS = { 2: ['fullA', 'fullB'], 3: ['fullA', 'fullB', 'fullC'], 4: ['upperA', 'lowerA', 'upperB', 'lowerB'], 5: ['push', 'pull', 'legs', 'upperA', 'lowerB'], 6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] };
const WEEKDAYS = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
const COUNT = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };
export const GOALS = { muscle: 'Build muscle', strength: 'Get stronger', fat_loss: 'Lose fat', general: 'General fitness' };
export const KITS = { full_gym: 'A full gym', home_barbell: 'Barbell and rack at home', dumbbells: 'Dumbbells only', bodyweight: 'No equipment' };

function scheme(goal, ex, experience) {
  const c = ex.compound;
  let t = {
    strength: c ? [4, 3, 6, 180] : [3, 8, 12, 90], muscle: c ? [3, 6, 10, 150] : [3, 10, 15, 75],
    fat_loss: c ? [3, 8, 12, 90] : [3, 12, 15, 60], general: c ? [3, 8, 12, 120] : [2, 10, 15, 75],
  }[goal] || [3, 8, 12, 120];
  let [sets, repMin, repMax, restSec] = t;
  if (experience === 'beginner' && !c) sets = Math.max(2, sets - 1);
  if (experience === 'advanced' && c) sets += 1;
  if (ex.kind === 'timed') { repMin = 30; repMax = 60; restSec = 60; }
  else if (ex.kind === 'bodyweight' && !c) { repMin = 10; repMax = 20; }
  else if (ex.kind === 'bodyweight' && repMax < 10) { repMin = 5; repMax = 12; }
  return { sets, repMin, repMax, restSec };
}
function pick(pattern, allowed, used, offset, seen = new Set()) {
  if (seen.has(pattern)) return null;
  seen.add(pattern);
  const c = LIBRARY.filter((e) => e.pattern === pattern && e.kind !== 'cardio' && (!allowed || allowed.includes(e.equipment)) && !used.has(e.id));
  // Prefer the kit's main implement and multi-joint lifts; library order breaks ties.
  const rank = (e) => (allowed ? allowed.indexOf(e.equipment) : { barbell: 0, dumbbell: 1, machine: 1, cable: 1 }[e.equipment] ?? 2) * 2 + (e.compound ? 0 : 1);
  c.sort((x, y) => rank(x) - rank(y));
  if (c.length) return c[offset % c.length];
  for (const p of FALLBACK[pattern] || []) { const hit = pick(p, allowed, used, offset, seen); if (hit) return hit; }
  return null;
}

/** @param {import('./model.js').Profile} profile */
export function generatePlan(profile) {
  const n = Math.min(6, Math.max(2, profile.daysPerWeek || 3)), split = SPLITS[n], allowed = ALLOWED[profile.equipment] || null;
  const count = COUNT[profile.sessionMinutes] || 6, seenType = {};
  const days = split.map((type) => {
    const occ = seenType[type] = (seenType[type] || 0) + 1, used = new Set(), items = [];
    for (const pattern of SLOTS[type]) {
      if (items.length >= count) break;
      const ex = pick(pattern, allowed, used, occ - 1);
      if (!ex) continue;
      used.add(ex.id); items.push(newPlanItem(ex.id, scheme(profile.goal, ex, profile.experience)));
    }
    if (profile.goal === 'fat_loss') items.push(newPlanItem(allowed ? 'outdoor-run' : 'stationary-bike', { sets: 1, repMin: 15, repMax: 20, restSec: 0 }));
    const twice = split.filter((t) => t === type).length > 1;
    return newPlanDay(twice ? `${NAMES[type]} ${occ}` : NAMES[type], items);
  });
  const weekdays = [null, null, null, null, null, null, null];
  WEEKDAYS[n].forEach((wd, i) => { weekdays[wd] = days[i].id; });
  return newPlan({ name: `${GOALS[profile.goal] || 'My plan'}, ${n} days`, description: `Made for you: ${KITS[profile.equipment] || ''}, about ${profile.sessionMinutes} minutes a session.`, source: 'generated', days, schedule: { mode: 'weekdays', weekdays } });
}
