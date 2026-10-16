import type { Trace } from '../tm/engine.ts';
import { formatConfig } from '../tm/format.ts';
import { h } from './dom.ts';

/** Long runs only render a window of configurations around the current step. */
const WINDOW = 300;
/** Long configurations are shortened to this many symbols on each side of the head. */
const CONTEXT = 16;

/** The computation k₀ ⊢ k₁ ⊢ … with the current configuration highlighted. Click to jump. */
export class ChainView {
  readonly root = h('ol', { class: 'chain' });
  private trace: Trace | null = null;
  private start = 0;
  private end = 0;
  private items: HTMLElement[] = [];
  private current: HTMLElement | null = null;

  constructor(onPick: (index: number) => void) {
    this.root.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
      if (item) onPick(Number(item.dataset.index));
    });
  }

  setup(trace: Trace): void {
    this.trace = trace;
    this.renderWindow(0);
  }

  private renderWindow(index: number): void {
    const trace = this.trace!;
    this.start = Math.max(0, Math.min(index - WINDOW / 2, trace.length - WINDOW));
    this.end = Math.min(trace.length, this.start + WINDOW);
    const nodes: Node[] = [];
    if (this.start > 0) nodes.push(h('li', { class: 'chain-gap' }, `${this.start.toLocaleString('en')} earlier steps`));
    this.items = [];
    for (let i = this.start; i < this.end; i++) {
      const button = h(
        'button',
        { type: 'button', class: 'config', 'data-index': i, title: `Step ${i}` },
        formatConfig(trace.machine, trace.at(i), { context: CONTEXT }),
      );
      this.items.push(button);
      nodes.push(h('li', {}, h('span', { class: 'config-step' }, String(i)), button));
    }
    if (this.end < trace.length) nodes.push(h('li', { class: 'chain-gap' }, `${(trace.length - this.end).toLocaleString('en')} more steps`));
    this.root.replaceChildren(...nodes);
    this.current = null;
  }

  show(index: number): void {
    const total = this.trace!.length;
    const margin = WINDOW / 8;
    const nearEdge = (index < this.start + margin && this.start > 0) || (index >= this.end - margin && this.end < total);
    if (nearEdge || index < this.start || index >= this.end) this.renderWindow(index);

    this.current?.classList.remove('current');
    this.current?.removeAttribute('aria-current');
    this.current = this.items[index - this.start];
    this.current.classList.add('current');
    this.current.setAttribute('aria-current', 'step');

    // keep the current configuration visible inside the panel without scrolling the page
    const item = this.current.parentElement!;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < this.root.scrollTop) this.root.scrollTop = top - 8;
    else if (bottom > this.root.scrollTop + this.root.clientHeight) this.root.scrollTop = bottom - this.root.clientHeight + 8;
  }
}
