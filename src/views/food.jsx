import { useState } from 'preact/hooks';
import { state, settings, put, setKV, setUI } from '../core/store.js';
import { MEALS, newFoodItem, newFoodDay, newOwnFood } from '../core/model.js';
import { toast } from '../core/actions.js';
import { dayKey, fromDayKey, fmt, fmtDate } from '../core/stats.js';
import { FOODS, findFood, searchFoods, scaleFood } from '../core/foods.js';
import { NumField, Sheet, Field, Meter, ConfirmButton } from '../ui.jsx';

const MACROS = [['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fat']];
const shift = (key, n) => { const d = fromDayKey(key); d.setDate(d.getDate() + n); return dayKey(d); };

/** Foods to offer for one-tap logging: saved ones first, then recent entries. */
function suggestions(q) {
  const out = [], seen = new Set(), needle = q.trim().toLowerCase();
  const add = (f) => { const k = f.name.trim().toLowerCase(); if (!k || seen.has(k) || (needle && !k.includes(needle))) return; seen.add(k); out.push(f); };
  for (const f of (state.kv.foods.foods || [])) add({ name: f.name, amount: (f.servings[0] || {}).label || '', ...f.perServing, saved: true });
  const days = Object.keys(state.food).sort().reverse().slice(0, 45);
  for (const k of days) for (const it of [...state.food[k].items].reverse()) add({ name: it.name, amount: it.amount, kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat });
  return out.slice(0, 8);
}

