// Today: the workout to do, the calories left, and the meals planned.
import { MEALS } from '../core/model.js';
import { activeTargets, totals } from '../core/nutrition.js';
import { doneSessions, estimateMinutes, nextInRotation, scheduledDay, sessionStats } from '../core/training.js';
import { slotMacros } from '../core/mealplan.js';
import { activePlan, activeSession, foodDay, state } from '../core/store.js';
import { getRecipe } from '../data/recipes.js';
import { GOALS } from '../core/model.js';
import { WEEKDAYS, addDays, conv, dayKey, fmtDay, fmtNum, weekStart } from '../core/util.js';
import { CalorieRing, Icon, MacroBars, MacroLine, openSheet } from '../ui/kit.jsx';
import { setNav } from '../ui/nav.js';
import { startWorkout } from './workout.jsx';
import { GoalsSheet, planWeekMeals } from './goals.jsx';
import { RecipeSheet, logSlot } from './meals.jsx';
import { WeightLogger } from './progress.jsx';

function WorkoutCard() {
  const today = dayKey();
  const plan = activePlan();
  const live = activeSession();
  const done = doneSessions(state.sessions);
  const doneToday = done.filter((s) => dayKey(new Date(s.startedAt)) === today).pop();
  if (live) {
    return (
      <section class="card hero-card">
        <p class="label">Workout in progress</p>
        <h2>{live.name}</h2>
        <button class="btn btn-primary btn-lg block" onClick={() => startWorkout()}><Icon name="play" size={18} /> Resume</button>
      </section>
    );
  }
  if (doneToday) {
    const st = sessionStats(doneToday);
    return (
      <section class="card hero-card done">
        <p class="label"><Icon name="check" size={14} /> Trained today</p>
        <h2>{doneToday.name}</h2>
        <p class="muted">{st.sets} sets · {st.volume.toLocaleString()} {doneToday.unit} lifted. Eat to your targets and sleep.</p>
      </section>
    );
  }
  if (!plan || !plan.days.length) {
    return <section class="card hero-card"><p class="label">Training</p><h2>No plan yet</h2><button class="btn btn-primary block" onClick={() => setNav({ tab: 'train' })}>Go to Train</button></section>;
  }
  const sched = scheduledDay(plan, today);
  const next = nextInRotation(plan, state.sessions);
  const day = sched || next;
  return (
    <section class="card hero-card">
      <p class="label">{sched ? "Today's workout" : 'Rest day'}</p>
      <h2>{sched ? day.name : 'Recover, eat, sleep'}</h2>
      {sched ? (
        <>
          <p class="muted">{day.focus} · {day.items.length} exercises · about {estimateMinutes(day)} min</p>
          <button class="btn btn-primary btn-lg block" onClick={() => startWorkout(plan, day)}><Icon name="play" size={18} /> Start workout</button>
        </>
      ) : (
        <>
          <p class="muted">Nothing is scheduled today. Next up is {day.name}.</p>
          <button class="btn block" onClick={() => startWorkout(plan, day)}>Train anyway: {day.name}</button>
        </>
      )}
    </section>
  );
}

function WeekStrip() {
  const today = dayKey();
  const plan = activePlan();
  const start = weekStart(today);
  const done = doneSessions(state.sessions);
  return (
    <ol class="week" aria-label="This week">
      {WEEKDAYS.map((name, i) => {
        const k = addDays(start, i);
        const trained = done.some((s) => dayKey(new Date(s.startedAt)) === k);
        const sched = plan && scheduledDay(plan, k);
        const cls = trained ? 'trained' : sched ? (k < today ? 'missed' : 'planned') : 'rest';
        const word = trained ? 'trained' : sched ? (k < today ? `missed ${sched.name}` : sched.name) : 'rest';
        return (
          <li class={`${cls} ${k === today ? 'now' : ''}`} aria-label={`${name}: ${word}`}>
            <span>{name}</span>
            <i>{trained ? <Icon name="check" size={14} /> : null}</i>
          </li>
        );
      })}
    </ol>
  );
}

export function TodayView() {
  const today = dayKey();
  const s = state.settings;
  const targets = activeTargets(s);
  const eaten = totals(foodDay(today).items);
  const plan = state.mealplan.days[today];
  const goal = GOALS.find((g) => g.id === (s.profile || {}).goal);
  const latest = state.body[state.body.length - 1];
  return (
    <>
      <header class="page-head">
        <div><p class="eyebrow">{fmtDay(today)}{goal ? ` · ${goal.name}` : ''}</p><h1>Today</h1></div>
        <button class="icon-btn" onClick={() => openSheet(() => <GoalsSheet />)} aria-label="Goals and settings"><Icon name="gear" /></button>
      </header>

      <WorkoutCard />
      <WeekStrip />

      <section class="card fuel">
        <CalorieRing eaten={eaten.kcal} target={targets.kcal} />
        <div class="grow">
          <p class="fuel-line"><b>{eaten.kcal}</b> eaten of <b>{targets.kcal}</b> kcal</p>
          <MacroBars totals={eaten} targets={targets} />
          <button class="btn btn-sm mt-3" onClick={() => setNav({ tab: 'food', foodDay: today })}><Icon name="plus" size={16} /> Log food</button>
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2 class="section-title">Meals planned today</h2>
          <button class="btn btn-quiet btn-sm" onClick={() => setNav({ tab: 'meals', mealsView: 'plan' })}>Full plan</button>
        </div>
        {plan && plan.slots.length ? (
          <ul class="today-meals">
            {plan.slots.map((slot) => {
              const r = getRecipe(slot.recipeId);
              if (!r) return null;
              return (
                <li key={slot.id} class={slot.logged ? 'logged' : ''}>
                  <button class="today-meal" onClick={() => openSheet(() => <RecipeSheet recipe={r} slot={slot} dayKey={today} />)}>
                    <span class="label">{(MEALS.find((m) => m.id === slot.meal) || {}).name.replace(/s$/, '')}</span>
                    <strong>{r.name}</strong>
                    <MacroLine m={slotMacros(slot)} />
                  </button>
                  {slot.logged ? <span class="pill pill-done"><Icon name="check" size={14} /> Logged</span> : <button class="btn btn-sm" onClick={() => logSlot(today, slot)}>Log</button>}
                </li>
              );
            })}
          </ul>
        ) : (
          <div class="card">
            <p class="muted">No meals planned for today.</p>
            <button class="btn block mt-3" onClick={() => planWeekMeals(today)}>Plan the next 7 days</button>
          </div>
        )}
      </section>

      <section class="card">
        <header class="card-head">
          <h2>Bodyweight</h2>
          {latest && <span class="muted">Last: {fmtNum(conv(latest.kg, 'kg', s.units))} {s.units}{latest.date === today ? ', today' : ''}</span>}
        </header>
        <WeightLogger compact />
      </section>
    </>
  );
}
