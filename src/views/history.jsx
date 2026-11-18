import { useState } from 'preact/hooks';
import { state, setUI, settings, remove } from '../core/store.js';
import { isCountedSet, MUSCLES, newEntry } from '../core/model.js';
import { startSession, activeSession, toast } from '../core/actions.js';
import { put } from '../core/store.js';
import { getExercise } from '../core/exercises.js';
import { doneSessions, sessionVolume, countedSets, exerciseHistory, muscleSets, startOfWeek, setText, SCORE_LABEL, scoreUnit, fmt, fmtDate, fmtDur } from '../core/stats.js';
import { ConfirmButton, ScreenHead, LineChart, Meter } from '../ui.jsx';

export function History() {
  const [mode, setMode] = useState('sessions');
  const s = settings(), done = doneSessions(state.sessions);
  return (
    <>
      <div class="seg" role="tablist"><button role="tab" aria-selected={mode === 'sessions'} aria-pressed={mode === 'sessions'} onClick={() => setMode('sessions')}>Workouts</button><button role="tab" aria-selected={mode === 'progress'} aria-pressed={mode === 'progress'} onClick={() => setMode('progress')}>Progress</button></div>
      {mode === 'sessions' ? (
        <section class="card">
          <div class="card-head"><h2>Past workouts</h2><span class="muted small">{done.length} in total</span></div>
          <div class="list">
            {done.map((x) => (
              <button class="row" onClick={() => setUI({ screen: { name: 'session', id: x.id } })}>
                <span class="when num">{fmtDate(x.startedAt, { day: 'numeric', month: 'short' })}</span>
                <span class="row-main"><b>{x.name}</b><small>{countedSets(x)} {countedSets(x) === 1 ? 'set' : 'sets'} · {fmtDur((x.finishedAt || x.startedAt) - x.startedAt)}</small></span>
                <span class="num">{fmt(sessionVolume(x, s.units), 0)} {s.units}</span>
              </button>
            ))}
            {!done.length && <p class="empty">Finished workouts show up here. Start one from Today.</p>}
          </div>
        </section>
      ) : <Progress />}
    </>
  );
}

function Progress() {
  const s = settings(), done = doneSessions(state.sessions);
  const counts = {};
  for (const x of done) for (const e of x.entries) if (e.sets.some(isCountedSet)) counts[e.exerciseId] = (counts[e.exerciseId] || 0) + 1;
  const ids = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const [pick, setPick] = useState(null);
  const exId = pick && counts[pick] ? pick : ids[0];
  const week = muscleSets(state.sessions, getExercise, startOfWeek(Date.now(), s.weekStart));
  const wmax = Math.max(1, ...Object.values(week));
  if (!ids.length) return <section class="card"><h2>Progress</h2><p class="empty">Charts and records appear after your first finished workout.</p></section>;
  const ex = getExercise(exId), hist = exerciseHistory(state.sessions, exId, ex.kind, s.units), unit = scoreUnit(ex.kind, s.units);
  const best = hist.reduce((a, p) => (p.v > a.v ? p : a), hist[0]);
  const heaviest = ex.kind === 'weight' ? hist.reduce((a, p) => ((p.set.weight || 0) > (a.set.weight || 0) ? p : a), hist[0]) : null;
  return (
    <>
      <section class="card">
        <div class="card-head"><div><h2>{SCORE_LABEL[ex.kind]}</h2><p class="muted small">Best set of each workout, in {unit}</p></div></div>
        <select id="progress-ex" aria-label="Exercise" value={exId} onChange={(e) => setPick(e.target.value)}>{ids.map((id) => <option value={id}>{getExercise(id).name} ({counts[id]})</option>)}</select>
        <LineChart points={hist} unit={unit} />
        <div class="list tight">
          <div class="row"><span class="row-main"><b>Best set</b><small>{fmtDate(best.t)}</small></span><span class="num">{setText(best.set, ex.kind, best.unit)}</span></div>
          {heaviest && <div class="row"><span class="row-main"><b>Heaviest weight</b><small>{fmtDate(heaviest.t)}</small></span><span class="num">{setText(heaviest.set, ex.kind, heaviest.unit)}</span></div>}
          <div class="row"><span class="row-main"><b>Workouts logged</b></span><span class="num">{hist.length}</span></div>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Sets per muscle this week</h2><p class="muted small">Counted by each exercise’s main muscle</p></div></div>
        {Object.keys(week).length ? [...MUSCLES, { id: 'cardio', name: 'Cardio' }].filter((m) => week[m.id]).sort((a, b) => week[b.id] - week[a.id]).map((m) => (
          <div class="bar-row"><span>{m.name}</span><Meter value={week[m.id]} max={wmax} tone="blue" /><span class="num">{week[m.id]}</span></div>
        )) : <p class="empty">Nothing logged yet this week.</p>}
      </section>
    </>
  );
}

export function SessionDetail({ id }) {
  const x = state.sessions[id], s = settings();
  if (!x) return <><ScreenHead title="Workout" /><p class="empty">This workout no longer exists.</p></>;
  const repeat = () => {
    if (activeSession()) { toast('Finish the workout in progress first.'); return; }
    startSession({ name: x.name });
    const act = activeSession();
    act.planId = x.planId; act.dayId = x.dayId;
    act.entries = x.entries.map((e) => newEntry(e.exerciseId, e.target || { sets: e.sets.length, repMin: 8, repMax: 12, restSec: s.restSec }, e.planItemId));
    put('sessions', act);
  };
  return (
    <>
      <ScreenHead title={x.name} />
      <section class="card">
        <p class="muted small">{fmtDate(x.startedAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{x.rating ? ` · felt ${['rough', 'hard', 'okay', 'good', 'great'][x.rating - 1]}` : ''}</p>
        <div class="stats">
          <div><b class="num">{fmtDur((x.finishedAt || x.startedAt) - x.startedAt)}</b><span>duration</span></div>
          <div><b class="num">{countedSets(x)}</b><span>sets</span></div>
          <div><b class="num">{fmt(sessionVolume(x, s.units), 0)}</b><span>{s.units} lifted</span></div>
        </div>
        {x.note && <p class="quote">{x.note}</p>}
      </section>
      {x.entries.map((e) => { const ex = getExercise(e.exerciseId); return (
        <section class="card" key={e.id}>
          <h2>{ex.name}</h2>
          <ol class="setlist">{e.sets.map((set) => <li class="num">{setText(set, ex.kind, x.unit)}{set.type === 'warmup' ? ' (warm-up)' : ''}</li>)}</ol>
          {e.note && <p class="quote">{e.note}</p>}
        </section>
      ); })}
      <button class="btn block" onClick={repeat}>Do this workout again</button>
      <div class="actions end"><ConfirmButton label="Delete workout" confirm="Tap again to delete" onConfirm={() => { remove('sessions', x.id); setUI({ screen: null }); toast('Workout deleted.'); }} /></div>
    </>
  );
}
