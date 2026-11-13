// The data model: constants, JSDoc types and factories shared by every module.
// Pure and dependency-free so it runs unchanged in the browser and in Node tests.

export const APP_NAME = 'Lift Ledger';
export const SCHEMA_VERSION = 1;

/** Muscle groups used for exercise tagging and weekly-volume charts. */
export const MUSCLES = [
  { id: 'chest', name: 'Chest' },
  { id: 'back', name: 'Back' },
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'biceps', name: 'Biceps' },
  { id: 'triceps', name: 'Triceps' },
  { id: 'forearms', name: 'Forearms' },
  { id: 'quads', name: 'Quads' },
  { id: 'hamstrings', name: 'Hamstrings' },
  { id: 'glutes', name: 'Glutes' },
  { id: 'calves', name: 'Calves' },
  { id: 'core', name: 'Core' },
];
export const MUSCLE_IDS = MUSCLES.map((m) => m.id);
/** `Exercise.muscle` may also be 'cardio' for conditioning work; it is not a muscle group. */
export const CARDIO = 'cardio';

export const EQUIPMENT = [
  { id: 'barbell', name: 'Barbell' },
  { id: 'dumbbell', name: 'Dumbbell' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'machine', name: 'Machine' },
  { id: 'cable', name: 'Cable' },
  { id: 'bodyweight', name: 'Bodyweight' },
  { id: 'band', name: 'Band' },
  { id: 'cardio_machine', name: 'Cardio machine' },
  { id: 'other', name: 'Other' },
];
export const EQUIPMENT_IDS = EQUIPMENT.map((e) => e.id);

/** Extra kit an exercise needs beyond its main equipment. */
export const REQUIREMENTS = ['bench', 'rack', 'pullup_bar', 'dip_bars'];

/**
 * How an exercise is logged:
 *  weight      weight x reps                       (bench press)
 *  bodyweight  reps, optional added weight         (pull-up)
 *  timed       seconds, optional added weight      (plank)
 *  cardio      minutes, optional distance          (rowing machine)
 */
export const KINDS = ['weight', 'bodyweight', 'timed', 'cardio'];

/** Movement patterns: drive plan generation and "swap for a similar exercise". */
export const PATTERNS = [
  'h_push', 'incline_push', 'v_push', 'dip', 'chest_fly',
  'h_pull', 'v_pull', 'rear_delt', 'lateral_raise', 'shrug',
  'squat', 'lunge', 'hinge', 'hip_thrust', 'knee_ext', 'knee_flex', 'calf',
  'biceps', 'triceps', 'forearm',
  'core_flex', 'core_stab', 'core_rot', 'carry',
  'cardio', 'other',
];

export const SET_TYPES = ['work', 'warmup', 'drop', 'failure'];
export const UNITS = ['kg', 'lb'];
export const DIST_UNIT = { kg: 'km', lb: 'mi' };

/** Collections synced one document per entity. */
export const COLLECTIONS = ['plans', 'sessions', 'notes'];
/** Singleton documents kept in the `kv` collection, keyed by id. */
export const KV_KEYS = ['settings', 'exmeta', 'body', 'custom'];

