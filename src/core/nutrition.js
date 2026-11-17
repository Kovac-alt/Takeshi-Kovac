// Calorie and macro targets from a profile, and totals for the food log. Pure.
import { ACTIVITY } from './model.js';
import { sum } from './util.js';

/** Resting energy use, Mifflin-St Jeor. */
export function bmr({ sex, age, heightCm, weightKg }) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5);
}

/**
 * Daily energy use: resting burn scaled by everyday activity, plus the lifting itself
 * (roughly 5 kcal per kg of bodyweight per session, spread over the week).
 */
export function tdee(profile) {
  const act = ACTIVITY.find((a) => a.id === profile.activity) || ACTIVITY[1];
  const training = (profile.daysPerWeek * 5 * profile.weightKg) / 7;
  return bmr(profile) * act.factor + training;
}

/** Calorie adjustment as a fraction of maintenance, by goal and pace. */
const ADJUST = {
  bulk: { slow: 0.05, moderate: 0.1, fast: 0.15 },
  cut: { slow: -0.1, moderate: -0.2, fast: -0.25 },
  recomp: { slow: -0.05, moderate: -0.05, fast: -0.05 },
  maintain: { slow: 0, moderate: 0, fast: 0 },
};
/** Protein in g per kg of bodyweight. Higher in a deficit, where it protects muscle. */
const PROTEIN_PER_KG = { bulk: 1.8, cut: 2.2, recomp: 2.2, maintain: 1.8 };

/**
 * Daily targets for a profile.
 * @returns {{kcal:number, protein:number, carbs:number, fat:number, maintenance:number, weeklyChangeKg:number}}
 */
export function targetsFor(profile) {
  const maintenance = tdee(profile);
  const adj = (ADJUST[profile.goal] || ADJUST.maintain)[profile.pace] ?? 0;
  const floor = profile.sex === 'female' ? 1300 : 1600;
  const kcal = Math.max(floor, Math.round((maintenance * (1 + adj)) / 10) * 10);
  const protein = Math.round((PROTEIN_PER_KG[profile.goal] || 1.8) * profile.weightKg);
  // Fat: about a quarter of calories, never under 0.6 g per kg.
  const fat = Math.max(Math.round(0.6 * profile.weightKg), Math.round((kcal * 0.25) / 9));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  // 7700 kcal is about one kilogram of body fat.
  const weeklyChangeKg = ((kcal - maintenance) * 7) / 7700;
  return { kcal, protein, carbs, fat, maintenance: Math.round(maintenance), weeklyChangeKg };
}

/** The targets in force: the user's own when they set them, else worked out from the profile. */
export function activeTargets(settings) {
  const n = settings.nutrition || {};
  if (n.custom && n.kcal) return { kcal: n.kcal, protein: n.protein || 0, carbs: n.carbs || 0, fat: n.fat || 0, custom: true };
  if (settings.profile) return { ...targetsFor(settings.profile), custom: false };
  return { kcal: 2400, protein: 150, carbs: 280, fat: 70, custom: false };
}

/** Totals for a list of food items. */
export function totals(items = []) {
  return {
    kcal: Math.round(sum(items, (i) => i.kcal)),
    protein: Math.round(sum(items, (i) => i.protein)),
    carbs: Math.round(sum(items, (i) => i.carbs)),
    fat: Math.round(sum(items, (i) => i.fat)),
  };
}

/** One sentence on what the calorie target is meant to do. */
export function describeTarget(profile, t) {
  const w = Math.abs(t.weeklyChangeKg);
  const rate = w < 0.05 ? '' : `about ${w.toFixed(w < 0.1 ? 2 : 1)} kg a week`;
  if (profile.goal === 'bulk') return `${t.kcal - t.maintenance} kcal over maintenance, aiming to gain ${rate}.`;
  if (profile.goal === 'cut') return `${t.maintenance - t.kcal} kcal under maintenance, aiming to lose ${rate}.`;
  if (profile.goal === 'recomp') return 'Just under maintenance with high protein, so the scale holds while your shape changes.';
  return 'At maintenance, to hold your weight.';
}
