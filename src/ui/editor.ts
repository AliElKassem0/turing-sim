import { parseMachine, type SourceError } from '../tm/source.ts';
import type { TuringMachine } from '../tm/types.ts';
import { h } from './dom.ts';
import { icon } from './icons.ts';

export interface EditRequest {
  title: string;
  hint: string;
  source: string;
  /** id the saved machine gets */
  id: string;
  onSave: (machine: TuringMachine, source: string) => void;
}

const SYNTAX: [string, string][] = [
  ['name: My machine', 'display name'],
  ['description: …', 'one sentence about it'],
  ['input: a b', 'input alphabet Σ'],
  ['blank: B', 'blank symbol (default B)'],
  ['start: q0', 'start state'],
  ['accept: q2', 'accepting states'],
  ['examples: ab ε', 'example words, ε = empty'],
  ['note q0: …', 'what a state does'],
  ['q0, a -> q1, b, R', 'δ(q0, a) = (q1, b, R)'],
  ['// …', 'comment'],
];

/** Modal text editor for machine definitions with live validation. */
export class MachineEditor {
  readonly dialog = h('dialog', { class: 'editor', 'aria-labelledby': 'editor-title' });
  private readonly title = h('h2', { id: 'editor-title' });
  private readonly hint = h('p', { class: 'muted' });
  private readonly textarea = h('textarea', {
    class: 'code-input',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
    wrap: 'off',
    'aria-label': 'Machine definition',
  });
  private readonly gutter = h('div', { class: 'gutter', 'aria-hidden': 'true' });
  private readonly status = h('div', { class: 'editor-status', role: 'status' });
  private readonly saveBtn = h('button', { type: 'button', class: 'btn primary' }, icon('check', 15), 'Save and load');
  private request: EditRequest | null = null;
  private result: ReturnType<typeof parseMachine> | null = null;
  private timer: number | undefined;

  constructor() {
    const closeBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close' }, icon('close', 18));
    const cancelBtn = h('button', { type: 'button', class: 'btn' }, 'Cancel');
    const reference = h(
      'aside',
      { class: 'syntax' },
      h('h3', {}, 'Syntax'),
      h('dl', {}, ...SYNTAX.flatMap(([code, text]) => [h('dt', {}, h('code', {}, code)), h('dd', {}, text)])),
      h('p', { class: 'muted' }, 'States and alphabets are inferred from the rules. A missing rule means the machine halts there.'),
    );

    this.dialog.append(
      h(
        'div',
        { class: 'editor-inner' },
        h('header', { class: 'editor-head' }, h('div', {}, this.title, this.hint), closeBtn),
        h(
          'div',
          { class: 'editor-body' },
          h('div', { class: 'code' }, this.gutter, this.textarea),
          reference,
        ),
        h('footer', { class: 'editor-foot' }, this.status, h('div', { class: 'editor-actions' }, cancelBtn, this.saveBtn)),
      ),
    );

    closeBtn.addEventListener('click', () => this.dialog.close());
    cancelBtn.addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.dialog.close(); // click on the backdrop
    });
    this.textarea.addEventListener('input', () => {
      this.renderGutter([]);
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.validate(), 150);
    });
    this.textarea.addEventListener('scroll', () => {
      this.gutter.style.transform = `translateY(${-this.textarea.scrollTop}px)`;
    });
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.save();
      }
    });
    this.saveBtn.addEventListener('click', () => this.save());
  }

  open(request: EditRequest): void {
    this.request = request;
    this.title.textContent = request.title;
    this.hint.textContent = request.hint;
    this.textarea.value = request.source;
    this.textarea.scrollTop = 0;
    this.gutter.style.transform = '';
    this.validate();
    this.dialog.showModal();
    this.textarea.focus();
    this.textarea.setSelectionRange(0, 0);
  }

  private validate(): void {
    this.result = parseMachine(this.textarea.value, this.request!.id);
    this.saveBtn.disabled = !this.result.ok;
    if (this.result.ok) {
      const m = this.result.machine;
      const rules = m.states.reduce((n, q) => n + Object.keys(m.delta[q] ?? {}).length, 0);
      this.status.className = 'editor-status ok';
      this.status.replaceChildren(icon('check', 15), `Valid · ${m.states.length} states · ${rules} rules`);
      this.renderGutter([]);
    } else {
      this.status.className = 'editor-status error';
      const errors = this.result.errors;
      const list = h('ul', {}, ...errors.slice(0, 4).map((e) => this.errorItem(e)));
      if (errors.length > 4) list.append(h('li', {}, `and ${errors.length - 4} more`));
      this.status.replaceChildren(list);
      this.renderGutter(errors.map((e) => e.line));
    }
  }

  private errorItem(error: SourceError): HTMLElement {
    if (error.line === 0) return h('li', {}, icon('alert', 14), error.message);
    const jump = h('button', { type: 'button', class: 'line-link' }, `Line ${error.line}`);
    jump.addEventListener('click', () => this.selectLine(error.line));
    return h('li', {}, icon('alert', 14), jump, error.message);
  }

  private selectLine(line: number): void {
    const lines = this.textarea.value.split('\n');
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    this.textarea.focus();
    this.textarea.setSelectionRange(start, start + lines[line - 1].length);
  }

  private renderGutter(errorLines: number[]): void {
    const count = this.textarea.value.split('\n').length;
    if (this.gutter.childElementCount !== count || errorLines.length || this.gutter.querySelector('.err')) {
      this.gutter.replaceChildren(
        ...Array.from({ length: count }, (_, i) => h('div', { class: errorLines.includes(i + 1) ? 'err' : undefined }, String(i + 1))),
      );
    }
  }

  private save(): void {
    if (!this.result?.ok || !this.request) return;
    this.request.onSave(this.result.machine, this.textarea.value);
    this.dialog.close();
  }
}
