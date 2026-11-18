import { useState, useEffect } from 'preact/hooks';
import { state, ui, setUI, settings, put, remove } from '../core/store.js';
import { newEntry, newSet, isCountedSet, DIST_UNIT } from '../core/model.js';
import { activeSession, defaultTarget, targetText, toast } from '../core/actions.js';
import { getExercise } from '../core/exercises.js';
import { lastEntry, exerciseHistory, setScore, setText, convert, countedSets, sessionVolume, fmt, fmtClock, fmtDur, fmtDate } from '../core/stats.js';
import { NumField, Sheet, ConfirmButton, ScreenHead, ExercisePicker, Field } from '../ui.jsx';

let audio = null;
function primeAudio() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { audio = null; } }
function restDone() {
  const s = settings();
  if (s.sound && audio) { try {
    [0, 0.22].forEach((at) => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, audio.currentTime + at); g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + at + 0.18);
      o.start(audio.currentTime + at); o.stop(audio.currentTime + at + 0.2); });
  } catch (e) { /* no sound */ } }
  if (s.vibrate && navigator.vibrate) { try { navigator.vibrate([180, 90, 180]); } catch (e) { /* unsupported */ } }
}
export function RestBar() {
  const r = ui.rest, [, tick] = useState(0);
  useEffect(() => {
    if (!r) return undefined;
    const h = setInterval(() => { if (Date.now() >= r.endsAt) { restDone(); setUI({ rest: null }); toast('Rest over. Next set.'); } else tick((n) => n + 1); }, 250);
    return () => clearInterval(h);
  }, [r && r.endsAt]);
  if (!r) return null;
  const left = Math.max(0, (r.endsAt - Date.now()) / 1000);
  return (
    <div class="restbar" role="timer" aria-label="Rest timer">
      <div class="restbar-fill" style={{ width: `${Math.min(100, (left / r.total) * 100)}%` }} />
      <span class="restbar-label">Rest <b class="num">{fmtClock(left)}</b></span>
      <button class="btn sm" onClick={() => setUI({ rest: { endsAt: r.endsAt + 30000, total: r.total + 30 } })}>+30 s</button>
      <button class="btn sm" onClick={() => setUI({ rest: null })}>Skip</button>
    </div>
  );
}
function Elapsed({ from }) {
  const [, tick] = useState(0);
  useEffect(() => { const h = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(h); }, []);
  return <span class="num">{fmtClock((Date.now() - from) / 1000)}</span>;
}
function useWakeLock(on) {
  useEffect(() => {
    if (!on || !navigator.wakeLock) return undefined;
    let lock = null, gone = false;
    const get = () => navigator.wakeLock.request('screen').then((l) => { if (gone) l.release(); else lock = l; }).catch(() => {});
    const vis = () => { if (!document.hidden) get(); };
    get(); document.addEventListener('visibilitychange', vis);
    return () => { gone = true; document.removeEventListener('visibilitychange', vis); if (lock) lock.release().catch(() => {}); };
  }, [on]);
}

const FIELDS = {
  weight: (u) => [['weight', u, true], ['reps', 'reps', false]],
  bodyweight: (u) => [['reps', 'reps', false], ['weight', `+ ${u}`, true]],
  timed: (u) => [['seconds', 'sec', false], ['weight', `+ ${u}`, true]],
  cardio: (u) => [['minutes', 'min', true], ['distance', DIST_UNIT[u], true]],
};
const REQUIRED = { weight: ['weight', 'reps'], bodyweight: ['reps'], timed: ['seconds'], cardio: ['minutes'] };

