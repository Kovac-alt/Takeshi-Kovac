// Progress: bodyweight, calories, weekly training volume and lift strength over time.
import { useState } from 'preact/hooks';
import { MUSCLES } from '../core/model.js';
import { activeTargets, totals } from '../core/nutrition.js';
import { doneSessions, exerciseHistory, weeklyMuscleSets } from '../core/training.js';
import { state } from '../core/store.js';
import { customExercises, exById } from '../core/lookup.js';
import { WEEKDAYS, addDays, conv, dayKey, fmtNum, fmtShort, keyDate, weekStart, weekdayIndex } from '../core/util.js';
import { BarChart, LineChart, RowBars } from '../ui/charts.jsx';
import { Empty, Icon, Num, Seg, toast } from '../ui/kit.jsx';
import { logWeight } from './goals.jsx';

export function WeightLogger({ compact = false }) {
  const units = state.settings.units;
  const today = dayKey();
  const todays = state.body.find((b) => b.date === today);
  const [w, setW] = useState(todays ? +fmtNum(conv(todays.kg, 'kg', units)) : null);
  return (
    <form class={`weight-log ${compact ? 'compact' : ''}`} onSubmit={(e) => { e.preventDefault(); if (!w) return; logWeight(conv(w, units, 'kg')); toast(`Logged ${fmtNum(w)} ${units} for today.`); }}>
      <Num id={compact ? 'weight-today-c' : 'weight-today'} label="Today's weight" value={w} unit={units} placeholder="Weight" onChange={setW} />
      <button class="btn" type="submit" disabled={!w}>{todays ? 'Update' : 'Log weight'}</button>
    </form>
  );
}

/** Average change in kg per week across the last `days` days of weigh-ins, or null with too little data. */
function trendPerWeek(body, days = 21) {
  const from = addDays(dayKey(), -days);
  const pts = body.filter((b) => b.date >= from);
  if (pts.length < 3) return null;
  const t0 = keyDate(pts[0].date).getTime();
  const xs = pts.map((p) => (keyDate(p.date).getTime() - t0) / 864e5);
  const span = xs[xs.length - 1];
  if (span < 6) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, b) => a + b.kg, 0) / pts.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (pts[i].kg - my); den += (x - mx) ** 2; });
  return den ? (num / den) * 7 : null;
}

function WeightCard() {
  const [span, setSpan] = useState('90');
  const units = state.settings.units;
  const body = state.body;
  const from = span === 'all' ? '' : addDays(dayKey(), -span);
  const pts = body.filter((b) => b.date >= from).map((b) => ({ label: fmtShort(b.date), value: +fmtNum(conv(b.kg, 'kg', units)) }));
  const latest = body[body.length - 1];
  const first = body.find((b) => b.date >= from) || body[0];
  const trend = trendPerWeek(body);
  const t = activeTargets(state.settings);
  const want = t.weeklyChangeKg;
  let verdict = null;
  if (trend != null && want != null) {
    const diff = trend - want;
    const tw = `${trend >= 0 ? '+' : '−'}${fmtNum(Math.abs(conv(trend, 'kg', units)), 2)} ${units} a week`;
    if (Math.abs(diff) < 0.12) verdict = `On track: ${tw} over the last three weeks.`;
    else if (diff > 0) verdict = `Trending ${tw}, above the plan. If that holds another week, take about ${Math.round((diff * 7700) / 7 / 50) * 50} kcal off the daily target.`;
    else verdict = `Trending ${tw}, below the plan. If that holds another week, add about ${Math.round((-diff * 7700) / 7 / 50) * 50} kcal to the daily target.`;
  }
  return (
    <section class="card">
      <header class="card-head">
        <h2>Bodyweight</h2>
        <Seg id="weight-span" label="Period" value={span} onChange={setSpan} options={[{ id: '30', name: '30 d' }, { id: '90', name: '90 d' }, { id: 'all', name: 'All' }]} />
      </header>
      {latest ? (
        <>
          <p class="big-num"><b>{fmtNum(conv(latest.kg, 'kg', units))}</b> {units}
            {first && first !== latest && <span class="delta">{latest.kg - first.kg >= 0 ? '+' : '−'}{fmtNum(Math.abs(conv(latest.kg - first.kg, 'kg', units)))} {units} since {fmtShort(first.date)}</span>}
          </p>
          {pts.length >= 2 ? <LineChart points={pts} unit={units} label={`Bodyweight in ${units} over time`} /> : <p class="muted">Log your weight on a few more mornings and the trend line appears here.</p>}
          {verdict && <p class="verdict">{verdict}</p>}
        </>
      ) : <Empty title="No weigh-ins yet">Weigh yourself in the morning, a few times a week, and log it here.</Empty>}
      <WeightLogger />
    </section>
  );
}

function CaloriesCard() {
  const today = dayKey();
  const t = activeTargets(state.settings);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const bars = days.map((k) => ({ label: WEEKDAYS[weekdayIndex(k)][0], long: fmtShort(k), value: totals((state.food[k] || {}).items).kcal || null }));
  const logged = days.map((k) => totals((state.food[k] || {}).items)).filter((x) => x.kcal > 0);
  const avg = (k) => Math.round(logged.reduce((a, x) => a + x[k], 0) / logged.length);
  return (
    <section class="card">
      <header class="card-head"><h2>Calories, last 14 days</h2></header>
      {logged.length ? (
        <>
          <p class="big-num"><b>{avg('kcal')}</b> kcal a day<span class="delta">{avg('protein')} g protein · {logged.length} day{logged.length === 1 ? '' : 's'} logged</span></p>
          <BarChart bars={bars} unit="kcal" goal={t.kcal} label="Calories eaten per day against the target" />
        </>
      ) : <Empty title="No food logged yet">Log what you eat and your daily calories line up here against your target.</Empty>}
    </section>
  );
}

