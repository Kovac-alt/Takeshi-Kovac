// Goals: the one form everything else is worked out from. Shown full-screen the first
// time, and as a sheet from the gear button afterwards.
import { useState } from 'preact/hooks';
import { ACTIVITY, DEFAULT_PROFILE, DIETS, EXPERIENCE, GOALS, GYM_SETUPS, PACES, PRIORITIES } from '../core/model.js';
import { describeTarget, targetsFor } from '../core/nutrition.js';
import { generatePlan } from '../core/training.js';
import { planDays, refitDay } from '../core/mealplan.js';
import { activeTargets } from '../core/nutrition.js';
import { exportData, importData, resetAll, saveBody, saveMealplan, savePlans, saveSettings, state, syncStatus } from '../core/store.js';
import { readFileText, saveFile } from '../core/platform.js';
import { conv, dayKey, fmtNum } from '../core/util.js';
import { Field, Num, Seg, Sheet, Stepper, closeSheet, confirmAction, toast } from '../ui/kit.jsx';

const TRAINING_KEYS = ['daysPerWeek', 'experience', 'equipment', 'priority', 'goal'];

/** Log a bodyweight for a day, replacing any entry already there. */
export function logWeight(kg, date = dayKey()) {
  state.body = state.body.filter((b) => b.date !== date);
  state.body.push({ date, kg: Math.round(kg * 100) / 100 });
  state.body.sort((a, b) => (a.date < b.date ? -1 : 1));
  if (state.settings.profile && date >= state.body[state.body.length - 1].date) {
    state.settings.profile.weightKg = kg;
    saveSettings();
  }
  saveBody();
}

/** Plan the next 7 days of meals from today, keeping days that already have logged meals. */
export function planWeekMeals(fromKey = dayKey()) {
  const p = state.settings.profile || DEFAULT_PROFILE;
  const targets = activeTargets(state.settings);
  const days = planDays(targets, fromKey, 7, { diet: p.diet, snacks: p.snacks });
  for (const [k, d] of Object.entries(days)) {
    const old = state.mealplan.days[k];
    // A day already partly eaten keeps its meals; the ones left are resized to the target.
    if (old && old.slots.some((s) => s.logged)) { refitDay(old.slots, targets); continue; }
    state.mealplan.days[k] = d;
  }
  // Drop plans more than a month old so the document stays small.
  const cutoff = dayKey(new Date(Date.now() - 31 * 864e5));
  for (const k of Object.keys(state.mealplan.days)) if (k < cutoff) delete state.mealplan.days[k];
  state.mealplan.checked = {};
  saveMealplan();
}

function applyProfile(profile, { rebuildPlan, replanMeals, units, custom }) {
  const s = state.settings;
  s.profile = profile;
  s.units = units;
  s.onboarded = true;
  s.nutrition = custom ? { ...custom, custom: true } : { kcal: null, protein: null, carbs: null, fat: null, custom: false };
  if (rebuildPlan) {
    const plan = generatePlan(profile);
    state.plans = state.plans.filter((p) => p.source !== 'generated' || Object.values(state.sessions).some((x) => x.planId === p.id));
    state.plans.push(plan);
    s.activePlanId = plan.id;
    savePlans();
  }
  saveSettings();
  if (!state.body.length) logWeight(profile.weightKg);
  if (replanMeals) planWeekMeals();
}

