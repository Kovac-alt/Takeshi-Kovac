// Two small SVG charts drawn at the container's real pixel width, each with a hover readout.
import { useEffect, useRef, useState } from 'preact/hooks';

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Round axis bounds and 3 to 5 ticks covering [lo, hi]. */
function ticks(lo, hi, want = 4) {
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / want;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const start = Math.floor(lo / step) * step;
  const out = [];
  for (let v = start; v < hi + step * 0.999; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

const fmtTick = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(v));

/**
 * A single-series line.
 * @param {{points:{label:string, value:number, note?:string}[], unit?:string, goal?:number|null, goalLabel?:string, height?:number, label:string}} props
 */
export function LineChart({ points, unit = '', goal = null, goalLabel = 'Goal', height = 180, label }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { l: 38, r: 14, t: 12, b: 24 };
  const values = points.map((p) => p.value).concat(goal != null ? [goal] : []);
  const tk = ticks(Math.min(...values), Math.max(...values));
  const lo = tk[0];
  const hi = tk[tk.length - 1];
  const iw = Math.max(10, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const x = (i) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join('');
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(best);
  };
  const last = points.length - 1;
  const h = hover != null && points[hover] ? hover : null;
  return (
    <div class="chart" ref={ref}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={label} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          {tk.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" stroke-width="1" />
              <text x={pad.l - 6} y={y(v) + 4} text-anchor="end" class="axis">{fmtTick(v)}</text>
            </g>
          ))}
          {goal != null && (
            <g>
              <line x1={pad.l} x2={w - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="4 4" />
              <text x={w - pad.r} y={y(goal) - 5} text-anchor="end" class="axis">{goalLabel}</text>
            </g>
          )}
          <path d={path} fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          {points.length <= 24 && points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="2.5" fill="var(--series-1)" />)}
          <circle cx={x(last)} cy={y(points[last].value)} r="5" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2" />
          <text x={pad.l} y={height - 6} class="axis">{points[0].label}</text>
          {points.length > 1 && <text x={w - pad.r} y={height - 6} text-anchor="end" class="axis">{points[last].label}</text>}
          {h != null && (
            <g>
              <line x1={x(h)} x2={x(h)} y1={pad.t} y2={pad.t + ih} stroke="var(--line-strong)" stroke-width="1" />
              <circle cx={x(h)} cy={y(points[h].value)} r="5" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2" />
            </g>
          )}
        </svg>
      )}
      {h != null && (
        <div class="chart-tip" style={{ left: `${Math.min(Math.max(x(h), 70), w - 70)}px` }}>
          <b>{points[h].value} {unit}</b><span>{points[h].label}{points[h].note ? ` · ${points[h].note}` : ''}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Vertical bars with an optional target line.
 * @param {{bars:{label:string, value:number|null, long?:string}[], unit?:string, goal?:number|null, goalLabel?:string, height?:number, label:string}} props
 */
export function BarChart({ bars, unit = '', goal = null, goalLabel = 'Target', height = 170, label }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { l: 38, r: 10, t: 14, b: 24 };
  const tk = ticks(0, Math.max(goal || 0, ...bars.map((b) => b.value || 0), 1));
  const hi = tk[tk.length - 1];
  const iw = Math.max(10, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const band = iw / bars.length;
  const bw = Math.min(24, Math.max(3, band - 2));
  const y = (v) => pad.t + ih - (v / hi) * ih;
  const every = Math.ceil(bars.length / Math.max(1, Math.floor(iw / 34)));
  return (
    <div class="chart" ref={ref}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
          {tk.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" stroke-width="1" />
              <text x={pad.l - 6} y={y(v) + 4} text-anchor="end" class="axis">{fmtTick(v)}</text>
            </g>
          ))}
          {bars.map((b, i) => {
            const cx = pad.l + band * i + band / 2;
            const top = y(b.value || 0);
            return (
              <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
                <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="transparent" />
                {b.value > 0 && <path d={`M${cx - bw / 2} ${pad.t + ih}V${top + 3}q0-3 3-3h${bw - 6}q3 0 3 3V${pad.t + ih}z`} fill="var(--series-1)" opacity={hover == null || hover === i ? 1 : 0.55} />}
                {i % every === 0 && <text x={cx} y={height - 6} text-anchor="middle" class="axis">{b.label}</text>}
              </g>
            );
          })}
          {goal != null && (
            <g pointer-events="none">
              <line x1={pad.l} x2={w - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="4 4" />
              <text x={w - pad.r} y={y(goal) - 5} text-anchor="end" class="axis">{goalLabel} {goal}</text>
            </g>
          )}
        </svg>
      )}
      {hover != null && bars[hover] && (
        <div class="chart-tip" style={{ left: `${Math.min(Math.max(pad.l + band * hover + band / 2, 70), w - 70)}px` }}>
          <b>{bars[hover].value ? `${bars[hover].value} ${unit}` : 'Nothing logged'}</b><span>{bars[hover].long || bars[hover].label}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal bars for a short ranked list, with an optional shaded target zone.
 * @param {{rows:{label:string, value:number}[], zone?:[number, number], unit?:string}} props
 */
export function RowBars({ rows, zone = null, unit = '' }) {
  const max = Math.max(zone ? zone[1] * 1.15 : 0, ...rows.map((r) => r.value), 1);
  return (
    <div class="rowbars">
      {rows.map((r) => (
        <div class="rowbar" key={r.label}>
          <span>{r.label}</span>
          <div class="rowbar-track" role="img" aria-label={`${r.label}: ${r.value} ${unit}`}>
            {zone && <em style={{ left: `${(zone[0] / max) * 100}%`, width: `${((zone[1] - zone[0]) / max) * 100}%` }} />}
            <i style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <b>{r.value % 1 ? r.value.toFixed(1) : r.value}</b>
        </div>
      ))}
    </div>
  );
}
