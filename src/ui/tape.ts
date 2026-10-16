import type { Snapshot, Trace } from '../tm/engine.ts';
import { subscriptState } from '../tm/format.ts';
import { h } from './dom.ts';

/** Blank cells shown on each side of the area the run uses. */
const PADDING = 2;
/** Tapes up to this many cells are drawn in full; longer ones get a window that follows the head. */
const MAX_FULL = 300;
const WINDOW_RADIUS = 60;

/** The tape: a row of cells and a head that glides between them. */
export class TapeView {
  readonly root = h('div', { class: 'tape', role: 'img' });
  private readonly track = h('div', { class: 'tape-track' });
  private readonly row = h('div', { class: 'tape-row' });
  private readonly headState = h('span', { class: 'head-state' });
  private readonly head = h(
    'div',
    { class: 'head', 'aria-hidden': 'true' },
    h('div', { class: 'head-label' }, this.headState, h('span', { class: 'head-caret' })),
    h('div', { class: 'head-ring' }),
  );
  private cells = new Map<number, HTMLElement>();
  private range: [number, number] | null = null;
  private extent: [number, number] = [0, 0];
  private blank = 'B';

  constructor() {
    this.track.append(this.row, this.head);
    this.root.append(this.track);
  }

  setup(trace: Trace): void {
    this.blank = trace.machine.blank;
    const [lo, hi] = trace.extent;
    this.extent = [lo - PADDING, hi + PADDING];
    this.range = null;
  }

  /** `animate`: glide the head and flash written cells (single steps), or jump (loads, seeks). */
  show(snap: Snapshot, animate: boolean): void {
    if (this.ensureRange(snap.head)) animate = false;
    this.root.classList.toggle('no-anim', !animate);
    this.root.dataset.status = snap.halt ?? 'running';
    this.root.setAttribute('aria-label', `Tape, head on cell ${snap.head} in state ${snap.state}`);

    for (const [pos, cell] of this.cells) {
      const symbol = snap.tape.get(pos) ?? this.blank;
      if (cell.textContent !== symbol) {
        cell.textContent = symbol;
        cell.classList.toggle('blank', symbol === this.blank);
        if (animate) {
          cell.classList.remove('written');
          void cell.offsetWidth; // restart the animation
          cell.classList.add('written');
        }
      }
      cell.classList.toggle('under-head', pos === snap.head);
    }

    this.headState.textContent = subscriptState(snap.state);
    const cell = this.cells.get(snap.head)!;
    const x = cell.offsetLeft;
    this.head.style.transform = `translateX(${x}px)`;
    const left = x + cell.offsetWidth / 2 - this.root.clientWidth / 2;
    this.root.scrollTo({ left, behavior: animate ? 'smooth' : 'auto' });
  }

  /** Builds the cells for the visible range. Returns true if they were rebuilt. */
  private ensureRange(head: number): boolean {
    const [lo, hi] = this.extent;
    let next: [number, number];
    if (hi - lo + 1 <= MAX_FULL) next = [lo, hi];
    else if (this.range && head - this.range[0] >= 10 && this.range[1] - head >= 10) return false;
    else next = [Math.max(lo, head - WINDOW_RADIUS), Math.min(hi, head + WINDOW_RADIUS)];
    if (this.range && this.range[0] === next[0] && this.range[1] === next[1]) return false;

    this.range = next;
    this.cells.clear();
    const columns: HTMLElement[] = [];
    for (let pos = next[0]; pos <= next[1]; pos++) {
      const cell = h('div', { class: 'cell' });
      this.cells.set(pos, cell);
      columns.push(h('div', { class: 'tape-col' }, cell, h('div', { class: 'cell-index' }, String(pos))));
    }
    this.row.replaceChildren(...columns);
    return true;
  }
}