/**
 * @typedef {Object} Exercise
 * @property {string} id            slug, e.g. 'barbell-bench-press'; custom ones start with 'custom-'
 * @property {string} name
 * @property {string} muscle        primary: a MUSCLE_IDS value or 'cardio'
 * @property {string[]} secondary   other MUSCLE_IDS worked
 * @property {string} equipment     an EQUIPMENT_IDS value
 * @property {string[]} [requires]  REQUIREMENTS values
 * @property {'weight'|'bodyweight'|'timed'|'cardio'} kind
 * @property {string} pattern       a PATTERNS value
 * @property {boolean} [compound]   multi-joint lift
 * @property {boolean} [unilateral] logged per side
 * @property {string[]} [cues]      2-4 short technique cues
 * @property {boolean} [custom]
 *
 * @typedef {Object} PlanItem
 * @property {string} id
 * @property {string} exerciseId
 * @property {number} sets          working sets
 * @property {number} repMin        reps, or seconds for timed, or minutes for cardio
 * @property {number} repMax
 * @property {number} restSec
 * @property {string} [note]        programming note, e.g. 'pause at the bottom'
 *
 * @typedef {Object} PlanDay
 * @property {string} id
 * @property {string} name          e.g. 'Upper A'
 * @property {string} [focus]       e.g. 'Chest, back, shoulders'
 * @property {PlanItem[]} items
 *
 * @typedef {Object} PlanSchedule
 * @property {'weekdays'|'rotation'} mode
 * @property {(string|null)[]} [weekdays]  length 7, index 0 = Monday; a PlanDay id or null for rest
 *
 * @typedef {Object} Plan
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} [source]      'template:<id>' | 'generated' | 'custom'
 * @property {PlanSchedule} schedule
 * @property {PlanDay[]} days
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {boolean} [deleted]
 *
 * @typedef {Object} SetLog
 * @property {string} id
 * @property {'work'|'warmup'|'drop'|'failure'} type
 * @property {number|null} weight   in the session's unit; added weight for bodyweight/timed kinds
 * @property {number|null} reps
 * @property {number|null} seconds  timed kind
 * @property {number|null} minutes  cardio kind
 * @property {number|null} distance cardio kind, in DIST_UNIT[session.unit]
 * @property {number|null} rpe      6-10 in 0.5 steps
 * @property {boolean} done
 * @property {number|null} doneAt
 *
 * @typedef {Object} SessionEntry
 * @property {string} id
 * @property {string} exerciseId
 * @property {string} [planItemId]
 * @property {{sets:number, repMin:number, repMax:number, restSec:number, note?:string}|null} target
 * @property {string} note          what happened today on this exercise
 * @property {SetLog[]} sets
 *
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} name          e.g. 'Upper A' or 'Quick workout'
 * @property {string|null} planId
 * @property {string|null} dayId
 * @property {'active'|'done'} status
 * @property {'kg'|'lb'} unit        unit every weight in this session is stored in
 * @property {number} startedAt
 * @property {number|null} finishedAt
 * @property {string} note
 * @property {number|null} [rating]  1-5, how the session felt
 * @property {SessionEntry[]} entries
 * @property {number} updatedAt
 * @property {boolean} [deleted]
 *
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string[]} tags
 * @property {boolean} pinned
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {boolean} [deleted]
 *
 * @typedef {Object} ExerciseMeta   per-exercise things worth remembering
 * @property {string} [note]        standing note shown every time, e.g. 'seat 4, pins at 12'
 * @property {number} [increment]   overrides the default weight jump, in settings.units
 * @property {boolean} [favorite]
 *
 * @typedef {Object} BodyEntry
 * @property {string} date          local day key 'YYYY-MM-DD'
 * @property {number} weight
 * @property {'kg'|'lb'} unit
 *
 * @typedef {Object} Profile        onboarding answers
 * @property {'muscle'|'strength'|'fat_loss'|'general'} goal
 * @property {'beginner'|'intermediate'|'advanced'} experience
 * @property {number} daysPerWeek   2-6
 * @property {'full_gym'|'home_barbell'|'dumbbells'|'bodyweight'} equipment
 * @property {number} sessionMinutes 30 | 45 | 60 | 75 | 90
 *
 * @typedef {Object} Settings
 * @property {'kg'|'lb'} units
 * @property {boolean} onboarded
 * @property {string|null} activePlanId
 * @property {Profile|null} profile
 * @property {number} restSec        fallback rest when an exercise has no target
 * @property {boolean} autoRest      start the rest timer when a set is ticked off
 * @property {boolean} sound
 * @property {boolean} vibrate
 * @property {boolean} keepAwake     hold a screen wake lock during a workout
 * @property {boolean} showRpe
 * @property {{kg:number, lb:number}} barWeight
 * @property {{kg:number[], lb:number[]}} plates      plate sizes available, per side
 * @property {{kg:Object<string,number>, lb:Object<string,number>}} increments  weight jump by equipment id
 * @property {number} weekStart      1 = Monday, 0 = Sunday
 * @property {number} updatedAt
 */

