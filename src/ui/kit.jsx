// Shared UI pieces: icons, sheets, toasts, fields and the nutrition meters.
import { useEffect, useRef, useState } from 'preact/hooks';
import { fmtNum, parseNum } from '../core/util.js';

const ICONS = {
  today: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z',
  train: 'M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12',
  food: 'M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 3c-2 1.5-3 4-3 7h3zM17 10v11',
  meals: 'M5 4h14v17H5zM9 2v4M15 2v4M8.5 11h7M8.5 15h5',
  progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.6a7.6 7.6 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 2.6 1.5l.5 2.6h4l.5-2.6a7.6 7.6 0 0 0 2.6-1.5l2.3 1 2-3.4z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  up: 'M5 15l7-7 7 7',
  down: 'M5 9l7 7 7-7',
  swap: 'M4 8h14l-3.5-3.5M20 16H6l3.5 3.5',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l5 5',
  cart: 'M3 4h2.5l2.2 11h10.6L20.5 7H7M9.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  play: 'M7 4.5v15l12-7.5z',
  edit: 'M4 20h4L19.5 8.5l-4-4L4 16zM13.5 6.5l4 4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
  shuffle: 'M3 7h3.5c3 0 4.5 10 8 10H21l-3-3M3 17h3.5c1 0 1.8-.9 2.6-2.2M21 7h-6.500c-1 0-1.800.9-2.600 2.200M18 4l3 3-3 3M18 14l3 3-3 3',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5c0 3 1.500 4.500 3.800 4.500M16 6h3.500c0 3-1.500 4.500-3.800 4.500M12 13v4M8.500 20h7M10 17h4',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  note: 'M5 4h14v12l-4 4H5zM15 20v-4h4M8.5 9h7M8.5 13h4',
};

export function Icon({ name, size = 22 }) {
  return (
    <svg class="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ''} />
    </svg>
  );
}

// ---- overlay state: a stack of sheets and one toast ----

let sheets = [];
let toastMsg = null;
let toastTimer = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f({}));

/** Open a sheet. `render` is called on every draw so the sheet follows the store. */
export function openSheet(render, opts = {}) {
  sheets = [...sheets, { render, ...opts }];
  emit();
}
export function closeSheet() {
  sheets = sheets.slice(0, -1);
  emit();
}
export function closeAllSheets() {
  sheets = [];
  emit();
}
export function toast(text) {
  toastMsg = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg = null; emit(); }, 2600);
  emit();
}

/** Ask before something that cannot be undone. */
export function confirmAction({ title, body, action, danger = true, onConfirm }) {
  openSheet(() => (
    <Sheet title={title}>
      <p class="muted">{body}</p>
      <div class="row gap-2 mt-4">
        <button class="btn" onClick={closeSheet}>Cancel</button>
        <button class={`btn ${danger ? 'btn-danger' : 'btn-primary'} grow`} onClick={() => { closeSheet(); onConfirm(); }}>{action}</button>
      </div>
    </Sheet>
  ));
}

