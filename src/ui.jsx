// Small shared components.
import { useState, useEffect, useRef, useLayoutEffect } from 'preact/hooks';
import { ui, setUI } from './core/store.js';
import { MUSCLES, EQUIPMENT, CARDIO, customExerciseId } from './core/model.js';
import { allExercises, customExercises } from './core/exercises.js';
import { state, setKV } from './core/store.js';
import { fmt, fmtDate } from './core/stats.js';

export const parseNum = (t) => { const n = parseFloat(String(t).replace(',', '.')); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; };
export const muscleName = (id) => (id === CARDIO ? 'Cardio' : (MUSCLES.find((m) => m.id === id) || { name: 'Other' }).name);

/** A number box that keeps what you typed while you are typing it. */
export function NumField({ value, onChange, placeholder, label, decimal = true, id, class: cls = '' }) {
  const [text, setText] = useState(null);
  return (
    <input id={id} class={`num-in ${cls}`} type="text" inputmode={decimal ? 'decimal' : 'numeric'} autocomplete="off"
      aria-label={label} placeholder={placeholder} value={text !== null ? text : value == null ? '' : String(value)}
      onFocus={(e) => { setText(value == null ? '' : String(value)); const el = e.target; setTimeout(() => { try { el.select(); } catch (err) { /* gone */ } }, 0); }}
      onInput={(e) => { setText(e.target.value); onChange(parseNum(e.target.value)); }}
      onBlur={() => setText(null)} />
  );
}
export function Field({ label, children, class: cls = '' }) { return <label class={`field ${cls}`}><span>{label}</span>{children}</label>; }

