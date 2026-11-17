// The live workout: log sets, follow the progression hint, rest on a timer.
import { useEffect, useState } from 'preact/hooks';
import { isCountedSet, newEntry, newSession, newSet } from '../core/model.js';
import { alternatives, lastEntry, sessionRecords, sessionStats, suggest } from '../core/training.js';
import { activeSession, deleteSession, saveSession, state, useStore } from '../core/store.js';
import { customExercises, exById } from '../core/lookup.js';
import { fmtClock, fmtDuration, fmtNum } from '../core/util.js';
import { Icon, Num, Sheet, closeAllSheets, closeSheet, confirmAction, openSheet, toast } from '../ui/kit.jsx';
import { setNav } from '../ui/nav.js';
import { ExercisePicker } from './train.jsx';

// ---- rest timer ----

const rest = { endsAt: 0, total: 0, fired: true };
const restSubs = new Set();
const restEmit = () => restSubs.forEach((f) => f({}));
let audio = null;

export function startRest(sec) {
  if (!sec) return;
  rest.endsAt = Date.now() + sec * 1000;
  rest.total = sec;
  rest.fired = false;
  // Create the audio context on this tap so the end-of-rest beep is allowed to play.
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { audio = null; }
  restEmit();
}
function stopRest() {
  rest.endsAt = 0;
  rest.fired = true;
  restEmit();
}
function restDone() {
  rest.fired = true;
  const s = state.settings;
  if (s.sound && audio) {
    try {
      for (const [i, f] of [660, 880].entries()) {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.frequency.value = f;
        o.connect(g); g.connect(audio.destination);
        const t = audio.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.start(t); o.stop(t + 0.17);
      }
    } catch { /* sound is a nicety */ }
  }
  if (s.vibrate && navigator.vibrate) { try { navigator.vibrate([180, 80, 180]); } catch { /* not supported */ } }
}

export function RestBar() {
  const [, tick] = useState({});
  useEffect(() => {
    restSubs.add(tick);
    const id = setInterval(() => {
      if (rest.endsAt && !rest.fired && Date.now() >= rest.endsAt) restDone();
      if (rest.endsAt) tick({});
    }, 250);
    return () => { restSubs.delete(tick); clearInterval(id); };
  }, []);
  if (!rest.endsAt) return null;
  const left = (rest.endsAt - Date.now()) / 1000;
  if (left < -20) { rest.endsAt = 0; return null; }
  const over = left <= 0;
  return (
    <div class={`restbar ${over ? 'over' : ''}`} role="timer" aria-label="Rest timer">
      <i style={{ width: `${over ? 100 : Math.max(0, 100 - (left / rest.total) * 100)}%` }} />
      <div class="restbar-in">
        <span class="restbar-label">{over ? 'Rest over. Next set.' : 'Rest'}</span>
        <b>{over ? '0:00' : fmtClock(left)}</b>
        {!over && <button class="btn btn-sm" onClick={() => { rest.endsAt += 15000; rest.total += 15; restEmit(); }}>+15 s</button>}
        <button class="btn btn-sm" onClick={stopRest}>{over ? 'Dismiss' : 'Skip'}</button>
      </div>
    </div>
  );
}

// ---- starting and finishing ----

function increment(ex) {
  const u = state.settings.units;
  return (state.settings.increments[u] || {})[ex.equipment] || (u === 'kg' ? 2.5 : 5);
}

function hintFor(entry) {
  const ex = exById(entry.exerciseId);
  return suggest(ex, entry.target, lastEntry(state.sessions, entry.exerciseId), state.settings.units, increment(ex));
}

function prefill(entry) {
  const h = hintFor(entry);
  if (h && h.weight != null) for (const s of entry.sets) s.weight = h.weight;
}

/** Start a workout from a plan day, or an empty one. Resumes the open workout if there is one. */
export function startWorkout(plan = null, day = null) {
  let s = activeSession();
  if (!s) {
    s = newSession({ plan, day, unit: state.settings.units });
    s.entries.forEach(prefill);
    saveSession(s);
  }
  setNav({ workoutOpen: true });
  window.scrollTo(0, 0);
}

