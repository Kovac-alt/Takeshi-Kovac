// Meals: the week's meal plan, the recipe book and the shopping list.
import { useState } from 'preact/hooks';
import { FOOD_CATEGORIES, MEALS } from '../core/model.js';
import { activeTargets } from '../core/nutrition.js';
import { dayMacros, fmtAmount, planDay, recipesFor, shoppingList, slotMacros, swapOptions } from '../core/mealplan.js';
import { saveMealplan, state } from '../core/store.js';
import { foodById } from '../core/lookup.js';
import { getRecipe } from '../data/recipes.js';
import { WEEKDAYS, addDays, dayKey, fmtDay, fmtNum, fmtRelDay, keyDate, weekdayIndex } from '../core/util.js';
import { Empty, Icon, MacroBars, MacroLine, Seg, Sheet, Stepper, closeAllSheets, closeSheet, confirmAction, openSheet, toast } from '../ui/kit.jsx';
import { setNav, useNav } from '../ui/nav.js';
import { logRecipe, mealNow } from './food.jsx';
import { planWeekMeals } from './goals.jsx';

const mealName = (id) => (MEALS.find((m) => m.id === id) || {}).name.replace(/s$/, '') || id;
const profile = () => state.settings.profile || { diet: 'any', snacks: 1 };

/** Mark a planned meal as eaten and put it in the food log for that day. */
export function logSlot(key, slot) {
  const r = getRecipe(slot.recipeId);
  if (!r || slot.logged) return;
  logRecipe(key, slot.meal, r, slot.mult, slot.id);
  slot.logged = true;
  saveMealplan();
  toast(`${r.name} logged.`);
}

export function RecipeSheet({ recipe, mult0 = 1, slot = null, dayKey: key = null }) {
  const [mult, setMult] = useState(slot ? slot.mult : mult0);
  const m = slotMacros({ recipeId: recipe.id, mult });
  const apply = (v) => { setMult(v); if (slot && !slot.logged) { slot.mult = v; saveMealplan(); } };
  return (
    <Sheet title={recipe.name} tall>
      <p class="muted">{recipe.minutes} min · {recipe.diet === 'any' ? 'contains meat' : recipe.diet}{recipe.highProtein ? ' · high protein' : ''}{recipe.serves > 1 ? ` · the full recipe makes ${recipe.serves} portions` : ''}</p>
      <div class="portion">
        <div><span class="label">Portion</span><Stepper label="portion size" value={mult} min={0.5} max={3} step={0.25} fmt={(v) => `${fmtNum(v, 2)}×`} onChange={apply} /></div>
        <p><MacroLine m={m} full /></p>
      </div>
      <h3>Ingredients{mult !== 1 ? ` for ${fmtNum(mult, 2)}×` : ''}</h3>
      <ul class="ings">
        {recipe.ings.map(([id, g]) => { const f = foodById(id); const amt = Math.round(((g / recipe.serves) * mult) / 5) * 5 || Math.round((g / recipe.serves) * mult); return <li><b>{amt} {f.liquid ? 'ml' : 'g'}</b><span>{f.name.toLowerCase()}</span></li>; })}
        {recipe.extras.map((x) => <li><b /> <span>{x}</span></li>)}
      </ul>
      <h3>Method</h3>
      <ol class="steps">{recipe.steps.map((s) => <li>{s}</li>)}</ol>
      {slot && key ? (
        <button class="btn btn-primary btn-lg block mt-4" disabled={slot.logged} onClick={() => { logSlot(key, slot); closeSheet(); }}>{slot.logged ? 'Already logged' : `Log as ${mealName(slot.meal).toLowerCase()}`}</button>
      ) : (
        <button class="btn btn-primary btn-lg block mt-4" onClick={() => { logRecipe(dayKey(), mealNow(), recipe, mult); closeAllSheets(); toast(`${recipe.name} added to today's log.`); }}>Log to today</button>
      )}
    </Sheet>
  );
}

function SwapSheet({ slot }) {
  return (
    <Sheet title={`Swap ${mealName(slot.meal).toLowerCase()}`} tall>
      <p class="muted">Each option is sized to the same calories as the meal it replaces.</p>
      <ul class="pick-list">
        {swapOptions(slot, profile().diet).map((o) => (
          <li key={o.recipe.id}><button onClick={() => { slot.recipeId = o.recipe.id; slot.mult = o.mult; saveMealplan(); closeSheet(); }}>
            <strong>{o.recipe.name}</strong><span>{fmtNum(o.mult, 2)}× · {o.kcal} kcal · {o.protein} g protein · {o.recipe.minutes} min</span>
          </button></li>
        ))}
      </ul>
    </Sheet>
  );
}

