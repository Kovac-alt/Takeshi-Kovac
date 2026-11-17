# Lift Ledger

A personal gym planner and tracker, calorie tracker and meal planner in one page.

- **Goals** drive everything: goal (build muscle, lose fat, recomp, maintain), pace, body stats,
  training days, equipment, a muscle group to prioritise and how you eat. From those the app works
  out calorie and macro targets, builds a training split and plans a week of meals.
- **Train**: an editable plan, a set-by-set workout logger with a rest timer, progression hints
  (double progression) and personal records.
- **Food**: a daily calorie and macro log with a built-in food table, your own foods and quick add.
- **Meals**: a 7-day meal plan sized to your targets, 46 recipes with scalable portions, and a
  shopping list.
- **Progress**: bodyweight trend against the plan, calories, weekly sets per muscle, lift strength.

## Develop

```
npm ci
npm run build      # dist/index.html (standalone) and dist/artifact.html (Claude artifact)
npm test           # unit tests
npm run test:e2e   # builds, then drives the page in Chromium (needs Playwright)
```

`dist/index.html` is a single self-contained file: open it from disk or host it anywhere.
Data is kept in the browser's storage. Published as a Claude artifact, it also syncs to the
signed-in viewer's private space in the artifact's database, so it follows you across devices.

Source layout: `src/data` (exercises, foods, recipes), `src/core` (targets, plan generation,
meal planning, storage), `src/views` (screens), `src/ui` (shared components and charts).
