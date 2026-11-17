import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE } from '../../src/core/model.js';
import { targetsFor, bmr } from '../../src/core/nutrition.js';
import { generatePlan, suggest, e1rm } from '../../src/core/training.js';
import { planDays, dayMacros, shoppingList } from '../../src/core/mealplan.js';
import { getExercise } from '../../src/data/exercises.js';
import { RECIPES } from '../../src/data/recipes.js';
import { addDays, weekStart, dayKey } from '../../src/core/util.js';

test('BMR matches Mifflin-St Jeor', () => {
  assert.equal(bmr({ sex: 'male', age: 30, heightCm: 180, weightKg: 80 }), 1780);
  assert.equal(bmr({ sex: 'female', age: 30, heightCm: 165, weightKg: 60 }), 1320.25);
});

test('targets follow the goal', () => {
  const bulk = targetsFor({ ...DEFAULT_PROFILE, goal: 'bulk' });
  const cut = targetsFor({ ...DEFAULT_PROFILE, goal: 'cut' });
  assert.ok(bulk.kcal > bulk.maintenance && cut.kcal < cut.maintenance);
  assert.ok(cut.protein > bulk.protein);
  for (const t of [bulk, cut]) assert.ok(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal) < 15);
});

test('every split and setup yields a usable plan', () => {
  for (const equipment of ['full_gym', 'home_barbell', 'dumbbells', 'bodyweight']) {
    for (let d = 2; d <= 6; d++) {
      const plan = generatePlan({ ...DEFAULT_PROFILE, daysPerWeek: d, equipment });
      assert.equal(plan.days.length, d);
      assert.equal(plan.schedule.weekdays.filter(Boolean).length, d);
      for (const day of plan.days) {
        assert.ok(day.items.length >= 4, `${equipment} ${d} ${day.name} has ${day.items.length}`);
        assert.equal(new Set(day.items.map((i) => i.exerciseId)).size, day.items.length);
        for (const it of day.items) assert.notEqual(getExercise(it.exerciseId).name, 'Unknown exercise');
      }
    }
  }
});

test('priority adds sets', () => {
  const count = (p) => p.days.flatMap((d) => d.items).filter((i) => getExercise(i.exerciseId).muscle === 'chest').reduce((a, i) => a + i.sets, 0);
  assert.ok(count(generatePlan({ ...DEFAULT_PROFILE, priority: 'chest' })) > count(generatePlan(DEFAULT_PROFILE)));
});

test('double progression', () => {
  const ex = getExercise('barbell-bench-press');
  const mk = (reps) => ({ session: { unit: 'kg' }, entry: { sets: reps.map((r) => ({ type: 'work', done: true, weight: 80, reps: r })) } });
  const t = { repMin: 5, repMax: 8 };
  assert.equal(suggest(ex, t, mk([8, 8, 8]), 'kg', 2.5).weight, 82.5);
  const s = suggest(ex, t, mk([8, 7, 6]), 'kg', 2.5);
  assert.equal(s.weight, 80);
  assert.equal(s.reps, 7);
  assert.equal(Math.round(e1rm(100, 5)), 117);
});

test('meal plans land near the targets for every diet', () => {
  for (const diet of ['any', 'pescatarian', 'vegetarian', 'vegan']) {
    for (const kcal of [1800, 2600, 3300]) {
      const targets = { kcal, protein: Math.round(kcal * 0.065), fat: Math.round((kcal * 0.25) / 9) };
      const days = planDays(targets, '2026-11-16', 7, { diet, snacks: 1, seed: 42 });
      for (const [k, d] of Object.entries(days)) {
        const m = dayMacros(d.slots);
        assert.ok(Math.abs(m.kcal - kcal) / kcal < 0.06, `${diet} ${kcal} ${k}: ${m.kcal}`);
        if (diet !== 'vegan') assert.ok(m.protein >= targets.protein * 0.88, `${diet} ${kcal} ${k}: protein ${m.protein}/${targets.protein}`);
      }
      assert.ok(shoppingList(Object.values(days)).length > 3);
    }
  }
});

test('recipes are sane', () => {
  for (const r of RECIPES) {
    assert.ok(r.per.kcal > 150 && r.per.kcal < 900, r.id);
    assert.ok(Math.abs(r.per.protein * 4 + r.per.carbs * 4 + r.per.fat * 9 - r.per.kcal) / r.per.kcal < 0.12, r.id);
  }
});

test('dates', () => {
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(weekStart('2026-11-17'), '2026-11-16');
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
});
