import type { Snapshot } from '../tm/engine.ts';
import { subscriptState as sub } from '../tm/format.ts';
import type { TuringMachine } from '../tm/types.ts';
import { h } from './dom.ts';

/** The transition table with the entry for the next step highlighted. */
export class DeltaTableView {
  readonly root = h('div', { class: 'table-scroll' });
  private cells = new Map<string, HTMLElement>();
  private rows = new Map<string, HTMLElement>();
  private active: HTMLElement[] = [];

  setup(machine: TuringMachine): void {
    this.cells.clear();
    this.rows.clear();
    this.active = [];
    const notes = machine.stateNotes;
    const head = h(
      'tr',
      {},
      h('th', { scope: 'col', class: 'corner' }, 'δ'),
      ...machine.tapeAlphabet.map((a) => h('th', { scope: 'col', class: 'sym' }, a)),
      notes && h('th', { scope: 'col', class: 'note' }, 'Role'),
    );

    const body = h('tbody');
    for (const q of machine.states) {
      const label = h('th', { scope: 'row' }, h('span', { class: 'state-name' }, sub(q)));
      if (q === machine.startState) label.append(h('span', { class: 'tag start', title: 'start state' }, 'start'));
      if (machine.acceptStates.includes(q)) label.append(h('span', { class: 'tag accept', title: 'accepting state' }, 'accept'));
      const row = h('tr', {}, label);
      for (const a of machine.tapeAlphabet) {
        const t = machine.delta[q]?.[a];
        const cell = h('td', { class: t ? 'sym' : 'sym none' }, t ? `${sub(t.next)}, ${t.write}, ${t.move}` : '–');
        row.append(cell);
        this.cells.set(`${q}\u0000${a}`, cell);
      }
      if (notes) row.append(h('td', { class: 'note' }, notes[q] ?? ''));
      body.append(row);
      this.rows.set(q, row);
    }
    this.root.replaceChildren(h('table', { class: 'delta' }, h('thead', {}, head), body));
  }

  show(snap: Snapshot): void {
    for (const el of this.active) el.classList.remove('hl-apply', 'hl-stuck', 'hl-accept', 'row-active');
    const cell = this.cells.get(`${snap.state}\u0000${snap.read}`);
    const row = this.rows.get(snap.state);
    const kind = snap.halt === 'accept' ? 'hl-accept' : snap.halt === 'reject' ? 'hl-stuck' : 'hl-apply';
    this.active = [];
    if (row) {
      row.classList.add('row-active');
      this.active.push(row);
    }
    if (cell) {
      cell.classList.add(kind);
      this.active.push(cell);
    }
  }
}