function finish(session) {
  for (const e of session.entries) e.sets = e.sets.filter((s) => s.done);
  session.entries = session.entries.filter((e) => e.sets.length);
  session.status = 'done';
  session.finishedAt = Date.now();
  saveSession(session);
  stopRest();
  setNav({ workoutOpen: false, tab: 'today' });
  const stats = sessionStats(session);
  const records = sessionRecords(session, state.sessions, customExercises());
  openSheet(() => (
    <Sheet title="Workout done">
      <div class="stat-row">
        <div><b>{fmtDuration(session.finishedAt - session.startedAt)}</b><span>time</span></div>
        <div><b>{stats.sets}</b><span>sets</span></div>
        <div><b>{stats.volume.toLocaleString()}</b><span>{session.unit} lifted</span></div>
      </div>
      {records.length > 0 && (
        <div class="records">
          <h3><Icon name="trophy" size={18} /> Personal records</h3>
          <ul class="plain">
            {records.map((r) => <li><span>{r.exercise.name}</span><b>{fmtNum(r.weight)} {session.unit} × {r.reps}</b></li>)}
          </ul>
        </div>
      )}
      <button class="btn btn-primary btn-lg mt-4 block" onClick={closeSheet}>Done</button>
    </Sheet>
  ));
}

// ---- the screen ----

function SetRow({ session, entry, set, index, ex, hint }) {
  const save = () => saveSession(session);
  const t = entry.target;
  const repHint = hint ? hint.reps : t ? t.repMin : null;
  const toggle = () => {
    if (!set.done) {
      if (ex.kind === 'timed') { if (set.seconds == null) set.seconds = repHint || 30; }
      else if (ex.kind === 'cardio') { if (set.minutes == null) set.minutes = repHint || 15; }
      else if (set.reps == null) set.reps = repHint || 8;
      set.done = true;
      set.doneAt = Date.now();
      const more = session.entries.some((e) => e.sets.some((s) => !s.done));
      if (state.settings.autoRest && more) startRest((t && t.restSec) || state.settings.restSec);
    } else {
      set.done = false;
      set.doneAt = null;
    }
    save();
  };
  // A weight typed into one set carries down to the sets below that have not been done or changed.
  const setWeight = (v) => {
    const old = set.weight;
    set.weight = v;
    for (const s of entry.sets.slice(index + 1)) if (!s.done && (s.weight == null || s.weight === old)) s.weight = v;
    save();
  };
  const idp = `s-${set.id}`;
  return (
    <div class={`set-row ${set.done ? 'done' : ''}`}>
      <span class="set-n">{index + 1}</span>
      {ex.kind === 'weight' && <Num id={`${idp}-w`} label={`Set ${index + 1} weight`} unit={session.unit} value={set.weight} placeholder="0" onChange={setWeight} />}
      {ex.kind === 'bodyweight' && <Num id={`${idp}-w`} label={`Set ${index + 1} added weight`} unit={`+${session.unit}`} value={set.weight} placeholder="0" onChange={setWeight} />}
      {(ex.kind === 'weight' || ex.kind === 'bodyweight') && <Num id={`${idp}-r`} label={`Set ${index + 1} reps`} unit="reps" digits={0} value={set.reps} placeholder={repHint ? String(repHint) : ''} onChange={(v) => { set.reps = v; save(); }} />}
      {ex.kind === 'timed' && <Num id={`${idp}-s`} label={`Set ${index + 1} seconds`} unit="sec" digits={0} value={set.seconds} placeholder={repHint ? String(repHint) : ''} onChange={(v) => { set.seconds = v; save(); }} />}
      {ex.kind === 'cardio' && <Num id={`${idp}-m`} label="Minutes" unit="min" digits={0} value={set.minutes} placeholder={repHint ? String(repHint) : ''} onChange={(v) => { set.minutes = v; save(); }} />}
      <button class={`tick ${set.done ? 'on' : ''}`} onClick={toggle} aria-pressed={set.done} aria-label={`Set ${index + 1} ${set.done ? 'done' : 'not done'}`}><Icon name="check" /></button>
    </div>
  );
}