export function GoalsForm({ onboarding = false }) {
  const s = state.settings;
  const [p, setP] = useState({ ...DEFAULT_PROFILE, ...(s.profile || {}) });
  const [units, setUnits] = useState(s.units);
  const [custom, setCustom] = useState(s.nutrition.custom ? { ...s.nutrition } : null);
  const set = (patch) => setP({ ...p, ...patch });
  const t = targetsFor(p);
  const shown = custom || t;
  const plan = generatePlan(p);
  const trainingChanged = !s.profile || TRAINING_KEYS.some((k) => s.profile[k] !== p[k]);
  const [rebuild, setRebuild] = useState(true);
  const lb = units === 'lb';
  const inches = p.heightCm / 2.54;

  const save = () => {
    if (!p.age || !p.heightCm || !p.weightKg) { toast('Fill in your age, height and weight first.'); return; }
    applyProfile(p, { rebuildPlan: onboarding || (trainingChanged && rebuild), replanMeals: true, units, custom });
    if (!onboarding) { closeSheet(); toast('Goals saved. Targets and meal plan updated.'); }
  };

  return (
    <form class="goals" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <section>
        <h3>Your goal</h3>
        <div class="goal-grid" role="radiogroup" aria-label="Goal">
          {GOALS.map((g) => (
            <button type="button" role="radio" aria-checked={p.goal === g.id} class={`goal-card ${p.goal === g.id ? 'on' : ''}`} onClick={() => set({ goal: g.id })}>
              <strong>{g.name}</strong>
              <span>{g.blurb}</span>
            </button>
          ))}
        </div>
        {(p.goal === 'bulk' || p.goal === 'cut') && (
          <Field label={p.goal === 'bulk' ? 'How fast to gain' : 'How fast to lose'}>
            <Seg id="g-pace" label="Pace" value={p.pace} options={PACES} onChange={(pace) => set({ pace })} />
          </Field>
        )}
      </section>

      <section>
        <h3>About you</h3>
        <div class="form-grid">
          <Field label="Units"><Seg id="g-units" label="Units" value={units} options={[{ id: 'kg', name: 'kg, cm' }, { id: 'lb', name: 'lb, ft' }]} onChange={setUnits} /></Field>
          <Field label="Sex" hint="Used for the calorie estimate"><Seg id="g-sex" label="Sex" value={p.sex} options={[{ id: 'male', name: 'Male' }, { id: 'female', name: 'Female' }]} onChange={(sex) => set({ sex })} /></Field>
          <Field label="Age" for="g-age"><Num id="g-age" value={p.age} digits={0} min={0} max={99} unit="years" onChange={(age) => set({ age: age || 0 })} /></Field>
          <Field label="Weight" for="g-weight">
            <Num id="g-weight" value={lb ? Math.round(conv(p.weightKg, 'kg', 'lb')) : p.weightKg} unit={units} onChange={(w) => set({ weightKg: w ? conv(w, units, 'kg') : 0 })} />
          </Field>
          {lb ? (
            <Field label="Height" for="g-ft">
              <div class="row gap-2">
                <Num id="g-ft" value={Math.floor(Math.round(inches) / 12)} digits={0} unit="ft" onChange={(ft) => set({ heightCm: ((ft || 0) * 12 + (Math.round(inches) % 12)) * 2.54 })} />
                <Num id="g-in" value={Math.round(inches) % 12} digits={0} max={11} unit="in" label="Inches" onChange={(inch) => set({ heightCm: (Math.floor(Math.round(inches) / 12) * 12 + (inch || 0)) * 2.54 })} />
              </div>
            </Field>
          ) : (
            <Field label="Height" for="g-height"><Num id="g-height" value={Math.round(p.heightCm)} digits={0} unit="cm" onChange={(h) => set({ heightCm: h || 0 })} /></Field>
          )}
          <Field label="Outside the gym" for="g-activity">
            <select id="g-activity" value={p.activity} onChange={(e) => set({ activity: e.target.value })}>
              {ACTIVITY.map((a) => <option value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h3>Training</h3>
        <div class="form-grid">
          <Field label="Days a week"><Stepper label="training days" value={p.daysPerWeek} min={2} max={6} onChange={(daysPerWeek) => set({ daysPerWeek })} /></Field>
          <Field label="Where you train" for="g-equipment">
            <select id="g-equipment" value={p.equipment} onChange={(e) => set({ equipment: e.target.value })}>
              {GYM_SETUPS.map((a) => <option value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Lifting experience"><Seg id="g-exp" label="Experience" value={p.experience} options={EXPERIENCE} onChange={(experience) => set({ experience })} /></Field>
        <Field label="Bring up" hint="The plan adds sets for the area you pick">
          <div class="chips" role="radiogroup" aria-label="Priority muscle group">
            {PRIORITIES.map((x) => (
              <button type="button" role="radio" aria-checked={p.priority === x.id} class={`chip ${p.priority === x.id ? 'on' : ''}`} onClick={() => set({ priority: x.id })}>{x.name}</button>
            ))}
          </div>
        </Field>
      </section>

      <section>
        <h3>Food</h3>
        <Field label="You eat"><Seg id="g-diet" label="Diet" value={p.diet} options={DIETS} onChange={(diet) => set({ diet })} /></Field>
        <Field label="Snacks a day in the meal plan">
          <Seg id="g-snacks" label="Snacks" value={String(p.snacks)} options={[{ id: '0', name: 'None' }, { id: '1', name: 'One' }, { id: '2', name: 'Two' }]} onChange={(n) => set({ snacks: +n })} />
        </Field>
      </section>

      <section class="preview" aria-live="polite">
        <h3>Your plan</h3>
        <div class="preview-nums">
          <div><b>{shown.kcal}</b><span>kcal a day</span></div>
          <div><b>{shown.protein}</b><span>g protein</span></div>
          <div><b>{shown.carbs}</b><span>g carbs</span></div>
          <div><b>{shown.fat}</b><span>g fat</span></div>
        </div>
        <p>{custom ? `Your own targets. The estimate for your goal is ${t.kcal} kcal.` : `Maintenance is about ${t.maintenance} kcal. ${describeTarget(p, t)}`}</p>
        <p><strong>{plan.name}.</strong> {plan.description}</p>
        {custom ? (
          <div class="form-grid four">
            {['kcal', 'protein', 'carbs', 'fat'].map((k) => (
              <Field label={k === 'kcal' ? 'Calories' : k[0].toUpperCase() + k.slice(1)} for={`g-c-${k}`}>
                <Num id={`g-c-${k}`} digits={0} value={custom[k]} onChange={(v) => setCustom({ ...custom, [k]: v || 0 })} />
              </Field>
            ))}
            <button type="button" class="btn btn-quiet span-all" onClick={() => setCustom(null)}>Use the estimate instead</button>
          </div>
        ) : (
          <button type="button" class="btn btn-quiet" onClick={() => setCustom({ kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat })}>Set my own targets</button>
        )}
        {!onboarding && trainingChanged && (
          <label class="check"><input id="g-rebuild" type="checkbox" checked={rebuild} onChange={(e) => setRebuild(e.target.checked)} /> Build a new training plan for these answers</label>
        )}
      </section>

      <div class="goals-foot">
        <button type="submit" class="btn btn-primary btn-lg grow">{onboarding ? 'Build my plan' : 'Save goals'}</button>
      </div>
    </form>
  );
}

function DataTools() {
  const [text, setText] = useState(null);
  const doExport = async () => {
    const data = exportData();
    const res = await saveFile({ filename: `lift-ledger-${dayKey()}.json`, text: data, mime: 'application/json' });
    if (res === 'saved') toast('Backup saved.');
    else if (res === 'unavailable') setText(data);
  };
  const doImport = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await readFileText(file);
      confirmAction({
        title: 'Restore this backup?', body: 'Everything in the app now is replaced with what is in the file.', action: 'Restore',
        onConfirm: () => { try { importData(data); toast('Backup restored.'); } catch (err) { toast(err.message); } },
      });
    } catch (err) { toast(err.message); }
  };
  return (
    <section>
      <h3>Your data</h3>
      <p class="muted">
        {syncStatus === 'synced' ? 'Saved to your Claude account and on this device.' : syncStatus === 'offline' ? 'Saved on this device. It will sync to your Claude account when the connection is back.' : 'Saved on this device only.'}
      </p>
      <div class="row gap-2 wrap">
        <button type="button" class="btn" onClick={doExport}>Save a backup</button>
        <label class="btn">Restore a backup<input id="g-import" type="file" accept=".json,application/json" hidden onChange={doImport} /></label>
        <button type="button" class="btn btn-danger-quiet" onClick={() => confirmAction({
          title: 'Erase everything?', body: 'Your workouts, food log, weights, plans and goals are deleted. This cannot be undone.', action: 'Erase everything',
          onConfirm: () => { resetAll(); toast('Everything erased.'); },
        })}>Erase everything</button>
      </div>
      {text && (
        <div class="mt-4">
          <p class="muted">This view cannot save files. Copy the text below and keep it somewhere safe.</p>
          <textarea id="g-backup-text" readOnly rows={5} value={text} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </section>
  );
}

export function GoalsSheet() {
  return (
    <Sheet title="Goals and settings" tall>
      <GoalsForm />
      <DataTools />
    </Sheet>
  );
}

export function Onboarding() {
  return (
    <main class="onboard">
      <header>
        <p class="eyebrow">Lift Ledger</p>
        <h1>Set your goal. Get your training, calories and meals.</h1>
        <p class="muted">The answers below are a starting point filled in for you. Change them to match you and the plan updates as you go. You can edit all of it later.</p>
      </header>
      <GoalsForm onboarding />
    </main>
  );
}

export const fmtKg = (kg, units) => `${fmtNum(conv(kg, 'kg', units))} ${units}`;
