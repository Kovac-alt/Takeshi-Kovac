// Food: the calorie and macro log for one day.
import { useState } from 'preact/hooks';
import { FOOD_CATEGORIES, MEALS, newFoodItem, newOwnFood } from '../core/model.js';
import { activeTargets, totals } from '../core/nutrition.js';
import { foodDay, saveFoodDay, saveMealplan, saveMine, state } from '../core/store.js';
import { allFoods, foodById } from '../core/lookup.js';
import { foodMacros } from '../data/foods.js';
import { RECIPES, getRecipe } from '../data/recipes.js';
import { addDays, dayKey, fmtNum, fmtRelDay } from '../core/util.js';
import { CalorieRing, Empty, Field, Icon, MacroBars, MacroLine, Num, Seg, Sheet, Stepper, closeAllSheets, closeSheet, openSheet, toast } from '../ui/kit.jsx';
import { setNav, useNav } from '../ui/nav.js';

/** Meal to suggest for the time of day. */
export function mealNow() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
}

export function logItem(key, item) {
  const day = foodDay(key);
  day.items = [...day.items, item];
  saveFoodDay(day);
  if (item.foodId) {
    state.mine.recent = [item.foodId, ...(state.mine.recent || []).filter((id) => id !== item.foodId)].slice(0, 12);
    saveMine();
  }
}

/** Log a portion of a recipe. `slotId` ties it to a planned meal so the plan shows it as eaten. */
export function logRecipe(key, meal, recipe, mult, slotId = null) {
  const m = (k) => Math.round(recipe.per[k] * mult * 10) / 10;
  const item = newFoodItem({ name: recipe.name, meal, kcal: Math.round(recipe.per.kcal * mult), protein: m('protein'), carbs: m('carbs'), fat: m('fat'), amount: `${fmtNum(mult, 2)} portion${mult === 1 ? '' : 's'}` });
  item.recipeId = recipe.id;
  if (slotId) item.slotId = slotId;
  logItem(key, item);
}

function removeItem(key, item) {
  const day = foodDay(key);
  day.items = day.items.filter((i) => i.id !== item.id);
  saveFoodDay(day);
  if (item.slotId) {
    const plan = state.mealplan.days[key];
    const slot = plan && plan.slots.find((s) => s.id === item.slotId);
    if (slot) { slot.logged = false; saveMealplan(); }
  }
}

function AmountSheet({ food, dayKey: key, meal: meal0 }) {
  const s0 = food.servings[0];
  const hasGrams = !!food.per100;
  const [grams, setGrams] = useState(hasGrams ? (s0 && s0.grams) || 100 : null);
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState(meal0);
  const unit = food.liquid ? 'ml' : 'g';
  const m = hasGrams ? foodMacros(food, { grams: grams || 0 }) : foodMacros(food, { servings });
  const add = () => {
    logItem(key, newFoodItem({ name: food.name, meal, ...m, amount: hasGrams ? `${fmtNum(grams)} ${unit}` : `${fmtNum(servings, 2)} × ${s0 ? s0.label : 'serving'}`, grams: hasGrams ? grams : null, foodId: food.id }));
    closeAllSheets();
    toast(`${food.name} added to ${MEALS.find((x) => x.id === meal).name.toLowerCase()}.`);
  };
  return (
    <Sheet title={food.name}>
      {hasGrams ? (
        <>
          <Field label="Amount" for="amt-grams"><Num id="amt-grams" value={grams} unit={unit} onChange={setGrams} /></Field>
          <div class="chips">
            {s0 && s0.grams && [1, 2].map((n) => <button class={`chip ${grams === s0.grams * n ? 'on' : ''}`} onClick={() => setGrams(s0.grams * n)}>{n === 1 ? s0.label : `${n} × ${s0.label.replace(/^1 /, '')}`}</button>)}
            <button class={`chip ${grams === 100 ? 'on' : ''}`} onClick={() => setGrams(100)}>100 {unit}</button>
          </div>
        </>
      ) : (
        <Field label={`Servings of ${s0 ? s0.label : '1 serving'}`}><Stepper label="servings" value={servings} min={0.25} max={20} step={0.25} onChange={setServings} /></Field>
      )}
      <p class="amount-macros"><MacroLine m={m} full /></p>
      <Field label="Meal"><Seg id="amt-meal" label="Meal" value={meal} options={MEALS} onChange={setMeal} /></Field>
      <button class="btn btn-primary btn-lg block mt-4" disabled={hasGrams && !grams} onClick={add}>Add to log</button>
    </Sheet>
  );
}

