// App state. Everything is kept in this browser's storage and, when the page is opened
// inside Claude by a signed-in person, mirrored to that person's private space in the
// artifact's database so it follows them across devices.
//
// State is grouped into buckets, each saved as one document:
//   settings, plans, body, mine, mealplan      one document each
//   sess-YYYY-MM                               that month's workouts
//   food-YYYY-MM                               that month's food log
// Month buckets merge item by item (newest edit wins); the others are last-writer-wins.
import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_SETTINGS } from './model.js';
import { getClaude } from './platform.js';
import { dayKey } from './util.js';

const LS_PREFIX = 'liftledger:v1:';
const SINGLE = ['settings', 'plans', 'body', 'mine', 'mealplan'];

const fresh = () => ({
  settings: structuredClone(DEFAULT_SETTINGS),
  plans: [],
  body: [], // {date, kg}
  mine: { foods: [], recent: [] },
  mealplan: { days: {}, checked: {} },
  sessions: {},
  food: {},
});

export const state = fresh();
const stamps = {}; // bucket -> updatedAt
const dirty = new Set();
const listeners = new Set();
let version = 0;

/** 'local' until the account store answers, then 'synced', or 'offline' after a failed write. */
export let syncStatus = 'local';

function notify() {
  version += 1;
  for (const fn of listeners) fn(version);
}

/** Re-render the calling component whenever the store changes. */
export function useStore() {
  const [, set] = useState(version);
  useEffect(() => {
    listeners.add(set);
    return () => listeners.delete(set);
  }, []);
  return state;
}

const monthOfSession = (s) => dayKey(new Date(s.startedAt)).slice(0, 7);

function bucketBody(key) {
  if (SINGLE.includes(key)) return { v: state[key] };
  const month = key.slice(5);
  const items = {};
  if (key.startsWith('sess-')) {
    for (const s of Object.values(state.sessions)) if (monthOfSession(s) === month) items[s.id] = s;
  } else {
    for (const d of Object.values(state.food)) if (d.id.startsWith(month)) items[d.id] = d;
  }
  return { items };
}

function applyBucket(key, body) {
  if (!body) return;
  if (SINGLE.includes(key)) {
    if (body.v == null) return;
    state[key] = key === 'settings' ? { ...structuredClone(DEFAULT_SETTINGS), ...body.v } : body.v;
    return;
  }
  const target = key.startsWith('sess-') ? state.sessions : state.food;
  for (const [id, item] of Object.entries(body.items || {})) {
    const mine = target[id];
    if (!mine || (item.updatedAt || 0) > (mine.updatedAt || 0)) target[id] = item;
  }
}

function writeLocal(key) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ updatedAt: stamps[key], ...bucketBody(key) }));
  } catch {
    // Storage is full or blocked: the session still works, and the account copy still saves.
  }
}

function loadLocal() {
  let keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) keys.push(k.slice(LS_PREFIX.length));
    }
  } catch {
    keys = [];
  }
  for (const key of keys) {
    try {
      const doc = JSON.parse(localStorage.getItem(LS_PREFIX + key));
      stamps[key] = doc.updatedAt || 0;
      applyBucket(key, doc);
    } catch {
      // A damaged entry is skipped rather than taking the app down.
    }
  }
}

function touch(key) {
  stamps[key] = Date.now();
  writeLocal(key);
  dirty.add(key);
  schedulePush();
  notify();
}

// ---- mutations: change the state object, then call the matching save ----

export const saveSettings = () => { state.settings.updatedAt = Date.now(); touch('settings'); };
export const savePlans = () => touch('plans');
export const saveBody = () => touch('body');
export const saveMine = () => touch('mine');
export const saveMealplan = () => touch('mealplan');

export function saveSession(session) {
  session.updatedAt = Date.now();
  state.sessions[session.id] = session;
  touch('sess-' + monthOfSession(session));
}

/** Deleting leaves a marker behind so the deletion reaches other devices too. */
export function deleteSession(session) {
  saveSession({ id: session.id, startedAt: session.startedAt, status: 'done', deleted: true, entries: [], unit: session.unit });
}

export function foodDay(key) {
  return state.food[key] || { id: key, items: [], note: '', updatedAt: 0 };
}

export function saveFoodDay(day) {
  day.updatedAt = Date.now();
  state.food[day.id] = day;
  touch('food-' + day.id.slice(0, 7));
}

export function activeSession() {
  return Object.values(state.sessions).find((s) => s.status === 'active' && !s.deleted) || null;
}

