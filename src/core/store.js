// App state and where it is kept. Inside Claude the data lives in the artifact's database,
// in a space private to the signed-in person; anywhere else it lives on the device.
// Views mutate documents in place and then call put()/setKV(); everything re-renders from the root.
import { DEFAULT_SETTINGS, COLLECTIONS, KV_KEYS } from './model.js';
import { getClaude } from './platform.js';

const LS = 'lift-ledger-v1';
const clone = (o) => JSON.parse(JSON.stringify(o));
const emptyKV = () => ({
  settings: clone(DEFAULT_SETTINGS),
  exmeta: { id: 'exmeta', items: {} },
  body: { id: 'body', entries: [] },
  custom: { id: 'custom', exercises: [] },
  foods: { id: 'foods', foods: [] },
});

export const state = { ready: false, mode: 'loading', failed: false, slow: false, plans: {}, sessions: {}, notes: {}, food: {}, kv: emptyKV() };
/** Screen-level UI state: current tab, pushed screen, toast, rest timer. */
export const ui = { tab: 'today', screen: null, toast: null, rest: null };

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn()); }
export function setUI(patch) { Object.assign(ui, patch); emit(); }
export const settings = () => ({ ...DEFAULT_SETTINGS, ...state.kv.settings });

/* ---------- persistence ---------- */
let col = null;
let localTimer = null;
const pending = new Map(); // doc id -> debounce timer
const writing = new Set();
const again = new Set();
let remoteSeen = new Set();
const isBusy = (did) => pending.has(did) || writing.has(did);
export const savingCount = () => pending.size + writing.size;

function bodyOf(did) {
  const dot = did.indexOf('.'), coll = did.slice(0, dot), id = did.slice(dot + 1);
  return coll === 'kv' ? state.kv[id] : state[coll] && state[coll][id];
}
function applyRemote(did, data) {
  const dot = did.indexOf('.'), coll = did.slice(0, dot), id = did.slice(dot + 1);
  if (coll === 'kv' && KV_KEYS.includes(id)) { if (data) state.kv[id] = data; else state.kv[id] = emptyKV()[id]; }
  else if (COLLECTIONS.includes(coll)) { if (data) state[coll][id] = data; else delete state[coll][id]; }
}
function saveLocalNow() {
  clearTimeout(localTimer); localTimer = null;
  try { localStorage.setItem(LS, exportAll()); state.failed = false; } catch (e) { state.failed = true; emit(); }
}
async function flush(did) {
  clearTimeout(pending.get(did)); pending.delete(did);
  if (writing.has(did)) { again.add(did); return; }
  writing.add(did); emit();
  try {
    do {
      again.delete(did);
      const body = bodyOf(did), ref = col.doc(did);
      const run = () => (body ? ref.set(clone(body)) : ref.delete());
      try { await run(); } catch (e) {
        if (!e || e.code !== 'unavailable') throw e;
        await new Promise((r) => setTimeout(r, 700 + Math.random() * 900)); await run();
      }
    } while (again.has(did));
    failedDocs.delete(did);
  } catch (e) { failedDocs.add(did); }
  writing.delete(did); state.failed = failedDocs.size > 0; emit();
}
const failedDocs = new Set();
export function retrySaves() { if (state.mode === 'cloud') [...failedDocs].forEach(flush); else saveLocalNow(); }
function save(coll, id) {
  if (state.mode === 'local') { if (!localTimer) localTimer = setTimeout(saveLocalNow, 400); return; }
  if (state.mode !== 'cloud') return;
  const did = `${coll}.${id}`;
  clearTimeout(pending.get(did));
  pending.set(did, setTimeout(() => flush(did), 800)); // one write per pause in typing
}
function flushAll() {
  if (state.mode === 'local') { if (localTimer) saveLocalNow(); } else [...pending.keys()].forEach(flush);
}

/* ---------- mutations ---------- */
export function put(coll, doc) { doc.updatedAt = Date.now(); state[coll][doc.id] = doc; save(coll, doc.id); emit(); }
export function remove(coll, id) { delete state[coll][id]; save(coll, id); emit(); }
export function setKV(key, value) { state.kv[key] = { ...value, id: key, updatedAt: Date.now() }; save('kv', key); emit(); }
export function patchSettings(patch) { setKV('settings', { ...settings(), ...patch }); }

/* ---------- backup ---------- */
export function exportAll() {
  return JSON.stringify({ app: 'lift-ledger', version: 1, plans: state.plans, sessions: state.sessions, notes: state.notes, food: state.food, kv: state.kv });
}
export function importAll(data) {
  if (!data || data.app !== 'lift-ledger' || typeof data.sessions !== 'object') throw new Error('That file is not a Lift Ledger backup.');
  const before = new Set();
  for (const c of COLLECTIONS) for (const id of Object.keys(state[c])) before.add(`${c}.${id}`);
  for (const c of COLLECTIONS) state[c] = data[c] && typeof data[c] === 'object' ? clone(data[c]) : {};
  state.kv = { ...emptyKV(), ...(data.kv && typeof data.kv === 'object' ? clone(data.kv) : {}) };
  for (const c of COLLECTIONS) for (const id of Object.keys(state[c])) before.add(`${c}.${id}`);
  for (const did of before) { const dot = did.indexOf('.'); save(did.slice(0, dot), did.slice(dot + 1)); }
  for (const k of KV_KEYS) save('kv', k);
  emit();
}

/* ---------- start-up ---------- */
function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || 'null');
    if (raw) { for (const c of COLLECTIONS) if (raw[c]) state[c] = raw[c]; state.kv = { ...emptyKV(), ...(raw.kv || {}) }; }
  } catch (e) { /* start empty */ }
}
export async function initStore() {
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushAll(); });
  }
  const claude = getClaude();
  if (claude) {
    try {
      const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
      const id = user ? await user.id() : null;
      if (db && id) {
        col = db.collection(`data/users/${id}`); state.mode = 'cloud';
        const timer = setTimeout(() => { state.slow = true; emit(); }, 10000);
        col.onSnapshot((snap) => {
          const seen = new Set();
          for (const d of snap.docs) { seen.add(d.id); if (!isBusy(d.id)) applyRemote(d.id, clone(d.data() || null)); }
          if (!snap.metadata.fromCache) {
            for (const did of remoteSeen) if (!seen.has(did) && !isBusy(did)) applyRemote(did, null);
            remoteSeen = seen; clearTimeout(timer); state.slow = false;
          }
          state.ready = true; emit();
        }, () => { clearTimeout(timer); state.slow = false; state.mode = 'error'; state.ready = true; emit(); });
        return;
      }
    } catch (e) { /* fall through to the device */ }
  }
  state.mode = 'local'; loadLocal(); state.ready = true; emit();
}