function OwnFoodForm({ onDone, name0 = '' }) {
  const [f, setF] = useState({ name: name0, serving: '1 serving', grams: null, kcal: null, protein: null, carbs: null, fat: null, category: 'other' });
  const set = (patch) => setF({ ...f, ...patch });
  return (
    <>
      <p class="muted">Copy the numbers for one serving from the label.</p>
      <Field label="Name" for="own-name"><input id="own-name" type="text" value={f.name} onInput={(e) => set({ name: e.target.value })} /></Field>
      <div class="form-grid">
        <Field label="Serving" for="own-serving"><input id="own-serving" type="text" value={f.serving} onInput={(e) => set({ serving: e.target.value })} /></Field>
        <Field label="Serving weight, optional" for="own-grams"><Num id="own-grams" value={f.grams} unit="g" onChange={(grams) => set({ grams })} /></Field>
        <Field label="Calories" for="own-kcal"><Num id="own-kcal" digits={0} value={f.kcal} unit="kcal" onChange={(kcal) => set({ kcal })} /></Field>
        <Field label="Protein" for="own-protein"><Num id="own-protein" value={f.protein} unit="g" onChange={(protein) => set({ protein })} /></Field>
        <Field label="Carbs" for="own-carbs"><Num id="own-carbs" value={f.carbs} unit="g" onChange={(carbs) => set({ carbs })} /></Field>
        <Field label="Fat" for="own-fat"><Num id="own-fat" value={f.fat} unit="g" onChange={(fat) => set({ fat })} /></Field>
      </div>
      <Field label="Category" for="own-cat"><select id="own-cat" value={f.category} onChange={(e) => set({ category: e.target.value })}>{FOOD_CATEGORIES.map((c) => <option value={c.id}>{c.name}</option>)}</select></Field>
      <button class="btn btn-primary btn-lg block mt-4" disabled={!f.name.trim() || f.kcal == null} onClick={() => {
        const food = newOwnFood({ ...f, name: f.name.trim(), kcal: f.kcal || 0, protein: f.protein || 0, carbs: f.carbs || 0, fat: f.fat || 0 });
        state.mine.foods = [food, ...(state.mine.foods || [])];
        saveMine();
        onDone(food);
      }}>Save food</button>
    </>
  );
}