function VolumeCard() {
  const [offset, setOffset] = useState(0);
  const start = addDays(weekStart(dayKey()), offset * 7);
  const sets = weeklyMuscleSets(state.sessions, start, addDays(start, 6), customExercises());
  const rows = MUSCLES.filter((m) => m.id !== 'forearms').map((m) => ({ label: m.name, value: Math.round((sets[m.id] || 0) * 2) / 2 }));
  const any = rows.some((r) => r.value > 0);
  return (
    <section class="card">
      <header class="card-head">
        <h2>Sets per muscle</h2>
        <div class="row">
          <button class="icon-btn sm" onClick={() => setOffset(offset - 1)} aria-label="Previous week"><Icon name="left" size={18} /></button>
          <span class="muted nowrap">{offset === 0 ? 'This week' : `Week of ${fmtShort(start)}`}</span>
          <button class="icon-btn sm" onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="Next week"><Icon name="right" size={18} /></button>
        </div>
      </header>
      {any ? (
        <>
          <RowBars rows={rows} zone={[10, 20]} unit="sets" />
          <p class="muted small">The shaded band is 10 to 20 hard sets a week, the range most muscle growth happens in. A set counts in full for its main muscle and as half for the muscles that assist.</p>
        </>
      ) : <Empty title="No training logged this week">Finished workouts are counted here, muscle by muscle.</Empty>}
    </section>
  );
}

function LiftCard() {
  const units = state.settings.units;
  const done = doneSessions(state.sessions);
  const counts = {};
  for (const s of done) for (const e of s.entries) counts[e.exerciseId] = (counts[e.exerciseId] || 0) + 1;
  const ids = Object.keys(counts).filter((id) => exById(id).kind !== 'cardio' && exById(id).kind !== 'timed').sort((a, b) => counts[b] - counts[a]);
  const [sel, setSel] = useState(null);
  const id = sel && ids.includes(sel) ? sel : ids[0];
  if (!id) return <section class="card"><header class="card-head"><h2>Lift progress</h2></header><Empty title="No lifts logged yet">After your first workout, pick any lift here to see its strength trend.</Empty></section>;
  const ex = exById(id);
  const weighted = ex.kind === 'weight';
  const hist = exerciseHistory(state.sessions, id, units);
  const pts = hist.map((h) => ({ label: fmtShort(h.date), value: Math.round(h.value * 10) / 10, note: weighted ? `${fmtNum(h.weight)} × ${h.reps}` : '' }));
  const best = hist.reduce((a, h) => (h.value > a.value ? h : a), hist[0]);
  const records = ids.slice(0, 30).map((x) => {
    const h = exerciseHistory(state.sessions, x, units);
    const b = h.reduce((a, c) => (c.value > a.value ? c : a), h[0]);
    return b && { ex: exById(x), b };
  }).filter((r) => r && r.ex.kind === 'weight' && r.b.weight).slice(0, 8);
  return (
    <section class="card">
      <header class="card-head"><h2>Lift progress</h2></header>
      <select id="lift-select" aria-label="Lift" value={id} onChange={(e) => setSel(e.target.value)}>{ids.map((x) => <option value={x}>{exById(x).name}</option>)}</select>
      <p class="big-num"><b>{fmtNum(best.value)}</b> {weighted ? `${units} estimated 1-rep max` : 'reps best set'}
        {weighted && <span class="delta">best set {fmtNum(best.weight)} {units} × {best.reps}</span>}
      </p>
      {pts.length >= 2 ? <LineChart points={pts} unit={weighted ? units : 'reps'} label={`${ex.name}: best set per workout`} /> : <p class="muted">One workout logged. The trend shows after the next one.</p>}
      {records.length > 1 && (
        <>
          <h3 class="list-title">Best sets</h3>
          <ul class="plain records-list">{records.map((r) => <li key={r.ex.id}><span>{r.ex.name}</span><b>{fmtNum(r.b.weight)} {units} × {r.b.reps}</b></li>)}</ul>
        </>
      )}
    </section>
  );
}

export function ProgressView() {
  const done = doneSessions(state.sessions);
  const month = dayKey().slice(0, 7);
  const thisMonth = done.filter((s) => dayKey(new Date(s.startedAt)).startsWith(month)).length;
  const trained = (wk) => done.some((s) => { const k = dayKey(new Date(s.startedAt)); return k >= wk && k <= addDays(wk, 6); });
  let wk = weekStart(dayKey());
  // A week still in progress with nothing logged yet does not break the streak.
  if (!trained(wk)) wk = addDays(wk, -7);
  let streak = 0;
  while (streak < 520 && trained(wk)) { streak += 1; wk = addDays(wk, -7); }
  return (
    <>
      <header class="page-head"><div><p class="eyebrow">Progress</p><h1>Are you on track?</h1></div></header>
      <div class="stat-row card">
        <div><b>{done.length}</b><span>workouts</span></div>
        <div><b>{thisMonth}</b><span>this month</span></div>
        <div><b>{streak}</b><span>week streak</span></div>
      </div>
      <WeightCard />
      <CaloriesCard />
      <VolumeCard />
      <LiftCard />
    </>
  );
}
