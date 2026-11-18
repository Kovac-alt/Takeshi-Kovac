import { useState } from 'preact/hooks';
import { state, setUI, settings, put, remove, patchSettings } from '../core/store.js';
import { newPlan, newPlanDay, newPlanItem } from '../core/model.js';
import { defaultTarget, toast } from '../core/actions.js';
import { getExercise } from '../core/exercises.js';
import { NumField, ConfirmButton, ScreenHead, ExercisePicker, Field } from '../ui.jsx';
import { TemplateList } from './today.jsx';

export function Plans() {
  const s = settings(), plans = Object.values(state.plans).sort((a, b) => (b.id === s.activePlanId) - (a.id === s.activePlanId) || b.updatedAt - a.updatedAt);
  return (
    <>
      <section class="card">
        <div class="card-head"><h2>Your plans</h2><button class="btn sm" onClick={() => { const p = newPlan({ name: 'My plan', days: [newPlanDay('Day 1')] }); put('plans', p); if (!s.activePlanId) patchSettings({ activePlanId: p.id }); setUI({ screen: { name: 'plan', id: p.id } }); }}>New plan</button></div>
        <div class="list">
          {plans.map((p) => (
            <div class="row">
              <button class="row-main as-btn" onClick={() => setUI({ screen: { name: 'plan', id: p.id } })}><b>{p.name}</b><small>{p.days.length} {p.days.length === 1 ? 'day' : 'days'}: {p.days.map((d) => d.name).join(' · ')}</small></button>
              {p.id === s.activePlanId ? <span class="badge green">active</span> : <button class="btn sm" onClick={() => { patchSettings({ activePlanId: p.id }); toast(`${p.name} is now your active plan.`); }}>Make active</button>}
            </div>
          ))}
          {!plans.length && <p class="empty">No plans yet. Use a template below or start a new one.</p>}
        </div>
      </section>
      <section class="card"><div><h2>Templates</h2><p class="muted small">Each one is copied into your plans, so you can change it freely.</p></div><TemplateList /></section>
    </>
  );
}

export function PlanEditor({ id }) {
  const plan = state.plans[id], s = settings();
  const [pickFor, setPickFor] = useState(null);
  if (!plan) return <><ScreenHead title="Plan" /><p class="empty">This plan no longer exists.</p></>;
  const save = () => put('plans', plan);
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; save(); };
  return (
    <>
      <ScreenHead title="Edit plan" />
      <section class="card">
        <Field label="Plan name"><input id="plan-name" type="text" maxlength="60" value={plan.name} onInput={(e) => { plan.name = e.target.value; save(); }} /></Field>
        {plan.id === s.activePlanId ? <p class="muted small">This is your active plan. Today suggests its days in order.</p>
          : <button class="btn sm" onClick={() => patchSettings({ activePlanId: plan.id })}>Make this my active plan</button>}
      </section>
      {plan.days.map((day, di) => (
        <section class="card" key={day.id}>
          <div class="card-head">
            <input id={`day-${day.id}`} class="title-in" type="text" maxlength="40" aria-label="Day name" value={day.name} onInput={(e) => { day.name = e.target.value; save(); }} />
            <div class="actions"><button class="btn sm ghost" aria-label="Move day up" disabled={di === 0} onClick={() => move(plan.days, di, -1)}>↑</button><button class="btn sm ghost" aria-label="Move day down" disabled={di === plan.days.length - 1} onClick={() => move(plan.days, di, 1)}>↓</button></div>
          </div>
          {day.items.map((it, ii) => { const ex = getExercise(it.exerciseId), unit = ex.kind === 'cardio' ? 'min' : ex.kind === 'timed' ? 'sec' : 'reps'; return (
            <div class="plan-item" key={it.id}>
              <div class="plan-item-head"><b>{ex.name}</b>
                <div class="actions"><button class="btn sm ghost" aria-label="Move up" disabled={ii === 0} onClick={() => move(day.items, ii, -1)}>↑</button><button class="btn sm ghost" aria-label="Move down" disabled={ii === day.items.length - 1} onClick={() => move(day.items, ii, 1)}>↓</button>
                  <button class="btn sm ghost" aria-label={`Remove ${ex.name}`} onClick={() => { day.items.splice(ii, 1); save(); }}>✕</button></div></div>
              <div class="plan-nums">
                <Field label="Sets"><NumField id={`s-${it.id}`} decimal={false} value={it.sets} onChange={(v) => { it.sets = Math.max(1, Math.min(12, v || 1)); save(); }} /></Field>
                <Field label={`Min ${unit}`}><NumField id={`a-${it.id}`} decimal={false} value={it.repMin} onChange={(v) => { it.repMin = v || 1; if (it.repMax < it.repMin) it.repMax = it.repMin; save(); }} /></Field>
                <Field label={`Max ${unit}`}><NumField id={`b-${it.id}`} decimal={false} value={it.repMax} onChange={(v) => { it.repMax = Math.max(v || 1, 1); save(); }} /></Field>
                <Field label="Rest sec"><NumField id={`r-${it.id}`} decimal={false} value={it.restSec} onChange={(v) => { it.restSec = v || 0; save(); }} /></Field>
              </div>
            </div>
          ); })}
          {!day.items.length && <p class="empty">No exercises in this day yet.</p>}
          <div class="actions"><button class="btn sm" onClick={() => setPickFor(day.id)}>+ Add exercise</button><span class="grow" />
            <ConfirmButton label="Delete day" confirm="Tap again to delete" class="btn sm ghost" onConfirm={() => { plan.days.splice(di, 1); save(); }} /></div>
        </section>
      ))}
      <button class="btn block" onClick={() => { plan.days.push(newPlanDay(`Day ${plan.days.length + 1}`)); save(); }}>+ Add a day</button>
      <div class="actions end"><ConfirmButton label="Delete plan" confirm="Tap again to delete the plan" onConfirm={() => { if (s.activePlanId === plan.id) patchSettings({ activePlanId: null }); remove('plans', plan.id); setUI({ screen: null }); toast('Plan deleted. Past workouts are kept.'); }} /></div>
      {pickFor && <ExercisePicker onClose={() => setPickFor(null)} onPick={(ex) => { const day = plan.days.find((d) => d.id === pickFor); if (day) { day.items.push(newPlanItem(ex.id, defaultTarget(ex, s.restSec))); save(); } setPickFor(null); }} />}
    </>
  );
}