function PlanTab() {
  const today = dayKey();
  const [sel, setSel] = useState(today);
  const targets = activeTargets(state.settings);
  const days = state.mealplan.days;
  const strip = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const day = days[sel];
  const reroll = () => {
    days[sel] = { slots: planDay(targets, { diet: profile().diet, snacks: profile().snacks, seed: Date.now() % 1e6, avoid: new Set(((days[addDays(sel, -1)] || {}).slots || []).map((s) => s.recipeId)) }) };
    saveMealplan();
  };
  const planned = strip.filter((k) => days[k]).length;
  return (
    <>
      <div class="day-strip" role="tablist" aria-label="Day">
        {strip.map((k) => (
          <button role="tab" aria-selected={k === sel} class={`${k === sel ? 'on' : ''} ${days[k] ? 'has' : ''}`} onClick={() => setSel(k)}>
            <span>{WEEKDAYS[weekdayIndex(k)]}</span><b>{keyDate(k).getDate()}</b>
          </button>
        ))}
      </div>
      {day ? (
        <>
          <section class="card">
            <p class="fuel-line"><b>{dayMacros(day.slots).kcal}</b> planned of <b>{targets.kcal}</b> kcal · {fmtRelDay(sel, today)}</p>
            <MacroBars totals={dayMacros(day.slots)} targets={targets} />
          </section>
          {day.slots.map((slot) => {
            const r = getRecipe(slot.recipeId);
            if (!r) return null;
            return (
              <article class={`card slot ${slot.logged ? 'logged' : ''}`} key={slot.id}>
                <button class="slot-main" onClick={() => openSheet(() => <RecipeSheet recipe={r} slot={slot} dayKey={sel} />)}>
                  <span class="label">{mealName(slot.meal)}{slot.mult !== 1 ? ` · ${fmtNum(slot.mult, 2)}× portion` : ''}</span>
                  <strong>{r.name}</strong>
                  <MacroLine m={slotMacros(slot)} />
                </button>
                <div class="slot-actions">
                  {slot.logged ? <span class="pill pill-done"><Icon name="check" size={14} /> Logged</span> : (
                    <>
                      <button class="btn btn-sm" onClick={() => openSheet(() => <SwapSheet slot={slot} />)}><Icon name="swap" size={16} /> Swap</button>
                      {sel <= today && <button class="btn btn-sm btn-primary" onClick={() => logSlot(sel, slot)}>Log</button>}
                    </>
                  )}
                </div>
              </article>
            );
          })}
          {!day.slots.some((s) => s.logged) && <button class="btn block" onClick={reroll}><Icon name="shuffle" size={18} /> Different meals for this day</button>}
        </>
      ) : (
        <Empty title={`Nothing planned for ${fmtDay(sel)}`}>Plan this day on its own, or plan the whole week below.</Empty>
      )}
      {!day && <button class="btn btn-primary block" onClick={reroll}>Plan this day</button>}
      <button class="btn block" onClick={() => {
        const run = () => { planWeekMeals(today); toast('Planned the next 7 days to your targets.'); };
        if (planned) confirmAction({ title: 'Plan the week again?', body: 'The next 7 days get new meals. Days where you already logged a planned meal are kept.', action: 'Plan the week', danger: false, onConfirm: run });
        else run();
      }}>{planned ? 'Plan the whole week again' : 'Plan the next 7 days'}</button>
    </>
  );
}

const FILTERS = [
  { id: 'all', name: 'All', test: () => true },
  { id: 'breakfast', name: 'Breakfast', test: (r) => r.meals.includes('breakfast') },
  { id: 'lunch', name: 'Lunch', test: (r) => r.meals.includes('lunch') },
  { id: 'dinner', name: 'Dinner', test: (r) => r.meals.includes('dinner') },
  { id: 'snack', name: 'Snacks', test: (r) => r.meals.includes('snack') },
  { id: 'protein', name: 'High protein', test: (r) => r.highProtein },
  { id: 'quick', name: '15 min or less', test: (r) => r.minutes <= 15 },
];