function AddSheet({ dayKey: key, meal: meal0 }) {
  const [tab, setTab] = useState('foods');
  const [q, setQ] = useState('');
  const [meal, setMeal] = useState(meal0);
  const [quick, setQuick] = useState({ name: '', kcal: null, protein: null, carbs: null, fat: null });
  const needle = q.trim().toLowerCase();
  const pickFood = (food) => openSheet(() => <AmountSheet food={food} dayKey={key} meal={meal} />);
  const recent = (state.mine.recent || []).map(foodById).filter(Boolean);
  const foods = needle ? allFoods().filter((f) => f.name.toLowerCase().includes(needle)) : null;
  const recipes = RECIPES.filter((r) => r.name.toLowerCase().includes(needle));
  const FoodRow = (f) => {
    const s = f.servings[0];
    const m = foodMacros(f, {});
    return <li key={f.id}><button onClick={() => pickFood(f)}><strong>{f.name}</strong><span>{s ? s.label : '100 g'}{s && s.grams ? ` (${s.grams} ${f.liquid ? 'ml' : 'g'})` : ''} · {m.kcal} kcal · {Math.round(m.protein || 0)} g protein</span></button></li>;
  };
  return (
    <Sheet title="Add food" tall>
      <Seg id="add-tab" label="What to add" value={tab} onChange={setTab} options={[{ id: 'foods', name: 'Foods' }, { id: 'recipes', name: 'Recipes' }, { id: 'quick', name: 'Quick add' }, { id: 'own', name: 'New food' }]} />
      <div class="mt-3"><Seg id="add-meal" label="Meal" value={meal} options={MEALS} onChange={setMeal} /></div>
      {(tab === 'foods' || tab === 'recipes') && <div class="search mt-3"><Icon name="search" size={18} /><input id="add-search" type="search" placeholder={tab === 'foods' ? 'Search foods, e.g. chicken, oats, rice' : 'Search recipes'} value={q} onInput={(e) => setQ(e.target.value)} /></div>}
      {tab === 'foods' && (
        <>
          {!foods && recent.length > 0 && <><h3 class="list-title">Recent</h3><ul class="pick-list">{recent.map(FoodRow)}</ul></>}
          {!foods && (state.mine.foods || []).length > 0 && <><h3 class="list-title">Your foods</h3><ul class="pick-list">{state.mine.foods.map(FoodRow)}</ul></>}
          {!foods && <><h3 class="list-title">Staples</h3><ul class="pick-list">{['chicken-breast', 'egg', 'rice-cooked', 'oats', 'greek-yogurt', 'banana', 'whey', 'bread-wholemeal', 'milk', 'olive-oil'].map(foodById).map(FoodRow)}</ul></>}
          {foods && <ul class="pick-list">{foods.map(FoodRow)}</ul>}
          {foods && !foods.length && <Empty title={`Nothing called “${q}”`}>Add it as a new food from its label, or use Quick add for just the calories.</Empty>}
        </>
      )}
      {tab === 'recipes' && (
        <ul class="pick-list">
          {recipes.map((r) => <li key={r.id}><button onClick={() => { logRecipe(key, meal, r, 1); closeAllSheets(); toast(`${r.name} added. Change the portion from the log.`); }}><strong>{r.name}</strong><span>1 portion · {r.per.kcal} kcal · {r.per.protein} g protein</span></button></li>)}
        </ul>
      )}
      {tab === 'quick' && (
        <div class="mt-3">
          <Field label="What was it, optional" for="quick-name"><input id="quick-name" type="text" value={quick.name} placeholder="e.g. Restaurant pasta" onInput={(e) => setQuick({ ...quick, name: e.target.value })} /></Field>
          <div class="form-grid">
            <Field label="Calories" for="quick-kcal"><Num id="quick-kcal" digits={0} value={quick.kcal} unit="kcal" onChange={(kcal) => setQuick({ ...quick, kcal })} /></Field>
            <Field label="Protein" for="quick-protein"><Num id="quick-protein" value={quick.protein} unit="g" onChange={(protein) => setQuick({ ...quick, protein })} /></Field>
            <Field label="Carbs" for="quick-carbs"><Num id="quick-carbs" value={quick.carbs} unit="g" onChange={(carbs) => setQuick({ ...quick, carbs })} /></Field>
            <Field label="Fat" for="quick-fat"><Num id="quick-fat" value={quick.fat} unit="g" onChange={(fat) => setQuick({ ...quick, fat })} /></Field>
          </div>
          <button class="btn btn-primary btn-lg block mt-4" disabled={!quick.kcal} onClick={() => { logItem(key, newFoodItem({ ...quick, name: quick.name.trim() || 'Quick add', meal })); closeAllSheets(); toast('Added to your log.'); }}>Add to log</button>
        </div>
      )}
      {tab === 'own' && <div class="mt-3"><OwnFoodForm name0={q} onDone={(food) => { setTab('foods'); pickFood(food); }} /></div>}
    </Sheet>
  );
}

