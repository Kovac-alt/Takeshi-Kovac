import { useState } from 'preact/hooks';
import { state, settings, patchSettings, exportAll, importAll } from '../core/store.js';
import { ACTIVITY_IDS } from '../core/model.js';
import { saveFile, readFileText } from '../core/platform.js';
import { toast } from '../core/actions.js';
import { estimateTargets, dayKey } from '../core/stats.js';
import { NumField, ScreenHead, Field } from '../ui.jsx';

const ACTIVITY = { sedentary: 'Mostly sitting', light: 'Lightly active', moderate: 'Training 3–5 days', active: 'Training most days', very_active: 'Physical job plus training' };

function Estimator({ onUse }) {
  const prev = settings().nutrition.body || {};
  const [b, setB] = useState({ sex: prev.sex || 'male', age: prev.age || null, heightCm: prev.heightCm || null, weightKg: prev.weightKg || null, activity: prev.activity || 'moderate', goal: 'maintain' });
  const set = (p) => setB({ ...b, ...p });
  const ok = b.age && b.heightCm && b.weightKg, est = ok ? estimateTargets(b) : null;
  return (
    <div class="subcard">
      <h3>Estimate targets for me</h3>
      <div class="grid2">
        <Field label="Sex"><select id="est-sex" value={b.sex} onChange={(e) => set({ sex: e.target.value })}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
        <Field label="Age"><NumField id="est-age" decimal={false} value={b.age} onChange={(v) => set({ age: v })} /></Field>
        <Field label="Height (cm)"><NumField id="est-height" value={b.heightCm} onChange={(v) => set({ heightCm: v })} /></Field>
        <Field label="Weight (kg)"><NumField id="est-weight" value={b.weightKg} onChange={(v) => set({ weightKg: v })} /></Field>
        <Field label="Activity"><select id="est-activity" value={b.activity} onChange={(e) => set({ activity: e.target.value })}>{ACTIVITY_IDS.map((a) => <option value={a}>{ACTIVITY[a]}</option>)}</select></Field>
        <Field label="Goal"><select id="est-goal" value={b.goal} onChange={(e) => set({ goal: e.target.value })}><option value="lose">Lose fat</option><option value="maintain">Maintain</option><option value="gain">Build muscle</option></select></Field>
      </div>
      {est ? <p class="small">About <b class="num">{est.kcal}</b> kcal a day: <span class="num">{est.protein}</span> g protein, <span class="num">{est.carbs}</span> g carbs, <span class="num">{est.fat}</span> g fat. This is a starting estimate, not medical advice.</p> : <p class="muted small">Fill in age, height and weight to see an estimate.</p>}
      <button class="btn sm" disabled={!est} onClick={() => onUse(est, { sex: b.sex, age: b.age, heightCm: b.heightCm, weightKg: b.weightKg, activity: b.activity })}>Use these targets</button>
    </div>
  );
}
const Toggle = ({ id, label, value, onChange }) => <label class="checkline"><input id={id} type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}</label>;

export function Settings() {
  const s = settings(), n = s.nutrition;
  const [backupText, setBackupText] = useState(null);
  const setN = (p) => patchSettings({ nutrition: { ...n, ...p } });
  const doExport = async () => {
    const text = exportAll(), filename = `lift-ledger-${dayKey()}.json`;
    try {
      const file = typeof File === 'function' ? new File([text], filename, { type: 'application/json' }) : null;
      if (file && window.self === window.top && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch (e) { /* closed */ } return; }
    } catch (e) { /* fall through */ }
    const r = await saveFile({ filename, text, mime: 'application/json' });
    if (r === 'saved') toast('Backup saved.'); else if (r === 'unavailable') setBackupText(text);
  };
  const doImport = async (file) => {
    try { importAll(JSON.parse(await readFileText(file))); toast('Backup restored.'); } catch (e) { toast(e instanceof SyntaxError ? 'That file is not a Lift Ledger backup.' : e.message); }
  };
  return (
    <>
      <ScreenHead title="Settings" />
      <section class="card">
        <h2>Training</h2>
        <div class="grid2">
          <Field label="Weight unit"><select id="set-units" value={s.units} onChange={(e) => patchSettings({ units: e.target.value })}><option value="kg">Kilograms</option><option value="lb">Pounds</option></select></Field>
          <Field label="Default rest (seconds)"><NumField id="set-rest" decimal={false} value={s.restSec} onChange={(v) => patchSettings({ restSec: v || 0 })} /></Field>
        </div>
        <p class="muted small">Changing the unit affects new workouts. Past workouts keep the unit they were logged in.</p>
        <Toggle id="set-autorest" label="Start the rest timer when I tick off a set" value={s.autoRest} onChange={(v) => patchSettings({ autoRest: v })} />
        <Toggle id="set-sound" label="Beep when rest is over" value={s.sound} onChange={(v) => patchSettings({ sound: v })} />
        <Toggle id="set-vibrate" label="Vibrate when rest is over (not available on iPhone)" value={s.vibrate} onChange={(v) => patchSettings({ vibrate: v })} />
        <Toggle id="set-awake" label="Keep the screen on during a workout" value={s.keepAwake} onChange={(v) => patchSettings({ keepAwake: v })} />
        <Field label="Week starts on"><select id="set-week" value={String(s.weekStart)} onChange={(e) => patchSettings({ weekStart: Number(e.target.value) })}><option value="1">Monday</option><option value="0">Sunday</option></select></Field>
      </section>
      <section class="card">
        <div><h2>Daily food targets</h2><p class="muted small">Leave a box empty for no target.</p></div>
        <div class="grid4">
          <Field label="Calories"><NumField id="set-kcal" decimal={false} value={n.kcal} onChange={(v) => setN({ kcal: v || null })} /></Field>
          <Field label="Protein g"><NumField id="set-protein" decimal={false} value={n.protein} onChange={(v) => setN({ protein: v || null })} /></Field>
          <Field label="Carbs g"><NumField id="set-carbs" decimal={false} value={n.carbs} onChange={(v) => setN({ carbs: v || null })} /></Field>
          <Field label="Fat g"><NumField id="set-fat" decimal={false} value={n.fat} onChange={(v) => setN({ fat: v || null })} /></Field>
        </div>
        <Estimator onUse={(est, body) => { setN({ ...est, body }); toast('Targets updated.'); }} />
      </section>
      <section class="card">
        <h2>Backup</h2>
        <p class="muted small">{state.mode === 'cloud' ? 'Your log is saved to your Claude account in a space only you can read.' : 'Your log is stored on this device only. Save a backup now and then, and before removing the app from your home screen.'}</p>
        <div class="actions"><button class="btn" onClick={doExport}>Save a backup file</button><label class="btn" for="set-import">Restore from backup…</label><input id="set-import" type="file" accept=".json,application/json" hidden onChange={(e) => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ''; }} /></div>
        <p class="muted small">Restoring replaces everything in the app with the file’s contents.</p>
        {backupText !== null && <Field label="Saving files is not available here. Copy this text and keep it somewhere safe."><textarea id="set-backup-text" rows="5" readonly value={backupText} onFocus={(e) => e.target.select()} /></Field>}
      </section>
    </>
  );
}