export const DEFAULT_SETTINGS = Object.freeze({
  id: 'settings',
  units: 'kg',
  onboarded: false,
  activePlanId: null,
  profile: null,
  restSec: 120,
  autoRest: true,
  sound: true,
  vibrate: true,
  keepAwake: true,
  showRpe: false,
  barWeight: { kg: 20, lb: 45 },
  plates: { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] },
  increments: {
    kg: { barbell: 2.5, dumbbell: 2, kettlebell: 4, machine: 5, cable: 2.5, bodyweight: 2.5, band: 0, cardio_machine: 0, other: 2.5 },
    lb: { barbell: 5, dumbbell: 5, kettlebell: 10, machine: 10, cable: 5, bodyweight: 5, band: 0, cardio_machine: 0, other: 5 },
  },
  weekStart: 1,
  updatedAt: 0,
});

export const DEFAULT_PROFILE = Object.freeze({
  goal: 'muscle',
  experience: 'beginner',
  daysPerWeek: 3,
  equipment: 'full_gym',
  sessionMinutes: 60,
});

let counter = 0;
/**
 * A unique id: time-ordered, and made only of characters that are valid in a
 * storage path segment (lowercase letters and digits).
 */
export function uid() {
  const t = Date.now().toString(36).padStart(9, '0');
  counter = (counter + 1) % 1296;
  let rand = '';
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(8));
    for (const b of bytes) rand += (b % 36).toString(36);
  } else {
    for (let i = 0; i < 8; i++) rand += Math.floor(Math.random() * 36).toString(36);
  }
  return t + counter.toString(36).padStart(2, '0') + rand;
}

/** @returns {SetLog} */
export function newSet(type = 'work') {
  return { id: uid(), type, weight: null, reps: null, seconds: null, minutes: null, distance: null, rpe: null, done: false, doneAt: null };
}

/** @returns {PlanItem} */
export function newPlanItem(exerciseId, { sets = 3, repMin = 8, repMax = 12, restSec = 120, note = '' } = {}) {
  return { id: uid(), exerciseId, sets, repMin, repMax, restSec, note };
}

/** @returns {PlanDay} */
export function newPlanDay(name = 'New day', items = []) {
  return { id: uid(), name, focus: '', items };
}

/** @returns {Plan} */
export function newPlan({ name = 'My plan', description = '', source = 'custom', days = [], schedule } = {}) {
  const now = Date.now();
  return {
    id: uid(),
    name,
    description,
    source,
    schedule: schedule || { mode: 'rotation', weekdays: [null, null, null, null, null, null, null] },
    days,
    createdAt: now,
    updatedAt: now,
  };
}

/** @returns {SessionEntry} */
export function newEntry(exerciseId, target = null, planItemId = undefined) {
  const count = target && target.sets > 0 ? target.sets : 3;
  const sets = [];
  for (let i = 0; i < count; i++) sets.push(newSet('work'));
  const entry = { id: uid(), exerciseId, target: target ? { ...target } : null, note: '', sets };
  if (planItemId) entry.planItemId = planItemId;
  return entry;
}

/**
 * Start a session. With a plan day, its targets are copied in, so later edits
 * to the plan never rewrite history.
 * @param {{plan?: Plan|null, day?: PlanDay|null, unit?: 'kg'|'lb', name?: string}} [opts]
 * @returns {Session}
 */
export function newSession({ plan = null, day = null, unit = 'kg', name } = {}) {
  const now = Date.now();
  const entries = day
    ? day.items.map((it) =>
        newEntry(it.exerciseId, { sets: it.sets, repMin: it.repMin, repMax: it.repMax, restSec: it.restSec, note: it.note || '' }, it.id),
      )
    : [];
  return {
    id: uid(),
    name: name || (day ? day.name : 'Quick workout'),
    planId: plan ? plan.id : null,
    dayId: day ? day.id : null,
    status: 'active',
    unit,
    startedAt: now,
    finishedAt: null,
    note: '',
    rating: null,
    entries,
    updatedAt: now,
  };
}

/** @returns {Note} */
export function newNote({ title = '', body = '', tags = [], pinned = false } = {}) {
  const now = Date.now();
  return { id: uid(), title, body, tags, pinned, createdAt: now, updatedAt: now };
}

/** Slug for a custom exercise id. */
export function customExerciseId(name) {
  const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `custom-${slug || 'exercise'}-${uid().slice(-6)}`;
}

/** Whether a set counts toward volume and records: ticked off and not a warm-up. */
export function isCountedSet(set) {
  return !!set && set.done === true && set.type !== 'warmup';
}