function ItemSheet({ dayKey: key, item }) {
  const [d, setD] = useState({ ...item });
  const food = item.foodId ? foodById(item.foodId) : null;
  const recipe = item.recipeId ? getRecipe(item.recipeId) : null;
  const scalable = food && food.per100 && item.grams != null;
  const [mult, setMult] = useState(recipe ? Math.round((item.kcal / recipe.per.kcal) * 4) / 4 || 1 : 1);
  const save = () => {
    const day = foodDay(key);
    let next = { ...d };
    if (scalable) next = { ...next, ...foodMacros(food, { grams: d.grams || 0 }), amount: `${fmtNum(d.grams)} ${food.liquid ? 'ml' : 'g'}` };
    if (recipe) next = { ...next, kcal: Math.round(recipe.per.kcal * mult), protein: recipe.per.protein * mult, carbs: recipe.per.carbs * mult, fat: recipe.per.fat * mult, amount: `${fmtNum(mult, 2)} portion${mult === 1 ? '' : 's'}` };
    day.items = day.items.map((i) => (i.id === item.id ? next : i));
    saveFoodDay(day);
    closeSheet();
  };
  return (
    <Sheet title={item.name}>
      {scalable && <Field label="Amount" for="item-grams"><Num id="item-grams" value={d.grams} unit={food.liquid ? 'ml' : 'g'} onChange={(grams) => setD({ ...d, grams })} /></Field>}
      {recipe && <Field label="Portions"><Stepper label="portions" value={mult} min={0.25} max={4} step={0.25} onChange={setMult} /></Field>}
      {!scalable && !recipe && (
        <div class="form-grid">
          <Field label="Calories" for="item-kcal"><Num id="item-kcal" digits={0} value={d.kcal} unit="kcal" onChange={(kcal) => setD({ ...d, kcal: kcal || 0 })} /></Field>
          <Field label="Protein" for="item-protein"><Num id="item-protein" value={d.protein} unit="g" onChange={(protein) => setD({ ...d, protein })} /></Field>
          <Field label="Carbs" for="item-carbs"><Num id="item-carbs" value={d.carbs} unit="g" onChange={(carbs) => setD({ ...d, carbs })} /></Field>
          <Field label="Fat" for="item-fat"><Num id="item-fat" value={d.fat} unit="g" onChange={(fat) => setD({ ...d, fat })} /></Field>
        </div>
      )}
      <Field label="Meal"><Seg id="item-meal" label="Meal" value={d.meal} options={MEALS} onChange={(meal) => setD({ ...d, meal })} /></Field>
      <div class="row gap-2 mt-4">
        <button class="btn btn-danger-quiet" onClick={() => { removeItem(key, item); closeSheet(); }}><Icon name="trash" size={18} /> Remove</button>
        <button class="btn btn-primary grow" onClick={save}>Save</button>
      </div>
    </Sheet>
  );
}

export function FoodView() {
  const nav = useNav();
  const today = dayKey();
  const key = nav.foodDay || today;
  const day = foodDay(key);
  const targets = activeTargets(state.settings);
  const t = totals(day.items);
  const yesterday = foodDay(addDays(key, -1));
  return (
    <>
      <header class="page-head">
        <div><p class="eyebrow">Food log</p><h1>{fmtRelDay(key, today)}</h1></div>
        <div class="row">
          <button class="icon-btn" onClick={() => setNav({ foodDay: addDays(key, -1) })} aria-label="Previous day"><Icon name="left" /></button>
          <button class="icon-btn" onClick={() => setNav({ foodDay: addDays(key, 1) })} disabled={key >= addDays(today, 7)} aria-label="Next day"><Icon name="right" /></button>
        </div>
      </header>
      {key !== today && <button class="btn btn-quiet btn-sm self-start" onClick={() => setNav({ foodDay: today })}>Back to today</button>}

      <section class="card fuel">
        <CalorieRing eaten={t.kcal} target={targets.kcal} />
        <div class="grow">
          <p class="fuel-line"><b>{t.kcal}</b> eaten of <b>{targets.kcal}</b> kcal</p>
          <MacroBars totals={t} targets={targets} />
        </div>
      </section>

      {MEALS.map((meal) => {
        const items = day.items.filter((i) => i.meal === meal.id);
        const mt = totals(items);
        return (
          <section class="card meal-card" key={meal.id}>
            <header>
              <h2>{meal.name}</h2>
              <span class="muted">{items.length ? `${mt.kcal} kcal · ${mt.protein} g protein` : ''}</span>
              <button class="btn btn-sm" onClick={() => openSheet(() => <AddSheet dayKey={key} meal={meal.id} />)} aria-label={`Add to ${meal.name}`}><Icon name="plus" size={16} /> Add</button>
            </header>
            {items.length > 0 && (
              <ul class="food-list">
                {items.map((i) => (
                  <li key={i.id}><button onClick={() => openSheet(() => <ItemSheet dayKey={key} item={i} />)}>
                    <span><strong>{i.name}</strong>{i.amount && <small>{i.amount}</small>}</span>
                    <span class="food-nums"><b>{i.kcal}</b><small>{Math.round(i.protein || 0)} g protein</small></span>
                  </button></li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {!day.items.length && yesterday.items.length > 0 && (
        <button class="btn block" onClick={() => { const d = foodDay(key); d.items = yesterday.items.map((i) => ({ ...newFoodItem(i), recipeId: i.recipeId })); saveFoodDay(d); toast('Copied from the day before.'); }}><Icon name="copy" size={18} /> Copy the day before</button>
      )}
    </>
  );
}
