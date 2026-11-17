// Meal plan generation and the shopping list. Pure.
import { RECIPES, DIET_ALLOWS, getRecipe } from '../data/recipes.js';
import { getFood } from '../data/foods.js';
import { uid } from './model.js';
import { addDays, rng } from './util.js';

/** Share of the day's calories each meal gets, by number of snacks. */
const SHARES = {
  0: [['breakfast', 0.28], ['lunch', 0.36], ['dinner', 0.36]],
  1: [['breakfast', 0.25], ['lunch', 0.31], ['dinner', 0.31], ['snack', 0.13]],
  2: [['breakfast', 0.23], ['lunch', 0.28], ['dinner', 0.29], ['snack', 0.1], ['snack', 0.1]],
};

const STEP = 0.25;
const roundStep = (x) => Math.round(x / STEP) * STEP;
const clampMult = (x) => Math.min(2.5, Math.max(0.5, roundStep(x)));

export function recipesFor(diet = 'any') {
  const ok = DIET_ALLOWS[diet] || DIET_ALLOWS.any;
  return RECIPES.filter((r) => ok.includes(r.diet));
}

/** Macros of a planned meal: a recipe portion times its multiplier. */
export function slotMacros(slot) {
  const r = getRecipe(slot.recipeId);
  if (!r) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const m = slot.mult;
  return { kcal: Math.round(r.per.kcal * m), protein: Math.round(r.per.protein * m), carbs: Math.round(r.per.carbs * m), fat: Math.round(r.per.fat * m) };
}

export function dayMacros(slots = []) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const s of slots) {
    const m = slotMacros(s);
    for (const k of Object.keys(t)) t[k] += m[k];
  }
  return t;
}

function score(slots, targets) {
  const t = dayMacros(slots);
  const kcalErr = Math.abs(t.kcal - targets.kcal) / targets.kcal;
  const proteinShort = Math.max(0, targets.protein - t.protein) / targets.protein;
  const fatOver = Math.max(0, t.fat - targets.fat * 1.25) / targets.fat;
  const proteinOver = Math.max(0, t.protein - targets.protein * 1.2) / targets.protein;
  return kcalErr * 2 + proteinShort * 3 + fatOver + proteinOver * 0.5;
}

/**
 * Plan one day: try many random combinations of recipes, size each portion to its share
 * of the calories, and keep the combination closest to the targets.
 * @param {{kcal:number, protein:number, fat:number}} targets
 * @param {{diet?:string, snacks?:number, avoid?:Set<string>, seed?:number}} opts
 *   `avoid` lists recipes to steer away from (yesterday's meals).
 */
export function planDay(targets, { diet = 'any', snacks = 1, avoid = new Set(), seed = 1 } = {}) {
  const rand = rng(seed);
  const pool = recipesFor(diet);
  const shares = SHARES[Math.min(2, Math.max(0, snacks))];
  let best = null;
  for (let trial = 0; trial < 160; trial++) {
    const taken = new Set();
    const slots = [];
    for (const [meal, share] of shares) {
      let options = pool.filter((r) => r.meals.includes(meal) && !taken.has(r.id));
      const fresh = options.filter((r) => !avoid.has(r.id));
      if (fresh.length >= 2) options = fresh;
      if (!options.length) continue;
      const r = options[Math.floor(rand() * options.length)];
      taken.add(r.id);
      slots.push({ id: uid(), meal, recipeId: r.id, mult: clampMult((targets.kcal * share) / r.per.kcal), logged: false });
    }
    if (!slots.length) return [];
    // Nudge the largest meal to close the remaining calorie gap.
    const gap = targets.kcal - dayMacros(slots).kcal;
    const big = slots.reduce((a, s) => (slotMacros(s).kcal > slotMacros(a).kcal ? s : a));
    big.mult = clampMult(big.mult + gap / getRecipe(big.recipeId).per.kcal);
    const sc = score(slots, targets);
    if (!best || sc < best.sc) best = { sc, slots };
  }
  return best.slots;
}

/** Resize the meals not yet eaten so the day still lands on the calorie target. */
export function refitDay(slots, targets) {
  const open = slots.filter((s) => !s.logged);
  const openKcal = dayMacros(open).kcal;
  if (!open.length || !openKcal) return;
  const left = Math.max(300, targets.kcal - dayMacros(slots.filter((s) => s.logged)).kcal);
  for (const s of open) s.mult = clampMult((s.mult * left) / openKcal);
}

/** Plan `count` days from `startKey`, steering each day away from the previous day's recipes. */
export function planDays(targets, startKey, count, opts = {}) {
  const out = {};
  let avoid = new Set();
  const seed = opts.seed || Date.now() % 100000;
  for (let i = 0; i < count; i++) {
    const slots = planDay(targets, { ...opts, avoid, seed: seed + i * 7919 });
    out[addDays(startKey, i)] = { slots };
    avoid = new Set(slots.map((s) => s.recipeId));
  }
  return out;
}

/** Other recipes that could fill a slot, best calorie fit first, each with its fitted portion. */
export function swapOptions(slot, diet = 'any') {
  const want = slotMacros(slot).kcal;
  return recipesFor(diet)
    .filter((r) => r.meals.includes(slot.meal) && r.id !== slot.recipeId)
    .map((r) => {
      const mult = clampMult(want / r.per.kcal);
      return { recipe: r, mult, kcal: Math.round(r.per.kcal * mult), protein: Math.round(r.per.protein * mult) };
    })
    .sort((a, b) => b.protein - a.protein);
}

/**
 * Everything needed for a set of planned days, added up per food.
 * @returns {{category:string, items:{food:Object, grams:number}[]}[]}
 */
export function shoppingList(days) {
  const grams = new Map();
  for (const d of days) {
    for (const s of (d && d.slots) || []) {
      const r = getRecipe(s.recipeId);
      if (!r) continue;
      for (const [foodId, g] of r.ings) grams.set(foodId, (grams.get(foodId) || 0) + (g / r.serves) * s.mult);
    }
  }
  const groups = new Map();
  for (const [foodId, g] of grams) {
    const food = getFood(foodId);
    if (!food) continue;
    if (!groups.has(food.category)) groups.set(food.category, []);
    groups.get(food.category).push({ food, grams: Math.ceil(g / 5) * 5 });
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items: items.sort((a, b) => a.food.name.localeCompare(b.food.name)) }));
}

/** An amount as a shopper thinks of it: '1.2 kg', '450 g', '3 (150 g)' for countable things. */
export function fmtAmount(food, grams) {
  const unit = food.liquid ? 'ml' : 'g';
  const base = grams >= 1000 ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} ${food.liquid ? 'l' : 'kg'}` : `${Math.round(grams)} ${unit}`;
  const s = food.servings[0];
  if (s && s.grams && /^1 (medium|large|clove|wrap|bagel|slice|can|pepper|breast|fillet|steak|thigh|scoop|cake)/.test(s.label)) {
    const n = grams / s.grams;
    const count = n < 1 ? '' : `${Math.round(n * 2) / 2} × ${s.label.replace(/^1 /, '')}`;
    return count ? `${count} (${base})` : base;
  }
  return base;
}
