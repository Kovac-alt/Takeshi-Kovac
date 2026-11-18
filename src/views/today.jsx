import { state, setUI, settings, put, patchSettings } from '../core/store.js';
import { activeSession, startSession, nextDayIndex, targetText, toast } from '../core/actions.js';
import { TEMPLATES, planFromTemplate } from '../core/templates.js';
import { getExercise } from '../core/exercises.js';
import { doneSessions, startOfWeek, sessionVolume, countedSets, fmt, fmtDate, fmtDur } from '../core/stats.js';

export function useTemplate(t) {
  const plan = planFromTemplate(t);
  put('plans', plan); patchSettings({ activePlanId: plan.id });
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

export function Today() {
  const s = settings(), act = activeSession(), plan = s.activePlanId ? state.plans[s.activePlanId] : null;
  const done = doneSessions(state.sessions), ws = startOfWeek(Date.now(), s.weekStart);
  const week = done.filter((x) => x.startedAt >= ws);
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); const t = d.getTime(); return { t, trained: week.some((x) => new Date(x.startedAt).setHours(0, 0, 0, 0) === t), today: t === todayStart }; });
  const ni = nextDayIndex(plan), next = plan && ni >= 0 ? plan.days[ni] : null;
  const vol = week.reduce((a, x) => a + sessionVolume(x, s.units), 0);
  const last = done[0];
  return (
    <>
      <section class="card">
        <div class="card-head"><h2>This week</h2><span class="muted small">{week.length} {week.length === 1 ? 'workout' : 'workouts'}</span></div>
        <div class="week" role="img" aria-label={`${week.length} workouts this week`}>
          {days.map((d) => <div class={`wd${d.trained ? ' on' : ''}${d.today ? ' today' : ''}`}><span>{fmtDate(d.t, { weekday: 'narrow' })}</span><i>{d.trained ? '✓' : ''}</i></div>)}
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
          <div class="card-head"><div><p class="eyebrow">Up next · {plan.name}</p><h2>{next.name}</h2></div></div>
          <div class="list tight">
            {next.items.map((it) => { const ex = getExercise(it.exerciseId); return <div class="row"><span class="row-main"><b>{ex.name}</b></span><span class="num muted">{targetText(it, ex.kind)}</span></div>; })}
            {!next.items.length && <p class="empty">This day has no exercises yet. Add some in Plans.</p>}
          </div>
          <button class="btn primary block" onClick={() => startSession({ plan, day: next })}>Start {next.name}</button>
          {plan.days.length > 1 && <div class="chips">{plan.days.filter((d) => d.id !== next.id).map((d) => <button class="chip" onClick={() => startSession({ plan, day: d })}>Do {d.name} instead</button>)}</div>}
        </section>
      ) : plan ? (
        <section class="card"><h2>{plan.name}</h2><p class="empty">This plan has no training days yet.</p><button class="btn" onClick={() => setUI({ screen: { name: 'plan', id: plan.id } })}>Edit plan</button></section>
      ) : (
        <section class="card">
          <div><h2>Pick a plan to follow</h2><p class="muted small">Start from one of these and change anything later, or build your own in Plans.</p></div>
          <TemplateList />
        </section>
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
