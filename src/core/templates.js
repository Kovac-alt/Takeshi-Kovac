// Starter plans. Items are [exercise id, sets, rep min, rep max, rest seconds].
import { newPlan, newPlanDay, newPlanItem } from './model.js';

export const TEMPLATES = [
  {
    id: 'full-body-3', name: 'Full body, 3 days', blurb: 'Two alternating sessions built on the big lifts. A good place to start.',
    days: [
      { name: 'Full body A', items: [['back-squat', 3, 5, 8, 180], ['barbell-bench-press', 3, 5, 8, 150], ['barbell-row', 3, 8, 10, 120], ['dumbbell-shoulder-press', 2, 8, 12, 90], ['lying-leg-curl', 2, 10, 15, 90], ['plank', 3, 30, 60, 60]] },
      { name: 'Full body B', items: [['deadlift', 3, 3, 6, 180], ['overhead-press', 3, 5, 8, 150], ['lat-pulldown', 3, 8, 12, 120], ['leg-press', 3, 10, 12, 120], ['dumbbell-curl', 2, 10, 15, 60], ['triceps-pushdown', 2, 10, 15, 60]] },
    ],
  },
  {
    id: 'upper-lower-4', name: 'Upper / lower, 4 days', blurb: 'Each half of the body twice a week, one heavier day and one lighter.',
    days: [
      { name: 'Upper A', items: [['barbell-bench-press', 4, 5, 8, 150], ['barbell-row', 4, 6, 10, 120], ['dumbbell-shoulder-press', 3, 8, 12, 90], ['lat-pulldown', 3, 8, 12, 90], ['barbell-curl', 3, 8, 12, 60], ['skull-crusher', 3, 8, 12, 60]] },
      { name: 'Lower A', items: [['back-squat', 4, 5, 8, 180], ['romanian-deadlift', 3, 8, 10, 150], ['leg-press', 3, 10, 12, 120], ['lying-leg-curl', 3, 10, 15, 90], ['standing-calf-raise', 3, 10, 15, 60], ['hanging-leg-raise', 3, 8, 15, 60]] },
      { name: 'Upper B', items: [['incline-dumbbell-press', 4, 8, 12, 120], ['pull-up', 4, 5, 10, 120], ['overhead-press', 3, 6, 10, 120], ['seated-cable-row', 3, 10, 12, 90], ['lateral-raise', 3, 12, 20, 60], ['triceps-pushdown', 3, 10, 15, 60], ['hammer-curl', 3, 10, 15, 60]] },
      { name: 'Lower B', items: [['deadlift', 3, 3, 6, 180], ['bulgarian-split-squat', 3, 8, 12, 120], ['hip-thrust', 3, 8, 12, 120], ['leg-extension', 3, 12, 15, 60], ['seated-calf-raise', 3, 12, 20, 60], ['cable-crunch', 3, 10, 15, 60]] },
    ],
  },
  {
    id: 'push-pull-legs', name: 'Push / pull / legs', blurb: 'Run it once a week for 3 days, or twice round for 6.',
    days: [
      { name: 'Push', items: [['barbell-bench-press', 4, 5, 8, 150], ['overhead-press', 3, 6, 10, 120], ['incline-dumbbell-press', 3, 8, 12, 90], ['lateral-raise', 3, 12, 20, 60], ['triceps-pushdown', 3, 10, 15, 60], ['overhead-triceps-extension', 2, 10, 15, 60]] },
      { name: 'Pull', items: [['deadlift', 3, 3, 6, 180], ['pull-up', 3, 5, 10, 120], ['seated-cable-row', 3, 8, 12, 90], ['face-pull', 3, 12, 20, 60], ['barbell-curl', 3, 8, 12, 60], ['hammer-curl', 2, 10, 15, 60]] },
      { name: 'Legs', items: [['back-squat', 4, 5, 8, 180], ['romanian-deadlift', 3, 8, 10, 150], ['leg-press', 3, 10, 12, 120], ['lying-leg-curl', 3, 10, 15, 90], ['standing-calf-raise', 4, 10, 15, 60], ['hanging-leg-raise', 3, 8, 15, 60]] },
    ],
  },
  {
    id: 'home-bodyweight', name: 'At home, no equipment', blurb: 'Three short sessions you can do anywhere. A pull-up bar helps but is optional.',
    days: [
      { name: 'Home A', items: [['push-up', 4, 8, 20, 90], ['bodyweight-squat', 4, 15, 25, 60], ['inverted-row', 3, 6, 12, 90], ['glute-bridge', 3, 12, 20, 60], ['plank', 3, 30, 60, 60]] },
      { name: 'Home B', items: [['pull-up', 4, 3, 10, 120], ['walking-lunge', 3, 10, 16, 90], ['dip', 3, 5, 12, 90], ['russian-twist', 3, 16, 30, 60], ['side-plank', 3, 20, 45, 45]] },
    ],
  },
];

export function planFromTemplate(t) {
  return newPlan({
    name: t.name, description: t.blurb, source: `template:${t.id}`,
    days: t.days.map((d) => newPlanDay(d.name, d.items.map(([ex, sets, repMin, repMax, restSec]) => newPlanItem(ex, { sets, repMin, repMax, restSec })))),
  });
}
