import { useState } from 'preact/hooks';
import { state, setUI, settings, put, patchSettings } from '../core/store.js';
import { DEFAULT_PROFILE } from '../core/model.js';
import { activeSession, startSession, nextDayIndex, targetText, toast } from '../core/actions.js';
import { TEMPLATES, planFromTemplate } from '../core/templates.js';
import { generatePlan, GOALS, KITS } from '../core/generator.js';
import { getExercise } from '../core/exercises.js';
import { doneSessions, startOfWeek, sessionVolume, countedSets, fmt, fmtDate, fmtDur } from '../core/stats.js';
import { Field } from '../ui.jsx';

export function useTemplate(t) {
  const plan = planFromTemplate(t);
  put('plans', plan); patchSettings({ activePlanId: plan.id, onboarded: true });
  toast(`${t.name} is now your plan.`);
  return plan;
}
export function TemplateList() {
  return (
    <div class="list">
      {TEMPLATES.map((t) => (
        <div class="row">
          <span class="row-main"><b>{t.name}</b><small>{t.blurb}</small><small>{t.days.map((d) => d.name).join(' · ')}</small></span>
          <button class="btn sm" onClick={() => useTemplate(t)}>Use</button>
        </div>
      ))}
    </div>
  );
}
/** Five questions, then a plan built to fit. */
export function PlanBuilder() {
  const [p, setP] = useState({ ...DEFAULT_PROFILE, ...(settings().profile || {}) });
  const set = (patch) => setP({ ...p, ...patch });
  const build = () => {
    const plan = generatePlan(p);
    put('plans', plan); patchSettings({ activePlanId: plan.id, profile: p, onboarded: true });
    toast(`${plan.name} is ready and set as your plan.`);
  };
  return (
    <>
      <div class="grid2">
        <Field label="Goal"><select id="pb-goal" value={p.goal} onChange={(e) => set({ goal: e.target.value })}>{Object.entries(GOALS).map((g) => <option value={g[0]}>{g[1]}</option>)}</select></Field>
        <Field label="Experience"><select id="pb-exp" value={p.experience} onChange={(e) => set({ experience: e.target.value })}><option value="beginner">New to lifting</option><option value="intermediate">A year or two</option><option value="advanced">Several years</option></select></Field>
        <Field label="Days a week"><select id="pb-days" value={String(p.daysPerWeek)} onChange={(e) => set({ daysPerWeek: Number(e.target.value) })}>{[2, 3, 4, 5, 6].map((n) => <option value={String(n)}>{n} days</option>)}</select></Field>
        <Field label="Time per session"><select id="pb-min" value={String(p.sessionMinutes)} onChange={(e) => set({ sessionMinutes: Number(e.target.value) })}>{[30, 45, 60, 75, 90].map((n) => <option value={String(n)}>{n} minutes</option>)}</select></Field>
      </div>
      <Field label="Equipment"><select id="pb-kit" value={p.equipment} onChange={(e) => set({ equipment: e.target.value })}>{Object.entries(KITS).map((g) => <option value={g[0]}>{g[1]}</option>)}</select></Field>
      <button class="btn primary block" onClick={build}>Build my plan</button>
    </>
  );
}

const dow = (ts) => (new Date(ts).getDay() + 6) % 7; // 0 = Monday, as plans store it
const sameDay = (a, b) => new Date(a).setHours(0, 0, 0, 0) === new Date(b).setHours(0, 0, 0, 0);
function planToday(plan, done) {
  const sch = plan.schedule;
  if (sch && sch.mode === 'weekdays') {
    const at = (i) => plan.days.find((d) => d.id === sch.weekdays[i]) || null, today = dow(Date.now()), day = at(today);
    const doneToday = !!day && done.some((x) => x.dayId === day.id && sameDay(x.startedAt, Date.now()));
    let next = null;
    for (let i = 1; i <= 7 && !next; i++) { const d = at((today + i) % 7); if (d) next = { day: d, t: Date.now() + i * 864e5 }; }
    return { fixed: true, day: doneToday ? null : day, doneToday, next };
  }
  const i = nextDayIndex(plan);
  return { fixed: false, day: i >= 0 ? plan.days[i] : null };
}