function RecipesTab() {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(true);
  const diet = profile().diet;
  const f = FILTERS.find((x) => x.id === filter);
  const list = recipesFor(mine ? diet : 'any').filter((r) => f.test(r) && r.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <div class="search"><Icon name="search" size={18} /><input id="recipe-search" type="search" placeholder="Search recipes" value={q} onInput={(e) => setQ(e.target.value)} /></div>
      <div class="chips scroll-x">{FILTERS.map((x) => <button class={`chip ${filter === x.id ? 'on' : ''}`} onClick={() => setFilter(x.id)}>{x.name}</button>)}</div>
      {diet !== 'any' && <label class="check"><input id="recipe-diet" type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only {diet} recipes</label>}
      <div class="recipe-grid">
        {list.map((r) => (
          <button class="card recipe" key={r.id} onClick={() => openSheet(() => <RecipeSheet recipe={r} />)}>
            <span class="label">{r.meals.map(mealName).join(' · ')} · {r.minutes} min</span>
            <strong>{r.name}</strong>
            <span class="recipe-macros"><b>{r.per.kcal}</b> kcal<i /><b>{r.per.protein}</b> P<i /><b>{r.per.carbs}</b> C<i /><b>{r.per.fat}</b> F</span>
          </button>
        ))}
      </div>
      {!list.length && <Empty title="No recipes match">Try a different filter or search.</Empty>}
    </>
  );
}

function ShoppingTab() {
  const today = dayKey();
  const [span, setSpan] = useState('7');
  const keys = Array.from({ length: +span }, (_, i) => addDays(today, i));
  const days = keys.map((k) => state.mealplan.days[k]).filter(Boolean);
  const groups = shoppingList(days.map((d) => ({ slots: d.slots.filter((s) => !s.logged) })));
  const checked = state.mealplan.checked || {};
  const count = groups.reduce((a, g) => a + g.items.length, 0);
  const copy = () => {
    const text = groups.map((g) => `${(FOOD_CATEGORIES.find((c) => c.id === g.category) || {}).name}\n${g.items.map((i) => `- ${i.food.name}: ${fmtAmount(i.food, i.grams)}`).join('\n')}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => toast('Shopping list copied.'), () => toast('Copying is blocked here. Select the list instead.'));
  };
  if (!count) return <Empty title="Nothing to buy yet">Plan some meals and the ingredients are added up here.</Empty>;
  return (
    <>
      <Seg id="shop-span" label="Days to shop for" value={span} onChange={setSpan} options={[{ id: '3', name: 'Next 3 days' }, { id: '7', name: 'Next 7 days' }]} />
      <p class="muted">Everything for {days.length} planned day{days.length === 1 ? '' : 's'}, with meals you already logged left out. Seasonings are not listed.</p>
      {groups.map((g) => (
        <section class="card shop" key={g.category}>
          <h2>{(FOOD_CATEGORIES.find((c) => c.id === g.category) || {}).name}</h2>
          <ul>
            {g.items.map((i) => (
              <li key={i.food.id}><label class={checked[i.food.id] ? 'got' : ''}>
                <input id={`shop-${i.food.id}`} type="checkbox" checked={!!checked[i.food.id]} onChange={(e) => { state.mealplan.checked = { ...checked, [i.food.id]: e.target.checked }; saveMealplan(); }} />
                <span>{i.food.name}</span><b>{fmtAmount(i.food, i.grams)}</b>
              </label></li>
            ))}
          </ul>
        </section>
      ))}
      <div class="row gap-2 wrap">
        <button class="btn" onClick={copy}><Icon name="copy" size={18} /> Copy list</button>
        {Object.values(checked).some(Boolean) && <button class="btn btn-quiet" onClick={() => { state.mealplan.checked = {}; saveMealplan(); }}>Untick all</button>}
      </div>
    </>
  );
}

export function MealsView() {
  const nav = useNav();
  const view = nav.mealsView;
  return (
    <>
      <header class="page-head"><div><p class="eyebrow">Meal planner</p><h1>Meals</h1></div></header>
      <Seg id="meals-view" label="Section" value={view} onChange={(mealsView) => setNav({ mealsView })} options={[{ id: 'plan', name: 'Plan' }, { id: 'recipes', name: 'Recipes' }, { id: 'shopping', name: 'Shopping' }]} />
      {view === 'plan' && <PlanTab />}
      {view === 'recipes' && <RecipesTab />}
      {view === 'shopping' && <ShoppingTab />}
    </>
  );
}
