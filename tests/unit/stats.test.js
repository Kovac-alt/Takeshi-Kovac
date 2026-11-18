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
