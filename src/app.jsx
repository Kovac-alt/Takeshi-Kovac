import { useEffect } from 'preact/hooks';
import { activeSession, useStore } from './core/store.js';
import { Icon, Overlays } from './ui/kit.jsx';
import { TABS, setNav, useNav } from './ui/nav.js';
import { Onboarding } from './views/goals.jsx';
import { TodayView } from './views/today.jsx';
import { TrainView } from './views/train.jsx';
import { FoodView } from './views/food.jsx';
import { MealsView } from './views/meals.jsx';
import { ProgressView } from './views/progress.jsx';
import { RestBar, WorkoutScreen, startWorkout } from './views/workout.jsx';

const VIEWS = { today: TodayView, train: TrainView, food: FoodView, meals: MealsView, progress: ProgressView };

export function App() {
  const state = useStore();
  const nav = useNav();
  const live = activeSession();
  useEffect(() => { document.title = 'Lift Ledger'; }, []);
  if (!state.settings.onboarded) return <><Onboarding /><Overlays /></>;
  const View = VIEWS[nav.tab] || TodayView;
  const inWorkout = nav.workoutOpen && live;
  return (
    <div class="app">
      <nav class="tabbar" aria-label="Sections" hidden={!!inWorkout}>
        <span class="brand" aria-hidden="true">LL</span>
        {TABS.map((t) => (
          <button key={t.id} class={nav.tab === t.id ? 'on' : ''} aria-current={nav.tab === t.id ? 'page' : undefined} onClick={() => setNav({ tab: t.id })}>
            <Icon name={t.id} /><span>{t.name}</span>
          </button>
        ))}
      </nav>
      {inWorkout ? <WorkoutScreen /> : (
        <main class={`page page-${nav.tab}`}>
          {live && nav.tab !== 'today' && nav.tab !== 'train' && (
            <button class="resume-bar" onClick={() => startWorkout()}><Icon name="play" size={16} /> {live.name} in progress. Tap to resume</button>
          )}
          <View />
        </main>
      )}
      {live && <RestBar />}
      <Overlays />
    </div>
  );
}