function EntryCard({ ses, entry, save }) {
  const ex = getExercise(entry.exerciseId), s = settings();
  const last = lastEntry(state.sessions, entry.exerciseId, ses.id);
  const lastSets = last ? last.entry.sets.filter(isCountedSet) : [];
  const fields = FIELDS[ex.kind](ses.unit);
  const ghost = (i) => {
    const prev = i > 0 ? entry.sets[i - 1] : null, l = lastSets[Math.min(i, lastSets.length - 1)], g = {};
    for (const [k] of fields) {
      if (prev && prev[k] != null) g[k] = prev[k];
      else if (l && l[k] != null) g[k] = k === 'weight' && last.session.unit !== ses.unit ? Math.round(convert(l[k], last.session.unit, ses.unit) * 2) / 2 : l[k];
      else g[k] = null;
    }
    return g;
  };
  const toggle = (set, i) => {
    primeAudio();
    if (set.done) { set.done = false; set.doneAt = null; save(); return; }
    const g = ghost(i);
    for (const [k] of fields) if (set[k] == null && g[k] != null) set[k] = g[k];
    const missing = REQUIRED[ex.kind].find((k) => set[k] == null);
    if (missing) { for (const [k] of fields) if (g[k] != null && set[k] === g[k]) { /* keep filled */ } toast(`Enter ${missing} for this set first.`); save(); return; }
    let best = 0;
    for (const p of exerciseHistory(state.sessions, ex.id, ex.kind, ses.unit)) best = Math.max(best, p.v);
    for (const o of entry.sets) if (o !== set && isCountedSet(o)) best = Math.max(best, setScore(o, ex.kind, ses.unit, ses.unit));
    set.done = true; set.doneAt = Date.now(); save();
    if (best > 0 && setScore(set, ex.kind, ses.unit, ses.unit) > best + 1e-9) toast(`New best on ${ex.name}: ${setText(set, ex.kind, ses.unit)}`);
    const rest = (entry.target && entry.target.restSec) || (ex.kind === 'cardio' ? 0 : s.restSec);
    if (s.autoRest && rest > 0) setUI({ rest: { endsAt: Date.now() + rest * 1000, total: rest } });
  };
  return (
    <section class="card entry">
      <div class="card-head">
        <div><h2>{ex.name}</h2>
          <p class="muted small">{[entry.target && `Target ${targetText(entry.target, ex.kind)}`, entry.target && entry.target.note].filter(Boolean).join(' · ')}</p>
          {last && <p class="muted small">Last time ({fmtDate(last.session.startedAt, { day: 'numeric', month: 'short' })}): {lastSets.map((x) => setText(x, ex.kind, last.session.unit)).join(', ')}</p>}
        </div>
      </div>
      <div class="sets">
        <div class="set set-head"><span>Set</span>{fields.map(([, label]) => <span>{label}</span>)}<span>Done</span></div>
        {entry.sets.map((set, i) => { const g = ghost(i); return (
          <div class={`set${set.done ? ' done' : ''}`} key={set.id}>
            <span class="num set-n">{i + 1}</span>
            {fields.map(([k, label, dec]) => <NumField id={`f-${set.id}-${k}`} value={set[k]} decimal={dec} label={`Set ${i + 1} ${label}`} placeholder={g[k] != null ? fmt(g[k]) : '–'} onChange={(v) => { set[k] = v; save(); }} />)}
            <button class="check" aria-pressed={set.done} aria-label={`Set ${i + 1} done`} onClick={() => toggle(set, i)}>{set.done ? '✓' : ''}</button>
          </div>
        ); })}
      </div>
      <div class="actions">
        <button class="btn sm" onClick={() => { entry.sets.push(newSet('work')); save(); }}>+ Set</button>
        {entry.sets.length > 1 && <button class="btn sm ghost" onClick={() => { entry.sets.pop(); save(); }}>Remove last set</button>}
        <span class="grow" />
        <ConfirmButton label="Remove" confirm="Tap again to remove" class="btn sm ghost" onConfirm={() => { ses.entries = ses.entries.filter((e) => e !== entry); save(); }} />
      </div>
      <input id={`note-${entry.id}`} class="note-in" type="text" placeholder="Note for today (optional)" maxlength="160" value={entry.note} onInput={(e) => { entry.note = e.target.value; save(); }} />
    </section>
  );
}

function FinishSheet({ ses, onClose }) {
  const [rating, setRating] = useState(ses.rating), [note, setNote] = useState(ses.note || '');
  const sets = countedSets(ses), u = settings().units;
  const finish = () => {
    for (const e of ses.entries) e.sets = e.sets.filter((x) => x.done);
    ses.entries = ses.entries.filter((e) => e.sets.length);
    Object.assign(ses, { status: 'done', finishedAt: Date.now(), rating, note: note.trim() });
    put('sessions', ses); setUI({ rest: null, tab: 'history', screen: { name: 'session', id: ses.id } }); toast('Workout saved.');
  };
  return (
    <Sheet title="Finish workout" onClose={onClose}>
      {sets ? (
        <>
          <div class="stats">
            <div><b class="num">{fmtDur(Date.now() - ses.startedAt)}</b><span>duration</span></div>
            <div><b class="num">{sets}</b><span>sets</span></div>
            <div><b class="num">{fmt(sessionVolume(ses, u), 0)}</b><span>{u} lifted</span></div>
          </div>
          <div class="field"><span>How did it feel?</span>
            <div class="seg five">{['Rough', 'Hard', 'Okay', 'Good', 'Great'].map((l, i) => <button type="button" aria-pressed={rating === i + 1} onClick={() => setRating(rating === i + 1 ? null : i + 1)}>{l}</button>)}</div></div>
          <Field label="Notes (optional)"><textarea id="finish-note" rows="3" maxlength="600" value={note} onInput={(e) => setNote(e.target.value)} /></Field>
          <p class="muted small">Sets you did not tick off are left out.</p>
          <button class="btn primary block" onClick={finish}>Save workout</button>
        </>
      ) : <p class="empty">No sets are ticked off yet. Tick at least one, or discard the workout from the bottom of the screen.</p>}
    </Sheet>
  );
}

export function Workout() {
  const ses = activeSession(), s = settings();
  const [picker, setPicker] = useState(false), [finishing, setFinishing] = useState(false);
  useWakeLock(!!ses && s.keepAwake);
  if (!ses) return <><ScreenHead title="Workout" /><p class="empty">No workout in progress.</p></>;
  const save = () => put('sessions', ses);
  return (
    <>
      <ScreenHead title={ses.name} right={<button class="btn primary sm" onClick={() => setFinishing(true)}>Finish</button>} />
      <p class="muted small workout-meta"><Elapsed from={ses.startedAt} /> elapsed · {countedSets(ses)} sets done · weights in {ses.unit}</p>
      {ses.entries.map((en) => <EntryCard key={en.id} ses={ses} entry={en} save={save} />)}
      {!ses.entries.length && <p class="empty">Add your first exercise to get going.</p>}
      <button class="btn block" onClick={() => setPicker(true)}>+ Add exercise</button>
      <div class="actions end"><ConfirmButton label="Discard workout" confirm="Tap again to discard" onConfirm={() => { remove('sessions', ses.id); setUI({ screen: null, rest: null }); toast('Workout discarded.'); }} /></div>
      {picker && <ExercisePicker onClose={() => setPicker(false)} onPick={(ex) => { ses.entries.push(newEntry(ex.id, defaultTarget(ex, s.restSec))); save(); setPicker(false); }} />}
      {finishing && <FinishSheet ses={ses} onClose={() => setFinishing(false)} />}
    </>
  );
}