export function Sheet({ title, onClose, children }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  return (
    <div class="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div class="sheet-head"><h2>{title}</h2><button class="btn ghost sm" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}
/** Destructive actions ask for a second tap instead of a dialog. */
export function ConfirmButton({ label, confirm = 'Tap again to confirm', onConfirm, class: cls = 'btn danger sm' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return undefined; const h = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(h); }, [armed]);
  return <button type="button" class={cls} onClick={() => (armed ? onConfirm() : setArmed(true))}>{armed ? confirm : label}</button>;
}
export function ScreenHead({ title, right }) {
  return (
    <div class="screen-head">
      <button class="btn ghost sm" onClick={() => setUI({ screen: (ui.screen && ui.screen.back) || null })}>‹ Back</button>
      <h1>{title}</h1>
      <div class="screen-right">{right}</div>
    </div>
  );
}
export function Toast() {
  const t = ui.toast;
  useEffect(() => { if (!t) return undefined; const h = setTimeout(() => setUI({ toast: null }), 3500); return () => clearTimeout(h); }, [t && t.id]);
  return t ? <div class="toast" role="status">{t.msg}</div> : null;
}
export function Meter({ value, max, tone = '' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return <div class="meter"><div class={`meter-fill ${tone}`} style={{ width: `${pct}%` }} /></div>;
}

/** Pick an exercise from the library, or make your own. */
export function ExercisePicker({ onPick, onClose }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const [creating, setCreating] = useState(null);
  const needle = q.trim().toLowerCase();
  const list = allExercises().filter((e) => (!muscle || e.muscle === muscle) && (!needle || e.name.toLowerCase().includes(needle)));
  if (creating) {
    const c = creating, set = (p) => setCreating({ ...c, ...p });
    const saveNew = () => {
      const name = c.name.trim(); if (!name) return;
      const ex = { id: customExerciseId(name), name, muscle: c.kind === 'cardio' ? CARDIO : c.muscle, secondary: [], equipment: c.equipment, kind: c.kind, pattern: c.kind === 'cardio' ? 'cardio' : 'other', custom: true };
      setKV('custom', { ...state.kv.custom, exercises: [...customExercises(), ex] });
      onPick(ex);
    };
    return (
      <Sheet title="New exercise" onClose={onClose}>
        <Field label="Name"><input id="newex-name" type="text" value={c.name} maxlength="60" onInput={(e) => set({ name: e.target.value })} /></Field>
        <div class="grid2">
          <Field label="Logged as"><select id="newex-kind" value={c.kind} onChange={(e) => set({ kind: e.target.value })}>
            <option value="weight">Weight × reps</option><option value="bodyweight">Reps (bodyweight)</option><option value="timed">Time held</option><option value="cardio">Cardio minutes</option></select></Field>
          <Field label="Main muscle"><select id="newex-muscle" value={c.muscle} disabled={c.kind === 'cardio'} onChange={(e) => set({ muscle: e.target.value })}>
            {MUSCLES.map((m) => <option value={m.id}>{m.name}</option>)}</select></Field>
        </div>
        <Field label="Equipment"><select id="newex-equipment" value={c.equipment} onChange={(e) => set({ equipment: e.target.value })}>{EQUIPMENT.map((m) => <option value={m.id}>{m.name}</option>)}</select></Field>
        <div class="actions"><button class="btn" onClick={() => setCreating(null)}>Back to the list</button><button class="btn primary" disabled={!c.name.trim()} onClick={saveNew}>Add exercise</button></div>
      </Sheet>
    );
  }
  return (
    <Sheet title="Add exercise" onClose={onClose}>
      <input id="picker-q" type="search" placeholder="Search exercises" value={q} onInput={(e) => setQ(e.target.value)} />
      <div class="chips">
        <button class="chip" aria-pressed={!muscle} onClick={() => setMuscle('')}>All</button>
        {[...MUSCLES, { id: CARDIO, name: 'Cardio' }].map((m) => <button class="chip" aria-pressed={muscle === m.id} onClick={() => setMuscle(muscle === m.id ? '' : m.id)}>{m.name}</button>)}
      </div>
      <div class="list picker-list">
        {list.map((e) => <button class="row" onClick={() => onPick(e)}><span class="row-main"><b>{e.name}</b><small>{muscleName(e.muscle)} · {(EQUIPMENT.find((x) => x.id === e.equipment) || {}).name}{e.custom ? ' · yours' : ''}</small></span></button>)}
        {!list.length && <p class="empty">No exercise matches that.</p>}
      </div>
      <button class="btn block" onClick={() => setCreating({ name: q.trim(), kind: 'weight', muscle: muscle && muscle !== CARDIO ? muscle : 'chest', equipment: 'other' })}>Create {needle ? `“${q.trim()}”` : 'your own exercise'}</button>
    </Sheet>
  );
}

function niceStep(raw) { const p = 10 ** Math.floor(Math.log10(raw)), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
/** One series over time. points: [{t, v, label}] oldest first. */
export function LineChart({ points, unit }) {
  const host = useRef(null);
  const [w, setW] = useState(320);
  const [hi, setHi] = useState(-1);
  useLayoutEffect(() => {
    const fit = () => host.current && setW(Math.max(260, host.current.clientWidth));
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, []);
  const H = 200, m = { l: 44, r: 14, t: 26, b: 24 };
  const vs = points.map((p) => p.v), lo = Math.min(...vs), top = Math.max(...vs);
  const step = niceStep(Math.max(top - lo, top * 0.05, 1) / 3);
  const y0 = Math.max(0, Math.floor(lo / step) * step - (lo % step === 0 && lo > 0 ? step : 0)), y1 = Math.ceil(top / step) * step + (top % step === 0 ? step : 0);
  const pw = w - m.l - m.r, ph = H - m.t - m.b;
  const x = (i) => m.l + (points.length === 1 ? pw / 2 : (i / (points.length - 1)) * pw);
  const y = (v) => m.t + ph - ((v - y0) / (y1 - y0)) * ph;
  const ticks = []; for (let v = y0; v <= y1 + 1e-9; v += step) ticks.push(v);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(), px = (e.clientX - r.left) * (w / r.width); let best = 0; points.forEach((p, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; }); setHi(best); };
  const sel = hi >= 0 && points[hi] ? hi : points.length - 1, sp = points[sel];
  const tip = `${fmt(sp.v, 1)} ${unit} · ${fmtDate(sp.t, { day: 'numeric', month: 'short' })}`;
  const tx = Math.min(w - m.r - tip.length * 3.2, Math.max(m.l + tip.length * 3.2, x(sel)));
  return (
    <div class="chart" ref={host}>
      <svg viewBox={`0 0 ${w} ${H}`} height={H} role="img" aria-label={`Progress over ${points.length} sessions`} onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHi(-1)}>
        {ticks.map((v) => <g><line x1={m.l} x2={w - m.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" /><text x={m.l - 6} y={y(v) + 4} text-anchor="end">{fmt(v, 1)}</text></g>)}
        <text x={m.l} y={H - 6}>{fmtDate(points[0].t, { day: 'numeric', month: 'short' })}</text>
        {points.length > 1 && <text x={w - m.r} y={H - 6} text-anchor="end">{fmtDate(points[points.length - 1].t, { day: 'numeric', month: 'short' })}</text>}
        <line x1={x(sel)} x2={x(sel)} y1={m.t} y2={m.t + ph} stroke="var(--line-strong)" stroke-dasharray="3 3" />
        <path d={path} fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        {points.length <= 40 && points.map((p, i) => <circle cx={x(i)} cy={y(p.v)} r="3" fill="var(--series-1)" stroke="var(--surface)" stroke-width="1.5" />)}
        <circle cx={x(sel)} cy={y(sp.v)} r="5" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2" />
        <text class="chart-tip" x={tx} y={14} text-anchor="middle">{tip}</text>
      </svg>
    </div>
  );
}