function EntryCard({ session, entry }) {
  const ex = exById(entry.exerciseId);
  const hint = hintFor(entry);
  const t = entry.target;
  const unitWord = ex.kind === 'timed' ? ' s' : ex.kind === 'cardio' ? ' min' : '';
  const save = () => saveSession(session);
  const swap = () => openSheet(() => (
    <Sheet title={`Swap ${ex.name}`} tall>
      <ul class="pick-list">
        {alternatives(ex.id, (state.settings.profile || {}).equipment, customExercises()).map((a) => (
          <li><button onClick={() => {
            entry.exerciseId = a.id;
            for (const s of entry.sets) if (!s.done) Object.assign(s, { weight: null, reps: null, seconds: null, minutes: null });
            prefill({ ...entry, sets: entry.sets.filter((s) => !s.done) });
            save(); closeSheet();
          }}><strong>{a.name}</strong><span>{a.equipment.replace('_', ' ')} · {a.muscle}</span></button></li>
        ))}
      </ul>
    </Sheet>
  ));
  const doneCount = entry.sets.filter((s) => s.done).length;
  return (
    <article class={`card entry ${doneCount === entry.sets.length && doneCount ? 'complete' : ''}`}>
      <header>
        <div>
          <h3>{ex.name}</h3>
          {t && <p class="target">{t.sets} × {t.repMin === t.repMax ? t.repMin : `${t.repMin}–${t.repMax}`}{unitWord}{t.restSec ? ` · rest ${fmtClock(t.restSec)}` : ''}</p>}
        </div>
        <span class="count">{doneCount}/{entry.sets.length}</span>
      </header>
      {hint ? (
        <p class="hint"><span>Last time: {hint.last}</span><strong>{hint.text}</strong></p>
      ) : (
        <p class="hint"><span>First time logging this. Pick a weight you could do for {t ? t.repMax + 2 : 12} reps and stop at {t ? t.repMax : 10}.</span></p>
      )}
      <div class="sets">
        {entry.sets.map((s, i) => <SetRow key={s.id} session={session} entry={entry} set={s} index={i} ex={ex} hint={hint} />)}
      </div>
      <footer class="entry-actions">
        <button class="btn btn-quiet btn-sm" onClick={() => { const prev = entry.sets[entry.sets.length - 1]; const n = newSet(); if (prev) n.weight = prev.weight; entry.sets.push(n); save(); }}><Icon name="plus" size={16} /> Set</button>
        {entry.sets.length > 1 && <button class="btn btn-quiet btn-sm" onClick={() => { entry.sets.pop(); save(); }}>Remove set</button>}
        <button class="btn btn-quiet btn-sm" onClick={swap}><Icon name="swap" size={16} /> Swap</button>
        <button class="btn btn-quiet btn-sm" onClick={() => { session.entries = session.entries.filter((e) => e !== entry); save(); }} aria-label={`Remove ${ex.name}`}><Icon name="trash" size={16} /></button>
      </footer>
    </article>
  );
}

function Elapsed({ since }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  return <span class="elapsed">{fmtClock((Date.now() - since) / 1000)}</span>;
}

export function WorkoutScreen() {
  useStore();
  const session = activeSession();
  useEffect(() => {
    // Keep the screen awake between sets where the browser allows it.
    let lock = null;
    if (state.settings.keepAwake && navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { if (lock) lock.release().catch(() => {}); };
  }, []);
  if (!session) { setTimeout(() => setNav({ workoutOpen: false }), 0); return null; }
  const done = session.entries.reduce((a, e) => a + e.sets.filter(isCountedSet).length, 0);
  const total = session.entries.reduce((a, e) => a + e.sets.length, 0);
  const add = () => openSheet(() => <ExercisePicker title="Add exercise" onPick={(id) => { const e = newEntry(id); prefill(e); session.entries.push(e); saveSession(session); closeAllSheets(); }} />);
  const end = () => {
    if (!done) {
      confirmAction({ title: 'Discard this workout?', body: 'No sets are ticked off, so there is nothing to save.', action: 'Discard', onConfirm: () => { deleteSession(session); stopRest(); setNav({ workoutOpen: false }); } });
    } else if (done < total) {
      confirmAction({ title: 'Finish now?', body: `${total - done} sets are not ticked off. They will be left out of the record.`, action: 'Finish workout', danger: false, onConfirm: () => finish(session) });
    } else finish(session);
  };
  return (
    <div class="workout">
      <header class="workout-head">
        <button class="icon-btn" onClick={() => setNav({ workoutOpen: false })} aria-label="Back to the app, workout keeps running"><Icon name="down" /></button>
        <div class="workout-title">
          <strong>{session.name}</strong>
          <span><Elapsed since={session.startedAt} /> · {done}/{total} sets</span>
        </div>
        <button class="btn btn-primary" onClick={end}>Finish</button>
      </header>
      <div class="workout-body">
        {session.entries.map((e) => <EntryCard key={e.id} session={session} entry={e} />)}
        {!session.entries.length && <p class="muted center">An empty workout. Add the exercises you do as you go.</p>}
        <button class="btn block" onClick={add}><Icon name="plus" size={18} /> Add exercise</button>
        <button class="btn btn-danger-quiet block" onClick={() => confirmAction({ title: 'Discard this workout?', body: 'Everything logged in it is deleted.', action: 'Discard', onConfirm: () => { deleteSession(session); stopRest(); setNav({ workoutOpen: false }); toast('Workout discarded.'); } })}>Discard workout</button>
      </div>
    </div>
  );
}
