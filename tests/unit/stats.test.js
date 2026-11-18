import test from 'node:test';
import assert from 'node:assert/strict';
import { e1rm, convert, sessionVolume, exerciseHistory, startOfWeek, estimateTargets, fmtDur } from '../../src/core/stats.js';

const set = (weight, reps, extra = {}) => ({ type: 'work', weight, reps, done: true, ...extra });
const session = (id, startedAt, unit, sets) => ({ id, status: 'done', unit, startedAt, entries: [{ exerciseId: 'bench', sets }] });

test('e1rm', () => { assert.equal(e1rm(100, 1), 100); assert.equal(e1rm(60, 10), 80); assert.equal(e1rm(0, 5), 0); });
test('convert round-trips', () => { assert.ok(Math.abs(convert(convert(100, 'kg', 'lb'), 'lb', 'kg') - 100) < 1e-9); });
test('volume skips warm-ups and unticked sets', () => {
  const s = session('a', 1, 'kg', [set(60, 10), set(20, 10, { type: 'warmup' }), set(60, 8, { done: false })]);
  assert.equal(sessionVolume(s, 'kg'), 600);
});
test('history is oldest first with the best set', () => {
  const h = exerciseHistory({ a: session('a', 2, 'kg', [set(60, 10), set(70, 5)]), b: session('b', 1, 'kg', [set(50, 10)]) }, 'bench', 'weight', 'kg');
  assert.deepEqual(h.map((p) => p.sessionId), ['b', 'a']);
  assert.equal(h[1].set.weight, 70 * (1 + 5 / 30) > 80 ? 70 : 60);
});
test('week starts on Monday', () => { assert.equal(new Date(startOfWeek(new Date(2026, 10, 18).getTime(), 1)).getDate(), 16); });
test('targets', () => { const t = estimateTargets({ sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'maintain' }); assert.equal(t.kcal, 2760); assert.equal(t.protein, 144); });
test('durations', () => { assert.equal(fmtDur(52 * 60000), '52 min'); assert.equal(fmtDur(65 * 60000), '1 h 05'); });

import { platesPerSide } from '../../src/core/stats.js';
import { generatePlan } from '../../src/core/generator.js';
import { getExercise } from '../../src/core/exercises.js';
import { searchFoods, scaleFood } from '../../src/core/foods.js';

test('plates', () => {
  assert.deepEqual(platesPerSide(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]), { plates: [25, 15], short: 0 });
  assert.equal(platesPerSide(61, 20, [20, 10, 5, 2.5]).short, 1);
  assert.equal(platesPerSide(15, 20, [20]), null);
});
test('generated plans fit the profile', () => {
  for (const equipment of ['full_gym', 'home_barbell', 'dumbbells', 'bodyweight']) for (const daysPerWeek of [2, 3, 4, 5, 6]) {
    const plan = generatePlan({ goal: 'muscle', experience: 'beginner', daysPerWeek, equipment, sessionMinutes: 60 });
    assert.equal(plan.days.length, daysPerWeek);
    assert.equal(plan.schedule.weekdays.filter(Boolean).length, daysPerWeek);
    for (const d of plan.days) {
      assert.ok(d.items.length >= 3, `${equipment} ${daysPerWeek}: ${d.name} has ${d.items.length}`);
      assert.equal(new Set(d.items.map((i) => i.exerciseId)).size, d.items.length);
      for (const it of d.items) { const ex = getExercise(it.exerciseId); assert.notEqual(ex.name, 'Removed exercise');
        if (equipment === 'bodyweight') assert.equal(ex.equipment, 'bodyweight'); if (equipment === 'dumbbells') assert.ok(['dumbbell', 'bodyweight', 'other'].includes(ex.equipment)); }
    }
  }
});
test('foods', () => { assert.equal(searchFoods('chick breast')[0].name, 'Chicken breast, cooked'); assert.equal(scaleFood(searchFoods('banana')[0], 118).kcal, 105); });