export function activePlan() {
  return state.plans.find((p) => p.id === state.settings.activePlanId && !p.deleted) || null;
}

/** Latest logged bodyweight in kg, falling back to the profile. */
export function currentWeightKg() {
  const b = state.body[state.body.length - 1];
  return b ? b.kg : state.settings.profile ? state.settings.profile.weightKg : null;
}

// ---- backup ----

export function exportData() {
  return JSON.stringify({ app: 'lift-ledger', version: 1, exportedAt: new Date().toISOString(), state }, null, 1);
}

/** Replace everything with a backup. Throws a plain-sentence Error when the file is not one. */
export function importData(text) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new Error('That file is not a Lift Ledger backup.');
  }
  if (!doc || doc.app !== 'lift-ledger' || !doc.state || !doc.state.settings) throw new Error('That file is not a Lift Ledger backup.');
  const old = allKeys();
  Object.assign(state, fresh(), doc.state);
  const now = Date.now();
  for (const s of Object.values(state.sessions)) s.updatedAt = now;
  for (const d of Object.values(state.food)) d.updatedAt = now;
  for (const key of new Set([...old, ...allKeys()])) touch(key);
}

export function resetAll() {
  const now = Date.now();
  for (const s of Object.values(state.sessions)) Object.assign(s, { deleted: true, entries: [], status: 'done', updatedAt: now });
  for (const d of Object.values(state.food)) Object.assign(d, { items: [], updatedAt: now });
  const keys = allKeys();
  const kept = { sessions: state.sessions, food: state.food };
  Object.assign(state, fresh(), kept);
  for (const key of keys) touch(key);
}

function allKeys() {
  const keys = new Set(SINGLE);
  for (const s of Object.values(state.sessions)) keys.add('sess-' + monthOfSession(s));
  for (const d of Object.values(state.food)) keys.add('food-' + d.id.slice(0, 7));
  return [...keys];
}

// ---- account sync ----

let col = null;
let pushTimer = null;
let pushing = false;

function schedulePush() {
  if (!col) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 1200);
}

async function push() {
  if (!col || pushing) return;
  pushing = true;
  try {
    while (dirty.size) {
      const key = dirty.values().next().value;
      dirty.delete(key);
      const body = JSON.parse(JSON.stringify({ updatedAt: stamps[key] || Date.now(), ...bucketBody(key) }));
      try {
        await col.doc(key).set(body);
        setStatus('synced');
      } catch (e) {
        dirty.add(key);
        setStatus('offline');
        break;
      }
    }
  } finally {
    pushing = false;
  }
}

function setStatus(s) {
  if (syncStatus === s) return;
  syncStatus = s;
  notify();
}

async function pull() {
  const snap = await col.limit(1000).get();
  const seen = new Set();
  for (const doc of snap.docs) {
    const key = doc.id;
    const body = doc.data();
    if (!body) continue;
    seen.add(key);
    const remoteAt = body.updatedAt || 0;
    const localAt = stamps[key] || 0;
    if (SINGLE.includes(key)) {
      if (remoteAt > localAt) {
        applyBucket(key, structuredClone(body));
        stamps[key] = remoteAt;
        writeLocal(key);
      } else if (localAt > remoteAt) dirty.add(key);
    } else if (key.startsWith('sess-') || key.startsWith('food-')) {
      // This device is ahead when it holds an item the account lacks or has an older copy of.
      const remoteItems = body.items || {};
      const ahead = Object.values(bucketBody(key).items).some((it) => (it.updatedAt || 0) > ((remoteItems[it.id] || {}).updatedAt || 0));
      applyBucket(key, structuredClone(body));
      stamps[key] = Math.max(localAt, remoteAt);
      writeLocal(key);
      if (ahead) dirty.add(key);
    }
  }
  // Anything this device has that the account has never seen.
  for (const key of allKeys()) if (!seen.has(key) && stamps[key]) dirty.add(key);
  setStatus('synced');
  notify();
  if (dirty.size) push();
}

async function initSync() {
  const claude = getClaude();
  if (!claude) return;
  try {
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (!db || !user) return;
    const id = await user.id();
    if (!id) return;
    col = db.collection('data/users/' + id);
    await pull();
    let last = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') push();
      else if (Date.now() - last > 60000) {
        last = Date.now();
        pull().catch(() => setStatus('offline'));
      }
    });
  } catch {
    // No account store on this view: the app carries on with this browser's storage.
    if (col) setStatus('offline');
  }
}

export function initStore() {
  loadLocal();
  notify();
  initSync();
}
