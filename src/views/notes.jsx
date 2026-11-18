import { useState } from 'preact/hooks';
import { state, setUI, put, remove } from '../core/store.js';
import { newNote } from '../core/model.js';
import { toast } from '../core/actions.js';
import { fmtDate } from '../core/stats.js';
import { ConfirmButton, ScreenHead, Field } from '../ui.jsx';

export function Notes() {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const notes = Object.values(state.notes).filter((n) => !needle || (n.title + ' ' + n.body).toLowerCase().includes(needle)).sort((a, b) => (b.pinned - a.pinned) || b.updatedAt - a.updatedAt);
  return (
    <>
      <div class="actions"><input id="notes-q" class="grow" type="search" placeholder="Search notes" value={q} onInput={(e) => setQ(e.target.value)} />
        <button class="btn primary" onClick={() => { const n = newNote(); put('notes', n); setUI({ screen: { name: 'note', id: n.id } }); }}>New note</button></div>
      <section class="card">
        <div class="list">
          {notes.map((n) => <button class="row" onClick={() => setUI({ screen: { name: 'note', id: n.id } })}><span class="row-main"><b>{n.title || 'Untitled note'}</b><small>{n.body.slice(0, 90) || 'Empty'}</small></span><span class="muted small">{n.pinned ? '★ ' : ''}{fmtDate(n.updatedAt, { day: 'numeric', month: 'short' })}</span></button>)}
          {!notes.length && <p class="empty">{needle ? 'No note matches that.' : 'Keep cues, machine settings, injuries to watch and goals here.'}</p>}
        </div>
      </section>
    </>
  );
}
export function NoteEditor({ id }) {
  const n = state.notes[id];
  if (!n) return <><ScreenHead title="Note" /><p class="empty">This note no longer exists.</p></>;
  const save = () => put('notes', n);
  return (
    <>
      <ScreenHead title="Note" right={<button class="btn sm" aria-pressed={n.pinned} onClick={() => { n.pinned = !n.pinned; save(); }}>{n.pinned ? '★ Pinned' : '☆ Pin'}</button>} />
      <Field label="Title"><input id="note-title" type="text" maxlength="80" value={n.title} onInput={(e) => { n.title = e.target.value; save(); }} /></Field>
      <Field label="Note"><textarea id="note-body" rows="12" maxlength="8000" value={n.body} onInput={(e) => { n.body = e.target.value; save(); }} /></Field>
      <p class="muted small">Saved as you type.</p>
      <div class="actions end"><ConfirmButton label="Delete note" confirm="Tap again to delete" onConfirm={() => { remove('notes', n.id); setUI({ screen: null }); toast('Note deleted.'); }} /></div>
    </>
  );
}
