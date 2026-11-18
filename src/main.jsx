import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { state, ui, setUI, subscribe, initStore, savingCount, retrySaves } from './core/store.js';
import { activeSession } from './core/actions.js';
import { Toast } from './ui.jsx';
import { Today } from './views/today.jsx';
import { Workout, RestBar } from './views/workout.jsx';
import { Plans, PlanEditor } from './views/plans.jsx';
import { History, SessionDetail } from './views/history.jsx';
import { Food } from './views/food.jsx';
import { Notes, NoteEditor } from './views/notes.jsx';
import { Settings } from './views/settings.jsx';

const TABS = [['today', 'Today', Today], ['plans', 'Plans', Plans], ['history', 'History', History], ['food', 'Food', Food], ['notes', 'Notes', Notes]];
const SCREENS = { workout: Workout, plan: PlanEditor, session: SessionDetail, note: NoteEditor, settings: Settings };

function StatusChip() {
  if (state.failed) return <button class="status fail" onClick={retrySaves}>Not saved · Retry</button>;
  if (state.mode === 'cloud') return <span class="status">{savingCount() ? 'Saving…' : 'Saved to your account'}</span>;
  if (state.mode === 'local') return <span class="status">Saved on this device</span>;
  return state.mode === 'error' ? <span class="status fail">Can’t reach your data</span> : <span class="status">Loading…</span>;
}

function App() {
  const [, bump] = useState(0);
  useEffect(() => { const off = subscribe(() => bump((n) => n + 1)); initStore(); return off; }, []);
  useEffect(() => {
    const onHash = () => { const t = location.hash.slice(1); if (TABS.some(([id]) => id === t)) setUI({ tab: t, screen: null }); };
    onHash(); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [ui.tab, ui.screen && ui.screen.name, ui.screen && ui.screen.id]);
  const scr = ui.screen, Screen = scr && SCREENS[scr.name], Tab = (TABS.find(([id]) => id === ui.tab) || TABS[0])[2];
  const act = state.ready ? activeSession() : null;
  return (
    <div class={`app${scr ? ' on-screen' : ''}`}>
      {!scr && (
        <header class="hdr"><div class="hdr-in"><h1>Lift <span>Ledger</span></h1><StatusChip /><button class="btn ghost sm" onClick={() => setUI({ screen: { name: 'settings' } })}>Settings</button></div></header>
      )}
      <main class="content">
        {state.slow && <p class="banner">Your data is taking a while to arrive. Anything shown may be out of date.</p>}
        {state.mode === 'error' && <p class="banner">Your saved data can’t be reached right now. Reload the page in a moment.</p>}
        {!state.ready ? <p class="empty">Opening your log…</p> : Screen ? <Screen id={scr.id} /> : <Tab />}
      </main>
      {act && !(scr && scr.name === 'workout') && !ui.rest && <button class="resume" onClick={() => setUI({ screen: { name: 'workout' } })}>Workout in progress · <b>Resume</b></button>}
      <RestBar />
      {!scr && <nav class="tabbar" aria-label="Sections">{TABS.map(([id, label]) => <a href={`#${id}`} aria-current={ui.tab === id ? 'page' : undefined} onClick={() => { if (ui.tab === id) setUI({ screen: null }); }}>{label}</a>)}</nav>}
      <Toast />
    </div>
  );
}

render(<App />, document.getElementById('app'));