export function Overlays() {
  const [, set] = useState({});
  useEffect(() => { subs.add(set); return () => subs.delete(set); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && sheets.length) closeSheet(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      {sheets.map((s, i) => (
        <div class="sheet-wrap" key={i} onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
          {s.render()}
        </div>
      ))}
      <div class="toast-zone" role="status" aria-live="polite">{toastMsg && <div class="toast">{toastMsg}</div>}</div>
    </>
  );
}

export function Sheet({ title, children, footer, tall = false }) {
  return (
    <div class={`sheet ${tall ? 'sheet-tall' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div class="sheet-head">
        <h2>{title}</h2>
        <button class="icon-btn" onClick={closeSheet} aria-label="Close"><Icon name="x" /></button>
      </div>
      <div class="sheet-body">{children}</div>
      {footer && <div class="sheet-foot">{footer}</div>}
    </div>
  );
}

// ---- controls ----

export function Seg({ value, options, onChange, label, id }) {
  return (
    <div class="seg" role="radiogroup" aria-label={label} id={id}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={o.id === value} class={o.id === value ? 'on' : ''} onClick={() => onChange(o.id)}>{o.name}</button>
      ))}
    </div>
  );
}

/**
 * A number field that keeps what the user is typing as text and reports a number
 * (or null) on every change.
 */
export function Num({ value, onChange, id, placeholder, unit, label, min = 0, max, digits = 1, class: cls = '', ...rest }) {
  const [text, setText] = useState(value == null ? '' : fmtNum(value, digits));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value == null ? '' : fmtNum(value, digits));
    }
  }, [value]);
  const input = (
    <input
      id={id}
      class={`num ${cls}`}
      type="text"
      inputMode="decimal"
      autocomplete="off"
      placeholder={placeholder}
      aria-label={label}
      value={text}
      onFocus={(e) => e.target.select()}
      onInput={(e) => {
        const t = e.target.value;
        setText(t);
        let n = parseNum(t);
        if (n != null && n < min) n = min;
        if (n != null && max != null && n > max) n = max;
        last.current = n;
        onChange(n);
      }}
      {...rest}
    />
  );
  if (!unit) return input;
  return <span class="num-unit">{input}<span>{unit}</span></span>;
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label, fmt = (v) => v }) {
  return (
    <div class="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} disabled={value <= min} aria-label={`Less ${label || ''}`}>−</button>
      <output>{fmt(value)}</output>
      <button type="button" onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} disabled={value >= max} aria-label={`More ${label || ''}`}>+</button>
    </div>
  );
}

export function Field({ label, children, hint, for: htmlFor }) {
  return (
    <div class="field">
      <label for={htmlFor}>{label}</label>
      {children}
      {hint && <small class="muted">{hint}</small>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div class="empty">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

// ---- nutrition meters ----

/** Calories eaten against the target, as a ring with the number left in the middle. */
export function CalorieRing({ eaten, target, size = 132 }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = target ? Math.min(1, eaten / target) : 0;
  const left = target - eaten;
  const over = left < 0;
  return (
    <div class="ring" style={{ width: size, height: size }} role="img" aria-label={`${eaten} of ${target} kcal eaten`}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" stroke-width="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={over ? 'var(--red)' : 'var(--accent)'} stroke-width="10" stroke-linecap="round"
          stroke-dasharray={`${c * frac} ${c}`} transform="rotate(-90 60 60)" />
      </svg>
      <div class="ring-mid">
        <b>{Math.abs(left)}</b>
        <span>{over ? 'kcal over' : 'kcal left'}</span>
      </div>
    </div>
  );
}

const MACROS = [
  ['protein', 'Protein', 'var(--series-1)'],
  ['carbs', 'Carbs', 'var(--series-2)'],
  ['fat', 'Fat', 'var(--series-3)'],
];

/** Three labelled bars: grams eaten against each macro target. */
export function MacroBars({ totals, targets }) {
  return (
    <div class="macros">
      {MACROS.map(([k, name, color]) => {
        const v = totals[k] || 0;
        const t = targets[k] || 0;
        return (
          <div class="macro" key={k}>
            <div class="macro-top"><span>{name}</span><span><b>{v}</b> / {t} g</span></div>
            <div class="bar" role="img" aria-label={`${name}: ${v} of ${t} grams`}><i style={{ width: `${t ? Math.min(100, (v / t) * 100) : 0}%`, background: color }} /></div>
          </div>
        );
      })}
    </div>
  );
}

/** '620 kcal · 48 g protein' and friends. */
export function MacroLine({ m, full = false }) {
  return (
    <span class="macro-line">
      <b>{m.kcal}</b> kcal · <b>{Math.round(m.protein || 0)}</b> g protein
      {full && <> · {Math.round(m.carbs || 0)} g carbs · {Math.round(m.fat || 0)} g fat</>}
    </span>
  );
}
