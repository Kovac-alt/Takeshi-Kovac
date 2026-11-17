// Which screen is showing. Tabs follow the URL hash so each can be linked and bookmarked.
import { useEffect, useState } from 'preact/hooks';

export const TABS = [
  { id: 'today', name: 'Today' },
  { id: 'train', name: 'Train' },
  { id: 'food', name: 'Food' },
  { id: 'meals', name: 'Meals' },
  { id: 'progress', name: 'Progress' },
];

const nav = { tab: 'today', workoutOpen: false, foodDay: null, mealsView: 'plan' };
const subs = new Set();

function readHash() {
  const h = (typeof location !== 'undefined' ? location.hash : '').replace('#', '');
  return TABS.some((t) => t.id === h) ? h : 'today';
}

export function setNav(patch) {
  Object.assign(nav, patch);
  if (patch.tab && typeof location !== 'undefined' && readHash() !== patch.tab) {
    try { history.replaceState(null, '', '#' + patch.tab); } catch { location.hash = patch.tab; }
  }
  if (patch.tab && typeof window !== 'undefined') window.scrollTo(0, 0);
  subs.forEach((f) => f({}));
}

export function useNav() {
  const [, set] = useState({});
  useEffect(() => {
    subs.add(set);
    const onHash = () => { nav.tab = readHash(); subs.forEach((f) => f({})); };
    window.addEventListener('hashchange', onHash);
    return () => { subs.delete(set); window.removeEventListener('hashchange', onHash); };
  }, []);
  return nav;
}

nav.tab = readHash();