function FoodSheet({ day, meal, item, onClose }) {
  const [f, setF] = useState(item ? { ...item } : { name: '', amount: '', kcal: null, protein: null, carbs: null, fat: null, meal, grams: null, foodId: null });
  const [keep, setKeep] = useState(false);
  const set = (p) => setF({ ...f, ...p });
  const food = f.foodId ? findFood(f.foodId) : null, known = food && food.per100 ? food : null, unit = known && known.liquid ? 'ml' : 'g';
  const weigh = (grams, label) => (known && grams ? { grams, amount: label || `${fmt(grams)} ${unit}`, ...scaleFood(known, grams) } : { grams });
  const choose = (x) => { const sv = x.servings[0] || { grams: 100 }, g = sv.grams || 100; setF({ ...f, name: x.name, foodId: x.id, grams: g, amount: sv.label ? `${sv.label} (${fmt(g)} ${x.liquid ? 'ml' : 'g'})` : `${fmt(g)} g`, ...scaleFood(x, g) }); };
  const getDay = () => state.food[day] || newFoodDay(day);
  const save = () => {
    const name = f.name.trim(); if (!name || f.kcal == null) return;
    const d = getDay();
    if (item) Object.assign(d.items.find((x) => x.id === item.id) || {}, { ...f, name });
    else d.items.push(newFoodItem({ ...f, name }));
    put('food', d);
    if (keep) { const own = state.kv.foods.foods || []; if (!own.some((x) => x.name.toLowerCase() === name.toLowerCase())) setKV('foods', { ...state.kv.foods, foods: [...own, newOwnFood({ name, serving: f.amount || '1 serving', kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat })] }); }
    onClose();
  };
  const sug = item || known ? [] : suggestions(f.name), found = item || known ? [] : searchFoods(f.name);
  return (
    <Sheet title={item ? 'Edit food' : 'Add food'} onClose={onClose}>
      <Field label="What did you eat?"><input id="food-name" type="text" maxlength="80" autocomplete="off" placeholder="Search foods, or type your own" value={f.name} onInput={(e) => set({ name: e.target.value, foodId: known ? null : f.foodId })} /></Field>
      {sug.length > 0 && <div class="chips">{sug.map((x) => <button class="chip" onClick={() => setF({ ...f, name: x.name, amount: x.amount || '', kcal: x.kcal, protein: x.protein, carbs: x.carbs, fat: x.fat, foodId: null, grams: null })}>{x.saved ? '★ ' : ''}{x.name} · {fmt(x.kcal, 0)}</button>)}</div>}
      {found.length > 0 && <div class="list tight food-hits">{found.map((x) => <button class="row" onClick={() => choose(x)}><span class="row-main"><b>{x.name}</b><small>{x.servings[0].label}, {fmt(x.servings[0].grams)} {x.liquid ? 'ml' : 'g'}</small></span><span class="num muted">{fmt(x.per100.kcal * x.servings[0].grams / 100, 0)} kcal</span></button>)}</div>}
      {!item && !known && !f.name.trim() && <p class="muted small">Type to search {FOODS.length} common foods, or enter anything with its calories yourself.</p>}
      {known ? (
        <div class="subcard">
          <p class="small"><span class="muted">Per 100 {unit}:</span> <b class="num">{fmt(known.per100.kcal, 0)}</b> kcal · {fmt(known.per100.protein)} g protein · {fmt(known.per100.carbs)} g carbs · {fmt(known.per100.fat)} g fat <span class="muted">(typical values)</span></p>
          <div class="grid2">
            <Field label={`How much (${unit})`}><NumField id="food-grams" value={f.grams} onChange={(v) => set(weigh(v))} /></Field>
            <Field label="Meal"><select id="food-meal" value={f.meal} onChange={(e) => set({ meal: e.target.value })}>{MEALS.map((m) => <option value={m.id}>{m.name}</option>)}</select></Field>
          </div>
          <div class="chips">{known.servings.filter((sv) => sv.grams).flatMap((sv) => [1, 2]).map((n, i) => { const sv = known.servings[Math.floor(i / 2)], g = sv.grams * n; return <button class="chip" aria-pressed={f.grams === g} onClick={() => set(weigh(g, `${n === 2 ? '2 × ' : ''}${sv.label} (${fmt(g)} ${unit})`))}>{n === 2 ? '2 × ' : ''}{sv.label}</button>; })}
            <button class="chip" aria-pressed={f.grams === 100} onClick={() => set(weigh(100))}>100 {unit}</button></div>
        </div>
      ) : (
        <div class="grid2">
          <Field label="Meal"><select id="food-meal" value={f.meal} onChange={(e) => set({ meal: e.target.value })}>{MEALS.map((m) => <option value={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Amount (optional)"><input id="food-amount" type="text" maxlength="40" placeholder="150 g, 1 bowl" value={f.amount} onInput={(e) => set({ amount: e.target.value })} /></Field>
        </div>
      )}
      <div class="grid4">
        <Field label="Calories"><NumField id="food-kcal" decimal={false} value={f.kcal} onChange={(v) => set({ kcal: v })} /></Field>
        {MACROS.map(([k, l]) => <Field label={`${l} g`}><NumField id={`food-${k}`} value={f[k]} onChange={(v) => set({ [k]: v })} /></Field>)}
      </div>
      {!item && !known && <label class="checkline"><input id="food-keep" type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Save to my foods for one-tap logging</label>}
      <div class="actions">
        {item && <ConfirmButton label="Delete" confirm="Tap again to delete" onConfirm={() => { const d = getDay(); d.items = d.items.filter((x) => x.id !== item.id); put('food', d); onClose(); }} />}
        <span class="grow" /><button class="btn primary" disabled={!f.name.trim() || f.kcal == null} onClick={save}>{item ? 'Save' : 'Add'}</button>
      </div>
    </Sheet>
  );
}

export function Food() {
  const [day, setDay] = useState(dayKey());
  const [sheet, setSheet] = useState(null);
  const today = dayKey(), d = state.food[day], items = d ? d.items : [], t = settings().nutrition;
  const tot = (k) => items.reduce((a, x) => a + (x[k] || 0), 0);
  const kcal = tot('kcal');
  return (
    <>
      <div class="daynav">
        <button class="btn" aria-label="Previous day" onClick={() => setDay(shift(day, -1))}>‹</button>
        <h2>{day === today ? 'Today' : day === shift(today, -1) ? 'Yesterday' : fmtDate(fromDayKey(day).getTime())}</h2>
        <button class="btn" aria-label="Next day" disabled={day >= today} onClick={() => setDay(shift(day, 1))}>›</button>
      </div>
      <section class="card">
        <div class="card-head"><div><p class="eyebrow">Calories</p><p class="big num">{fmt(kcal, 0)}{t.kcal ? <span class="muted"> / {fmt(t.kcal, 0)}</span> : ''}</p></div>
          {t.kcal ? <span class={`badge ${kcal > t.kcal ? 'red' : 'green'}`}>{kcal > t.kcal ? `${fmt(kcal - t.kcal, 0)} over` : `${fmt(t.kcal - kcal, 0)} left`}</span> : <button class="btn sm" onClick={() => setUI({ screen: { name: 'settings' } })}>Set targets</button>}</div>
        {t.kcal ? <Meter value={kcal} max={t.kcal} tone={kcal > t.kcal ? 'red' : 'accent'} /> : null}
        <div class="macros">{MACROS.map(([k, l]) => <div><span>{l}</span><b class="num">{fmt(tot(k), 0)} g{t[k] ? <span class="muted"> / {fmt(t[k], 0)}</span> : ''}</b>{t[k] ? <Meter value={tot(k)} max={t[k]} tone="blue" /> : null}</div>)}</div>
      </section>
      {MEALS.map((m) => { const list = items.filter((x) => x.meal === m.id); return (
        <section class="card" key={m.id}>
          <div class="card-head"><h2>{m.name}</h2><span class="num muted">{list.length ? `${fmt(list.reduce((a, x) => a + x.kcal, 0), 0)} kcal` : ''}</span></div>
          {list.length > 0 && <div class="list tight">{list.map((x) => <button class="row" onClick={() => setSheet({ item: x, meal: m.id })}><span class="row-main"><b>{x.name}</b><small>{[x.amount, x.protein != null ? `${fmt(x.protein, 0)} g protein` : ''].filter(Boolean).join(' · ')}</small></span><span class="num">{fmt(x.kcal, 0)}</span></button>)}</div>}
          <button class="btn sm" onClick={() => setSheet({ meal: m.id })}>+ Add to {m.name.toLowerCase()}</button>
        </section>
      ); })}
      {sheet && <FoodSheet day={day} meal={sheet.meal} item={sheet.item} onClose={() => { setSheet(null); if (!sheet.item) toast('Logged.'); }} />}
    </>
  );
}
