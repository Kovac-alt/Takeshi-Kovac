// The built-in exercise library, plus lookups that fold in the user's own exercises.
import { state } from './store.js';

// [name, primary muscle, secondary, equipment, kind, pattern, compound]
const RAW = [
  ['Barbell bench press', 'chest', ['triceps', 'shoulders'], 'barbell', 'weight', 'h_push', 1],
  ['Incline barbell bench press', 'chest', ['shoulders', 'triceps'], 'barbell', 'weight', 'incline_push', 1],
  ['Dumbbell bench press', 'chest', ['triceps', 'shoulders'], 'dumbbell', 'weight', 'h_push', 1],
  ['Incline dumbbell press', 'chest', ['shoulders', 'triceps'], 'dumbbell', 'weight', 'incline_push', 1],
  ['Machine chest press', 'chest', ['triceps', 'shoulders'], 'machine', 'weight', 'h_push', 1],
  ['Push-up', 'chest', ['triceps', 'shoulders', 'core'], 'bodyweight', 'bodyweight', 'h_push', 1],
  ['Dip', 'chest', ['triceps', 'shoulders'], 'bodyweight', 'bodyweight', 'dip', 1],
  ['Cable fly', 'chest', [], 'cable', 'weight', 'chest_fly', 0],
  ['Pec deck', 'chest', [], 'machine', 'weight', 'chest_fly', 0],
  ['Deadlift', 'back', ['hamstrings', 'glutes', 'forearms'], 'barbell', 'weight', 'hinge', 1],
  ['Barbell row', 'back', ['biceps', 'forearms'], 'barbell', 'weight', 'h_pull', 1],
  ['Dumbbell row', 'back', ['biceps'], 'dumbbell', 'weight', 'h_pull', 1],
  ['Seated cable row', 'back', ['biceps'], 'cable', 'weight', 'h_pull', 1],
  ['T-bar row', 'back', ['biceps'], 'barbell', 'weight', 'h_pull', 1],
  ['Lat pulldown', 'back', ['biceps'], 'cable', 'weight', 'v_pull', 1],
  ['Pull-up', 'back', ['biceps', 'forearms'], 'bodyweight', 'bodyweight', 'v_pull', 1],
  ['Chin-up', 'back', ['biceps'], 'bodyweight', 'bodyweight', 'v_pull', 1],
  ['Inverted row', 'back', ['biceps', 'core'], 'bodyweight', 'bodyweight', 'h_pull', 1],
  ['Barbell shrug', 'back', ['forearms'], 'barbell', 'weight', 'shrug', 0],
  ['Overhead press', 'shoulders', ['triceps', 'core'], 'barbell', 'weight', 'v_push', 1],
  ['Dumbbell shoulder press', 'shoulders', ['triceps'], 'dumbbell', 'weight', 'v_push', 1],
  ['Machine shoulder press', 'shoulders', ['triceps'], 'machine', 'weight', 'v_push', 1],
  ['Lateral raise', 'shoulders', [], 'dumbbell', 'weight', 'lateral_raise', 0],
  ['Cable lateral raise', 'shoulders', [], 'cable', 'weight', 'lateral_raise', 0],
  ['Face pull', 'shoulders', ['back'], 'cable', 'weight', 'rear_delt', 0],
  ['Reverse fly', 'shoulders', ['back'], 'dumbbell', 'weight', 'rear_delt', 0],
  ['Barbell curl', 'biceps', ['forearms'], 'barbell', 'weight', 'biceps', 0],
  ['Dumbbell curl', 'biceps', ['forearms'], 'dumbbell', 'weight', 'biceps', 0],
  ['Hammer curl', 'biceps', ['forearms'], 'dumbbell', 'weight', 'biceps', 0],
  ['Cable curl', 'biceps', [], 'cable', 'weight', 'biceps', 0],
  ['Preacher curl', 'biceps', [], 'machine', 'weight', 'biceps', 0],
  ['Triceps pushdown', 'triceps', [], 'cable', 'weight', 'triceps', 0],
  ['Overhead triceps extension', 'triceps', [], 'cable', 'weight', 'triceps', 0],
  ['Skull crusher', 'triceps', [], 'barbell', 'weight', 'triceps', 0],
  ['Close-grip bench press', 'triceps', ['chest', 'shoulders'], 'barbell', 'weight', 'h_push', 1],
  ['Wrist curl', 'forearms', [], 'dumbbell', 'weight', 'forearm', 0],
  ['Back squat', 'quads', ['glutes', 'hamstrings', 'core'], 'barbell', 'weight', 'squat', 1],
  ['Front squat', 'quads', ['glutes', 'core'], 'barbell', 'weight', 'squat', 1],
  ['Goblet squat', 'quads', ['glutes', 'core'], 'dumbbell', 'weight', 'squat', 1],
  ['Hack squat', 'quads', ['glutes'], 'machine', 'weight', 'squat', 1],
  ['Leg press', 'quads', ['glutes', 'hamstrings'], 'machine', 'weight', 'squat', 1],
  ['Bulgarian split squat', 'quads', ['glutes'], 'dumbbell', 'weight', 'lunge', 1],
  ['Walking lunge', 'quads', ['glutes', 'hamstrings'], 'dumbbell', 'weight', 'lunge', 1],
  ['Bodyweight squat', 'quads', ['glutes'], 'bodyweight', 'bodyweight', 'squat', 1],
  ['Leg extension', 'quads', [], 'machine', 'weight', 'knee_ext', 0],
  ['Romanian deadlift', 'hamstrings', ['glutes', 'back'], 'barbell', 'weight', 'hinge', 1],
  ['Dumbbell Romanian deadlift', 'hamstrings', ['glutes', 'back'], 'dumbbell', 'weight', 'hinge', 1],
  ['Good morning', 'hamstrings', ['glutes', 'back'], 'barbell', 'weight', 'hinge', 1],
  ['Lying leg curl', 'hamstrings', [], 'machine', 'weight', 'knee_flex', 0],
  ['Seated leg curl', 'hamstrings', [], 'machine', 'weight', 'knee_flex', 0],
  ['Hip thrust', 'glutes', ['hamstrings'], 'barbell', 'weight', 'hip_thrust', 1],
  ['Glute bridge', 'glutes', ['hamstrings'], 'bodyweight', 'bodyweight', 'hip_thrust', 0],
  ['Cable kickback', 'glutes', [], 'cable', 'weight', 'hip_thrust', 0],
  ['Standing calf raise', 'calves', [], 'machine', 'weight', 'calf', 0],
  ['Seated calf raise', 'calves', [], 'machine', 'weight', 'calf', 0],
  ['Plank', 'core', ['shoulders'], 'bodyweight', 'timed', 'core_stab', 0],
  ['Side plank', 'core', [], 'bodyweight', 'timed', 'core_stab', 0],
  ['Hanging leg raise', 'core', ['forearms'], 'bodyweight', 'bodyweight', 'core_flex', 0],
  ['Ab wheel rollout', 'core', ['shoulders'], 'other', 'bodyweight', 'core_stab', 0],
  ['Cable crunch', 'core', [], 'cable', 'weight', 'core_flex', 0],
  ['Russian twist', 'core', [], 'bodyweight', 'bodyweight', 'core_rot', 0],
  ["Farmer's carry", 'forearms', ['core', 'back'], 'dumbbell', 'timed', 'carry', 1],
  ['Treadmill run', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
  ['Outdoor run', 'cardio', [], 'other', 'cardio', 'cardio', 0],
  ['Stationary bike', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
  ['Rowing machine', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
  ['Stair climber', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
  ['Elliptical', 'cardio', [], 'cardio_machine', 'cardio', 'cardio', 0],
];

export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const LIBRARY = RAW.map(([name, muscle, secondary, equipment, kind, pattern, compound]) => ({
  id: slug(name), name, muscle, secondary, equipment, kind, pattern, compound: !!compound,
}));
const BY_ID = new Map(LIBRARY.map((e) => [e.id, e]));

export const customExercises = () => (state.kv.custom && state.kv.custom.exercises) || [];
export const allExercises = () => [...LIBRARY, ...customExercises()].sort((a, b) => a.name.localeCompare(b.name));
export function getExercise(id) {
  return BY_ID.get(id) || customExercises().find((e) => e.id === id)
    || { id, name: 'Removed exercise', muscle: 'core', secondary: [], equipment: 'other', kind: 'weight', pattern: 'other' };
}
