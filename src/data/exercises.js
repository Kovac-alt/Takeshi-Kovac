// The exercise library. Order matters: within a movement pattern, earlier entries are
// preferred when a plan is generated.
// Row: [id, name, primary muscle, secondary muscles, equipment, kind, pattern, compound]

const ROWS = [
  // horizontal push
  ['barbell-bench-press', 'Barbell bench press', 'chest', ['triceps', 'shoulders'], 'barbell', 'weight', 'h_push', 1],
  ['dumbbell-bench-press', 'Dumbbell bench press', 'chest', ['triceps', 'shoulders'], 'dumbbell', 'weight', 'h_push', 1],
  ['machine-chest-press', 'Machine chest press', 'chest', ['triceps', 'shoulders'], 'machine', 'weight', 'h_push', 1],
  ['push-up', 'Push-up', 'chest', ['triceps', 'shoulders'], 'bodyweight', 'bodyweight', 'h_push', 1],
  ['decline-push-up', 'Feet-elevated push-up', 'chest', ['triceps', 'shoulders'], 'bodyweight', 'bodyweight', 'h_push', 1],
  // incline push
  ['incline-dumbbell-press', 'Incline dumbbell press', 'chest', ['shoulders', 'triceps'], 'dumbbell', 'weight', 'incline_push', 1],
  ['incline-barbell-press', 'Incline barbell press', 'chest', ['shoulders', 'triceps'], 'barbell', 'weight', 'incline_push', 1],
  ['incline-machine-press', 'Incline machine press', 'chest', ['shoulders', 'triceps'], 'machine', 'weight', 'incline_push', 1],
  ['pike-push-up', 'Pike push-up', 'shoulders', ['triceps', 'chest'], 'bodyweight', 'bodyweight', 'incline_push', 1],
  // vertical push
  ['overhead-press', 'Barbell overhead press', 'shoulders', ['triceps'], 'barbell', 'weight', 'v_push', 1],
  ['dumbbell-shoulder-press', 'Dumbbell shoulder press', 'shoulders', ['triceps'], 'dumbbell', 'weight', 'v_push', 1],
  ['machine-shoulder-press', 'Machine shoulder press', 'shoulders', ['triceps'], 'machine', 'weight', 'v_push', 1],
  ['handstand-push-up', 'Wall handstand push-up', 'shoulders', ['triceps'], 'bodyweight', 'bodyweight', 'v_push', 1],
  // dips and flyes
  ['dip', 'Dip', 'chest', ['triceps', 'shoulders'], 'bodyweight', 'bodyweight', 'dip', 1],
  ['bench-dip', 'Bench dip', 'triceps', ['chest', 'shoulders'], 'bodyweight', 'bodyweight', 'dip', 1],
  ['cable-fly', 'Cable fly', 'chest', [], 'cable', 'weight', 'chest_fly', 0],
  ['pec-deck', 'Pec deck', 'chest', [], 'machine', 'weight', 'chest_fly', 0],
  ['dumbbell-fly', 'Dumbbell fly', 'chest', [], 'dumbbell', 'weight', 'chest_fly', 0],
  // horizontal pull
  ['barbell-row', 'Barbell row', 'back', ['biceps', 'forearms'], 'barbell', 'weight', 'h_pull', 1],
  ['seated-cable-row', 'Seated cable row', 'back', ['biceps'], 'cable', 'weight', 'h_pull', 1],
  ['dumbbell-row', 'One-arm dumbbell row', 'back', ['biceps', 'forearms'], 'dumbbell', 'weight', 'h_pull', 1],
  ['chest-supported-row', 'Chest-supported row', 'back', ['biceps'], 'machine', 'weight', 'h_pull', 1],
  ['t-bar-row', 'T-bar row', 'back', ['biceps'], 'barbell', 'weight', 'h_pull', 1],
  ['inverted-row', 'Inverted row', 'back', ['biceps'], 'bodyweight', 'bodyweight', 'h_pull', 1],
  // vertical pull
  ['pull-up', 'Pull-up', 'back', ['biceps', 'forearms'], 'bodyweight', 'bodyweight', 'v_pull', 1],
  ['lat-pulldown', 'Lat pulldown', 'back', ['biceps'], 'cable', 'weight', 'v_pull', 1],
  ['chin-up', 'Chin-up', 'back', ['biceps'], 'bodyweight', 'bodyweight', 'v_pull', 1],
  ['neutral-grip-pulldown', 'Neutral-grip pulldown', 'back', ['biceps'], 'cable', 'weight', 'v_pull', 1],
  ['dumbbell-pullover', 'Dumbbell pullover', 'back', ['chest'], 'dumbbell', 'weight', 'v_pull', 0],
  // shoulders detail
  ['face-pull', 'Face pull', 'shoulders', ['back'], 'cable', 'weight', 'rear_delt', 0],
  ['reverse-pec-deck', 'Reverse pec deck', 'shoulders', ['back'], 'machine', 'weight', 'rear_delt', 0],
  ['rear-delt-fly', 'Bent-over dumbbell rear delt fly', 'shoulders', ['back'], 'dumbbell', 'weight', 'rear_delt', 0],
  ['band-pull-apart', 'Band pull-apart', 'shoulders', ['back'], 'band', 'bodyweight', 'rear_delt', 0],
  ['dumbbell-lateral-raise', 'Dumbbell lateral raise', 'shoulders', [], 'dumbbell', 'weight', 'lateral_raise', 0],
  ['cable-lateral-raise', 'Cable lateral raise', 'shoulders', [], 'cable', 'weight', 'lateral_raise', 0],
  ['machine-lateral-raise', 'Machine lateral raise', 'shoulders', [], 'machine', 'weight', 'lateral_raise', 0],
  ['band-lateral-raise', 'Band lateral raise', 'shoulders', [], 'band', 'bodyweight', 'lateral_raise', 0],
  ['barbell-shrug', 'Barbell shrug', 'back', ['forearms'], 'barbell', 'weight', 'shrug', 0],
  ['dumbbell-shrug', 'Dumbbell shrug', 'back', ['forearms'], 'dumbbell', 'weight', 'shrug', 0],
  // squat
  ['back-squat', 'Barbell back squat', 'quads', ['glutes', 'hamstrings', 'core'], 'barbell', 'weight', 'squat', 1],
  ['leg-press', 'Leg press', 'quads', ['glutes'], 'machine', 'weight', 'squat', 1],
  ['hack-squat', 'Hack squat', 'quads', ['glutes'], 'machine', 'weight', 'squat', 1],
  ['front-squat', 'Front squat', 'quads', ['glutes', 'core'], 'barbell', 'weight', 'squat', 1],
  ['goblet-squat', 'Goblet squat', 'quads', ['glutes', 'core'], 'dumbbell', 'weight', 'squat', 1],
  ['bodyweight-squat', 'Bodyweight squat', 'quads', ['glutes'], 'bodyweight', 'bodyweight', 'squat', 1],
  // lunge
  ['bulgarian-split-squat', 'Bulgarian split squat', 'quads', ['glutes', 'hamstrings'], 'dumbbell', 'weight', 'lunge', 1],
  ['walking-lunge', 'Dumbbell walking lunge', 'quads', ['glutes', 'hamstrings'], 'dumbbell', 'weight', 'lunge', 1],
  ['bodyweight-split-squat', 'Rear-foot-elevated split squat', 'quads', ['glutes'], 'bodyweight', 'bodyweight', 'lunge', 1],
  ['reverse-lunge', 'Reverse lunge', 'quads', ['glutes'], 'bodyweight', 'bodyweight', 'lunge', 1],
  // hinge
  ['romanian-deadlift', 'Romanian deadlift', 'hamstrings', ['glutes', 'back'], 'barbell', 'weight', 'hinge', 1],
  ['deadlift', 'Deadlift', 'hamstrings', ['glutes', 'back', 'forearms'], 'barbell', 'weight', 'hinge', 1],
  ['dumbbell-rdl', 'Dumbbell Romanian deadlift', 'hamstrings', ['glutes', 'back'], 'dumbbell', 'weight', 'hinge', 1],
  ['back-extension', 'Back extension', 'hamstrings', ['glutes', 'back'], 'machine', 'bodyweight', 'hinge', 0],
  ['single-leg-rdl', 'Single-leg Romanian deadlift', 'hamstrings', ['glutes'], 'bodyweight', 'bodyweight', 'hinge', 1],
  // glutes
  ['barbell-hip-thrust', 'Barbell hip thrust', 'glutes', ['hamstrings'], 'barbell', 'weight', 'hip_thrust', 1],
  ['machine-hip-thrust', 'Machine hip thrust', 'glutes', ['hamstrings'], 'machine', 'weight', 'hip_thrust', 1],
  ['dumbbell-hip-thrust', 'Dumbbell hip thrust', 'glutes', ['hamstrings'], 'dumbbell', 'weight', 'hip_thrust', 1],
  ['single-leg-glute-bridge', 'Single-leg glute bridge', 'glutes', ['hamstrings'], 'bodyweight', 'bodyweight', 'hip_thrust', 0],
  // knee extension / flexion, calves
  ['leg-extension', 'Leg extension', 'quads', [], 'machine', 'weight', 'knee_ext', 0],
  ['sissy-squat', 'Sissy squat', 'quads', [], 'bodyweight', 'bodyweight', 'knee_ext', 0],
  ['seated-leg-curl', 'Seated leg curl', 'hamstrings', [], 'machine', 'weight', 'knee_flex', 0],
  ['lying-leg-curl', 'Lying leg curl', 'hamstrings', [], 'machine', 'weight', 'knee_flex', 0],
  ['nordic-curl', 'Nordic curl', 'hamstrings', [], 'bodyweight', 'bodyweight', 'knee_flex', 0],
  ['standing-calf-raise', 'Standing calf raise', 'calves', [], 'machine', 'weight', 'calf', 0],
  ['seated-calf-raise', 'Seated calf raise', 'calves', [], 'machine', 'weight', 'calf', 0],
  ['dumbbell-calf-raise', 'Single-leg dumbbell calf raise', 'calves', [], 'dumbbell', 'weight', 'calf', 0],
  ['bodyweight-calf-raise', 'Single-leg calf raise', 'calves', [], 'bodyweight', 'bodyweight', 'calf', 0],
  // arms
  ['barbell-curl', 'Barbell curl', 'biceps', ['forearms'], 'barbell', 'weight', 'biceps', 0],
  ['incline-dumbbell-curl', 'Incline dumbbell curl', 'biceps', [], 'dumbbell', 'weight', 'biceps', 0],
  ['dumbbell-curl', 'Dumbbell curl', 'biceps', ['forearms'], 'dumbbell', 'weight', 'biceps', 0],
  ['cable-curl', 'Cable curl', 'biceps', [], 'cable', 'weight', 'biceps', 0],
  ['hammer-curl', 'Hammer curl', 'biceps', ['forearms'], 'dumbbell', 'weight', 'biceps', 0],
  ['preacher-curl', 'Preacher curl', 'biceps', [], 'machine', 'weight', 'biceps', 0],
  ['band-curl', 'Band curl', 'biceps', [], 'band', 'bodyweight', 'biceps', 0],
  ['triceps-pushdown', 'Triceps pushdown', 'triceps', [], 'cable', 'weight', 'triceps', 0],
  ['overhead-triceps-extension', 'Overhead dumbbell triceps extension', 'triceps', [], 'dumbbell', 'weight', 'triceps', 0],
  ['cable-overhead-extension', 'Cable overhead triceps extension', 'triceps', [], 'cable', 'weight', 'triceps', 0],
  ['skull-crusher', 'Skull crusher', 'triceps', [], 'barbell', 'weight', 'triceps', 0],
  ['close-grip-bench-press', 'Close-grip bench press', 'triceps', ['chest', 'shoulders'], 'barbell', 'weight', 'triceps', 1],
  ['diamond-push-up', 'Diamond push-up', 'triceps', ['chest'], 'bodyweight', 'bodyweight', 'triceps', 1],
  ['wrist-curl', 'Wrist curl', 'forearms', [], 'dumbbell', 'weight', 'forearm', 0],
  // core
  ['cable-crunch', 'Cable crunch', 'core', [], 'cable', 'weight', 'core_flex', 0],
  ['hanging-leg-raise', 'Hanging leg raise', 'core', [], 'bodyweight', 'bodyweight', 'core_flex', 0],
  ['crunch', 'Crunch', 'core', [], 'bodyweight', 'bodyweight', 'core_flex', 0],
  ['ab-wheel', 'Ab wheel rollout', 'core', [], 'other', 'bodyweight', 'core_flex', 0],
  ['plank', 'Plank', 'core', [], 'bodyweight', 'timed', 'core_stab', 0],
  ['side-plank', 'Side plank', 'core', [], 'bodyweight', 'timed', 'core_stab', 0],
  ['russian-twist', 'Russian twist', 'core', [], 'bodyweight', 'bodyweight', 'core_rot', 0],
  ['farmers-carry', 'Farmer’s carry', 'forearms', ['core', 'back'], 'dumbbell', 'timed', 'carry', 1],
  // conditioning
  ['treadmill', 'Treadmill', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
  ['incline-walk', 'Incline walk', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
  ['stationary-bike', 'Stationary bike', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
  ['rowing-machine', 'Rowing machine', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
  ['stair-climber', 'Stair climber', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
  ['outdoor-run', 'Run', 'cardio', [], 'other', 'cardio', 'cardio', 0],
];

/** @type {import('../core/model.js').Exercise[]} */
export const EXERCISES = ROWS.map(([id, name, muscle, secondary, equipment, kind, pattern, compound]) => ({
  id, name, muscle, secondary, equipment, kind, pattern, compound: !!compound,
}));

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

/** Look an exercise up, including the user's own. Unknown ids get a readable stand-in. */
export function getExercise(id, custom = []) {
  return BY_ID.get(id) || custom.find((e) => e.id === id) || {
    id, name: 'Unknown exercise', muscle: 'core', secondary: [], equipment: 'other', kind: 'weight', pattern: 'other', compound: false,
  };
}

/** Equipment each training setup has access to. */
export const EQUIPMENT_SETS = {
  full_gym: ['barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'bodyweight', 'band', 'cardio_machine', 'other'],
  home_barbell: ['barbell', 'dumbbell', 'bodyweight', 'band', 'other'],
  dumbbells: ['dumbbell', 'bodyweight', 'band', 'other'],
  bodyweight: ['bodyweight', 'band', 'other'],
};
