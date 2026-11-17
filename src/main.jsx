import { render } from 'preact';
import { App } from './app.jsx';
import { initStore } from './core/store.js';

initStore();
render(<App />, document.getElementById('app'));