export function Today() {
  const s = settings(), act = activeSession(), plan = s.activePlanId ? state.plans[s.activePlanId] : null;
  const done = doneSessions(state.sessions), ws = startOfWeek(Date.now(), s.weekStart);
  const week = done.filter((x) => x.startedAt >= ws);
  const fixed = plan && plan.schedule && plan.schedule.mode === 'weekdays' ? plan.schedule.weekdays : null;
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); const t = d.getTime();
    return { t, trained: week.some((x) => sameDay(x.startedAt, t)), today: sameDay(t, Date.now()), planned: !!(fixed && fixed[dow(t)] && plan.days.some((pd) => pd.id === fixed[dow(t)])) }; });
  const pt = plan && plan.days.length ? planToday(plan, done) : null, next = pt && pt.day;
  const vol = week.reduce((a, x) => a + sessionVolume(x, s.units), 0);
  const last = done[0];
  return (
    <>
      <section class="card">
        <div class="card-head"><h2>This week</h2><span class="muted small">{week.length} {week.length === 1 ? 'workout' : 'workouts'}{fixed ? ` of ${days.filter((d) => d.planned).length} planned` : ''}</span></div>
        <div class="week" role="img" aria-label={`${week.length} workouts this week`}>
          {days.map((d) => <div class={`wd${d.trained ? ' on' : ''}${d.today ? ' today' : ''}${d.planned ? ' plan' : ''}`}><span>{fmtDate(d.t, { weekday: 'narrow' })}</span><i>{d.trained ? '✓' : ''}</i></div>)}
        </div>
        <div class="stats">
          <div><b class="num">{week.reduce((a, x) => a + countedSets(x), 0)}</b><span>sets</span></div>
          <div><b class="num">{fmt(vol, 0)}</b><span>{s.units} lifted</span></div>
          <div><b class="num">{fmtDur(week.reduce((a, x) => a + ((x.finishedAt || x.startedAt) - x.startedAt), 0))}</b><span>training</span></div>
        </div>
      </section>

      {act ? (
        <section class="card accent">
          <div class="card-head"><h2>{act.name}</h2><span class="badge">in progress</span></div>
          <p class="muted small">Started {fmtDate(act.startedAt, { hour: 'numeric', minute: '2-digit' })} · {countedSets(act)} sets done</p>
          <button class="btn primary block" onClick={() => setUI({ screen: { name: 'workout' } })}>Resume workout</button>
        </section>
      ) : next ? (
        <section class="card">
          <div class="card-head"><div><p class="eyebrow">{pt.fixed ? 'Today' : 'Up next'} · {plan.name}</p><h2>{next.name}</h2></div></div>
          <div class="list tight">
            {next.items.map((it) => { const ex = getExercise(it.exerciseId); return <div class="row"><span class="row-main"><b>{ex.name}</b></span><span class="num muted">{targetText(it, ex.kind)}</span></div>; })}
            {!next.items.length && <p class="empty">This day has no exercises yet. Add some in Plans.</p>}
          </div>
          <button class="btn primary block" onClick={() => startSession({ plan, day: next })}>Start {next.name}</button>
          {plan.days.length > 1 && <div class="chips">{plan.days.filter((d) => d.id !== next.id).map((d) => <button class="chip" onClick={() => startSession({ plan, day: d })}>Do {d.name} instead</button>)}</div>}
        </section>
      ) : pt ? (
        <section class="card">
          <div><p class="eyebrow">Today · {plan.name}</p><h2>{pt.doneToday ? 'Done for today' : 'Rest day'}</h2>
            {pt.next && <p class="muted small">Next up: {pt.next.day.name} on {fmtDate(pt.next.t, { weekday: 'long' })}.</p>}</div>
          <div class="chips">{plan.days.map((d) => <button class="chip" onClick={() => startSession({ plan, day: d })}>Do {d.name} anyway</button>)}</div>
        </section>
      ) : plan ? (
        <section class="card"><h2>{plan.name}</h2><p class="empty">This plan has no training days yet.</p><button class="btn" onClick={() => setUI({ screen: { name: 'plan', id: plan.id } })}>Edit plan</button></section>
      ) : (
        <>
          <section class="card">
            <div><p class="eyebrow">Start here</p><h2>Build a plan around you</h2><p class="muted small">Answer five questions and get a weekly plan matched to your goal, schedule and equipment. Everything can be edited afterwards.</p></div>
            <PlanBuilder />
          </section>
          <section class="card"><div><h2>Or pick a ready-made plan</h2></div><TemplateList /></section>
        </>
      )}

      {!act && <button class="btn block" onClick={() => startSession({})}>Start an empty workout</button>}

      {last && (
        <section class="card">
          <div class="card-head"><h2>Last workout</h2><span class="muted small">{fmtDate(last.startedAt)}</span></div>
          <button class="row" onClick={() => setUI({ screen: { name: 'session', id: last.id } })}>
            <span class="row-main"><b>{last.name}</b><small>{countedSets(last)} {countedSets(last) === 1 ? 'set' : 'sets'} · {fmtDur((last.finishedAt || last.startedAt) - last.startedAt)}</small></span>
            <span class="num">{fmt(sessionVolume(last, s.units), 0)} {s.units}</span>
          </button>
        </section>
      )}
    </>
  );
}
