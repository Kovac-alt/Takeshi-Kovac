// Train: the active plan, its days, and workout history.
import { useState } from 'preact/hooks';
import { KINDS, MUSCLES, customExerciseId, isCountedSet, newPlanDay, newPlanItem } from '../core/model.js';
import { alternatives, doneSessions, estimateMinutes, generatePlan, sessionStats } from '../core/training.js';
import { activePlan, activeSession, deleteSession, saveMine, savePlans, saveSettings, state } from '../core/store.js';
import { allExercises, customExercises, exById } from '../core/lookup.js';
import { WEEKDAYS, WEEKDAYS_LONG, dayKey, fmtDay, fmtDuration, fmtNum } from '../core/util.js';
import { Empty, Field, Icon, Num, Seg, Sheet, Stepper, closeSheet, confirmAction, openSheet, toast } from '../ui/kit.jsx';
import { startWorkout } from './workout.jsx';
import { GoalsSheet } from './goals.jsx';

const range = (it, ex) => {
  const u = ex.kind === 'timed' ? ' s' : ex.kind === 'cardio' ? ' min' : '';
  return `${it.sets} × ${it.repMin === it.repMax ? it.repMin : `${it.repMin}–${it.repMax}`}${u}`;
};

export function ExercisePicker({ title, onPick }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('all');
  const [creating, setCreating] = useState(null);
  const list = allExercises().filter((e) => (muscle === 'all' || e.muscle === muscle) && e.name.toLowerCase().includes(q.trim().toLowerCase()));
  if (creating) {
    const c = creating;
    const set = (patch) => setCreating({ ...c, ...patch });
    return (
      <Sheet title="New exercise" tall>
        <Field label="Name" for="ex-name"><input id="ex-name" type="text" value={c.name} onInput={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Main muscle" for="ex-muscle">
          <select id="ex-muscle" value={c.muscle} onChange={(e) => set({ muscle: e.target.value })}>{MUSCLES.map((m) => <option value={m.id}>{m.name}</option>)}<option value="cardio">Cardio</option></select>
        </Field>
        <Field label="Logged as">
          <Seg id="ex-kind" label="Logged as" value={c.kind} onChange={(kind) => set({ kind })} options={[{ id: 'weight', name: 'Weight × reps' }, { id: 'bodyweight', name: 'Reps' }, { id: 'timed', name: 'Seconds' }, { id: 'cardio', name: 'Minutes' }].filter((o) => KINDS.includes(o.id))} />
        </Field>
        <button class="btn btn-primary btn-lg block mt-4" disabled={!c.name.trim()} onClick={() => {
          const ex = { id: customExerciseId(c.name), name: c.name.trim(), muscle: c.muscle, secondary: [], equipment: 'other', kind: c.kind, pattern: 'other', compound: false, custom: true };
          state.mine.exercises = [...customExercises(), ex];
          saveMine();
          onPick(ex.id);
        }}>Add exercise</button>
      </Sheet>
    );
  }
  return (
    <Sheet title={title} tall>
      <div class="search"><Icon name="search" size={18} /><input id="ex-search" type="search" placeholder="Search exercises" value={q} onInput={(e) => setQ(e.target.value)} /></div>
      <div class="chips scroll-x">
        {[{ id: 'all', name: 'All' }, ...MUSCLES].map((m) => <button class={`chip ${muscle === m.id ? 'on' : ''}`} onClick={() => setMuscle(m.id)}>{m.name}</button>)}
      </div>
      <ul class="pick-list">
        {list.map((e) => <li><button onClick={() => onPick(e.id)}><strong>{e.name}</strong><span>{e.equipment.replace('_', ' ')} · {e.muscle}</span></button></li>)}
      </ul>
      <button class="btn block" onClick={() => setCreating({ name: q, muscle: muscle === 'all' ? 'chest' : muscle, kind: 'weight' })}><Icon name="plus" size={18} /> Create your own</button>
    </Sheet>
  );
}

function DayEditor({ plan, day }) {
  const save = () => { plan.updatedAt = Date.now(); savePlans(); };
  const wd = plan.schedule.weekdays || [];
  const current = wd.indexOf(day.id);
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= day.items.length) return; [day.items[i], day.items[j]] = [day.items[j], day.items[i]]; save(); };
  return (
    <Sheet title="Edit day" tall>
      <div class="form-grid">
        <Field label="Name" for="day-name"><input id="day-name" type="text" value={day.name} onInput={(e) => { day.name = e.target.value; save(); }} /></Field>
        <Field label="Trained on" for="day-weekday">
          <select id="day-weekday" value={current} onChange={(e) => {
            const v = +e.target.value;
            const next = wd.map((x) => (x === day.id ? null : x));
            while (next.length < 7) next.push(null);
            if (v >= 0) next[v] = day.id;
            plan.schedule.weekdays = next; save();
          }}>
            <option value={-1}>No fixed day</option>
            {WEEKDAYS_LONG.map((n, i) => <option value={i}>{n}{wd[i] && wd[i] !== day.id ? ` (replaces ${(plan.days.find((d) => d.id === wd[i]) || {}).name || 'a day'})` : ''}</option>)}
          </select>
        </Field>
      </div>
      <ul class="edit-items">
        {day.items.map((it, i) => {
          const ex = exById(it.exerciseId);
          return (
            <li key={it.id}>
              <div class="edit-item-head">
                <strong>{ex.name}</strong>
                <div class="row">
                  <button class="icon-btn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><Icon name="up" size={18} /></button>
                  <button class="icon-btn sm" onClick={() => move(i, 1)} disabled={i === day.items.length - 1} aria-label="Move down"><Icon name="down" size={18} /></button>
                  <button class="icon-btn sm" aria-label={`Swap ${ex.name}`} onClick={() => openSheet(() => (
                    <Sheet title={`Swap ${ex.name}`} tall>
                      <ul class="pick-list">
                        {alternatives(ex.id, (state.settings.profile || {}).equipment, customExercises()).map((a) => (
                          <li><button onClick={() => { it.exerciseId = a.id; save(); closeSheet(); }}><strong>{a.name}</strong><span>{a.equipment.replace('_', ' ')} · {a.muscle}</span></button></li>
                        ))}
                      </ul>
                    </Sheet>
                  ))}><Icon name="swap" size={18} /></button>
                  <button class="icon-btn sm" onClick={() => { day.items.splice(i, 1); save(); }} aria-label={`Remove ${ex.name}`}><Icon name="trash" size={18} /></button>
                </div>
              </div>
              <div class="edit-item-rx">
                <label>Sets<Stepper label="sets" value={it.sets} min={1} max={10} onChange={(v) => { it.sets = v; save(); }} /></label>
                <label>{ex.kind === 'timed' ? 'Seconds' : ex.kind === 'cardio' ? 'Minutes' : 'Reps'}
                  <span class="row gap-1">
                    <Num id={`it-${it.id}-min`} label="From" digits={0} value={it.repMin} onChange={(v) => { it.repMin = v || 1; if (it.repMax < it.repMin) it.repMax = it.repMin; save(); }} />
                    <span>to</span>
                    <Num id={`it-${it.id}-max`} label="To" digits={0} value={it.repMax} onChange={(v) => { it.repMax = Math.max(v || 1, it.repMin); save(); }} />
                  </span>
                </label>
                <label>Rest<Stepper label="rest" value={it.restSec} min={0} max={300} step={15} fmt={(v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`} onChange={(v) => { it.restSec = v; save(); }} /></label>
              </div>
            </li>
          );
        })}
      </ul>
      <button class="btn block" onClick={() => openSheet(() => <ExercisePicker title="Add exercise" onPick={(id) => { day.items.push(newPlanItem(id, { sets: 3, repMin: 8, repMax: 12, restSec: 90 })); save(); closeSheet(); }} />)}><Icon name="plus" size={18} /> Add exercise</button>
      <button class="btn btn-danger-quiet block mt-4" onClick={() => confirmAction({
        title: `Delete ${day.name}?`, body: 'The day is removed from your plan. Workouts you already logged stay in your history.', action: 'Delete day',
        onConfirm: () => { plan.days = plan.days.filter((d) => d !== day); plan.schedule.weekdays = wd.map((x) => (x === day.id ? null : x)); save(); closeSheet(); },
      })}>Delete this day</button>
    </Sheet>
  );
}

function SessionSheet({ session }) {
  const stats = sessionStats(session);
  return (
    <Sheet title={session.name} tall>
      <p class="muted">{fmtDay(dayKey(new Date(session.startedAt)))}{session.finishedAt ? ` · ${fmtDuration(session.finishedAt - session.startedAt)}` : ''} · {stats.sets} sets · {stats.volume.toLocaleString()} {session.unit}</p>
      {session.entries.map((e) => {
        const ex = exById(e.exerciseId);
        return (
          <div class="hist-entry">
            <strong>{ex.name}</strong>
            <span>{e.sets.filter(isCountedSet).map((s) => (ex.kind === 'timed' ? `${s.seconds} s` : ex.kind === 'cardio' ? `${s.minutes} min` : `${s.weight ? `${fmtNum(s.weight)} × ` : ''}${s.reps}`)).join(', ')}</span>
          </div>
        );
      })}
      <button class="btn btn-danger-quiet block mt-4" onClick={() => confirmAction({ title: 'Delete this workout?', body: 'It is removed from your history and your charts.', action: 'Delete workout', onConfirm: () => { deleteSession(session); closeSheet(); toast('Workout deleted.'); } })}>Delete workout</button>
    </Sheet>
  );
}

export function TrainView() {
  const plan = activePlan();
  const live = activeSession();
  const history = doneSessions(state.sessions).reverse();
  const [showAll, setShowAll] = useState(false);
  const wd = (plan && plan.schedule.weekdays) || [];
  return (
    <>
      <header class="page-head">
        <div><p class="eyebrow">Training plan</p><h1>{plan ? plan.name : 'Train'}</h1></div>
        <button class="icon-btn" onClick={() => openSheet(() => <GoalsSheet />)} aria-label="Goals and settings"><Icon name="gear" /></button>
      </header>
      {plan && plan.description && <p class="lede">{plan.description}</p>}
      {live && <button class="btn btn-primary btn-lg block" onClick={() => startWorkout()}><Icon name="play" size={18} /> Resume {live.name}</button>}

      {!plan && <Empty title="No plan yet">Build one from your goals and it shows up here.</Empty>}
      <div class="day-list">
        {plan && plan.days.map((day) => {
          const on = wd.map((id, i) => (id === day.id ? WEEKDAYS[i] : null)).filter(Boolean);
          return (
            <article class="card day-card" key={day.id}>
              <header>
                <div>
                  <h2>{day.name}</h2>
                  <p class="muted">{[on.join(', '), day.focus, `about ${estimateMinutes(day)} min`].filter(Boolean).join(' · ')}</p>
                </div>
                <button class="icon-btn" onClick={() => openSheet(() => <DayEditor plan={plan} day={day} />)} aria-label={`Edit ${day.name}`}><Icon name="edit" /></button>
              </header>
              <ol class="rx-list">
                {day.items.map((it) => { const ex = exById(it.exerciseId); return <li key={it.id}><span>{ex.name}</span><b>{range(it, ex)}</b></li>; })}
              </ol>
              {!live && <button class="btn block" onClick={() => startWorkout(plan, day)}><Icon name="play" size={16} /> Start {day.name}</button>}
            </article>
          );
        })}
      </div>

      <div class="row gap-2 wrap">
        {plan && <button class="btn" onClick={() => { plan.days.push(newPlanDay(`Day ${plan.days.length + 1}`)); plan.updatedAt = Date.now(); savePlans(); openSheet(() => <DayEditor plan={plan} day={plan.days[plan.days.length - 1]} />); }}><Icon name="plus" size={18} /> Add a day</button>}
        {!live && <button class="btn" onClick={() => startWorkout()}>Start an empty workout</button>}
        <button class="btn" onClick={() => confirmAction({
          title: 'Build a new plan?', body: 'A fresh plan is generated from your goals and replaces this one. Your logged workouts are kept.', action: 'Build new plan', danger: false,
          onConfirm: () => {
            const p = generatePlan(state.settings.profile);
            state.plans = state.plans.filter((x) => x.id !== state.settings.activePlanId).concat(p);
            state.settings.activePlanId = p.id; savePlans(); saveSettings(); toast('New plan built from your goals.');
          },
        })}><Icon name="shuffle" size={18} /> Rebuild from goals</button>
      </div>

      <section>
        <h2 class="section-title">History</h2>
        {!history.length && <Empty title="No workouts yet">Finish your first workout and it is listed here with every set.</Empty>}
        <ul class="hist-list">
          {(showAll ? history : history.slice(0, 8)).map((s) => {
            const st = sessionStats(s);
            return (
              <li key={s.id}><button onClick={() => openSheet(() => <SessionSheet session={s} />)}>
                <span><strong>{s.name}</strong><small>{fmtDay(dayKey(new Date(s.startedAt)))}</small></span>
                <span class="hist-nums">{st.sets} sets<small>{st.volume.toLocaleString()} {s.unit}</small></span>
              </button></li>
            );
          })}
        </ul>
        {history.length > 8 && !showAll && <button class="btn btn-quiet block" onClick={() => setShowAll(true)}>Show all {history.length} workouts</button>}
      </section>
    </>
  );
}
