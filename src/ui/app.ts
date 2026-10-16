import { machines as examples } from '../machines/index.ts';
import { DEFAULT_MAX_STEPS, run, validateWord, type Snapshot, type Trace } from '../tm/engine.ts';
import { formatConfig } from '../tm/format.ts';
import { NEW_MACHINE_SOURCE, parseMachine, toSource } from '../tm/source.ts';
import type { TuringMachine } from '../tm/types.ts';
import { ChainView } from './chain.ts';
import { DeltaTableView } from './delta-table.ts';
import { definitionBody } from './definition.ts';
import { h } from './dom.ts';
import { MachineEditor } from './editor.ts';
import { explain } from './explain.ts';
import { icon, logo } from './icons.ts';
import { decodeBase64Url, encodeBase64Url, load, save } from './storage.ts';
import { TapeView } from './tape.ts';
import { themeToggle } from './theme.ts';

const MAX_WORD_LENGTH = 20;
const STORAGE_KEY = 'tm-sim.machines';
const showWord = (w: string) => (w === '' ? 'ε' : w);

interface Entry {
  machine: TuringMachine;
  /** Text source for machines written in the editor. */
  source?: string;
}

export function mountApp(root: HTMLElement): void {
  const builtIn: Entry[] = examples.map((machine) => ({ machine }));
  const custom: Entry[] = [];
  for (const { id, source } of load<{ id: string; source: string }[]>(STORAGE_KEY, [])) {
    const parsed = parseMachine(source, id);
    if (parsed.ok) custom.push({ machine: parsed.machine, source });
  }
  const persist = () => save(STORAGE_KEY, custom.map((e) => ({ id: e.machine.id, source: e.source })));

  let entry: Entry = builtIn[0];
  let trace: Trace;
  let index = 0;
  let timer: number | undefined;

  // ---------- elements ----------
  const shareBtn = h('button', { type: 'button', class: 'btn ghost' }, icon('link', 15), h('span', { class: 'label' }, 'Share'));
  const exampleList = h('ul', { class: 'machine-list' });
  const customList = h('ul', { class: 'machine-list' });
  const newBtn = h('button', { type: 'button', class: 'btn subtle full' }, icon('plus', 15), 'New machine');

  const title = h('h1', { class: 'machine-title' });
  const description = h('p', { class: 'machine-desc' });
  const editBtn = h('button', { type: 'button', class: 'btn' }, icon('code', 15), h('span', { class: 'label' }));
  const deleteBtn = h('button', { type: 'button', class: 'btn danger', title: 'Delete this machine' }, icon('trash', 15));

  const wordInput = h('input', {
    id: 'word',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    placeholder: 'empty word ε',
    'aria-describedby': 'word-error',
  });
  const wordError = h('p', { id: 'word-error', class: 'field-error', role: 'alert' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Example inputs' });
  const wordForm = h(
    'form',
    { class: 'input-bar', novalidate: true },
    h('label', { for: 'word', class: 'eyebrow' }, 'Input'),
    h(
      'div',
      { class: 'field' },
      h('span', { class: 'field-prefix', 'aria-hidden': 'true' }, 'w ='),
      wordInput,
      h('button', { type: 'submit', class: 'btn primary' }, 'Load'),
    ),
  );

  const tape = new TapeView();
  const badge = h('span', { class: 'badge' });
  const stepCounter = h('span', { class: 'step-counter' });
  const configText = h('code', { class: 'config-now' });
  const explanation = h('p', { class: 'explanation', 'aria-live': 'polite' });

  const transport = (name: Parameters<typeof icon>[0], label: string, extra = '') =>
    h('button', { type: 'button', class: `icon-btn transport ${extra}`, title: label, 'aria-label': label }, icon(name, 18));
  const firstBtn = transport('first', 'Reset to the start');
  const prevBtn = transport('prev', 'Previous step (←)');
  const playBtn = transport('play', 'Play (space)', 'play');
  const nextBtn = transport('next', 'Next step (→)');
  const lastBtn = transport('last', 'Run to the end');
  const speed = h('input', { type: 'range', min: 1, max: 30, value: 5, id: 'speed', 'aria-label': 'Speed in steps per second' });
  const speedLabel = h('output', { for: 'speed' });

  const deltaTable = new DeltaTableView();
  const chain = new ChainView((i) => {
    pause();
    goTo(i);
  });
  const chainCount = h('span', { class: 'panel-meta' });
  const definition = h('div');
  const editor = new MachineEditor();
  const toast = h('div', { class: 'toast', role: 'status' });

  const panelHead = (heading: string, ...extra: (Node | string)[]) =>
    h('header', { class: 'panel-head' }, h('h2', {}, heading), ...extra);

  root.replaceChildren(
    h(
      'header',
      { class: 'topbar' },
      h('a', { class: 'brand', href: './' }, logo(28), h('span', {}, 'Turing Machine Simulator')),
      h('div', { class: 'topbar-actions' }, shareBtn, themeToggle()),
    ),
    h(
      'div',
      { class: 'layout' },
      h(
        'aside',
        { class: 'sidebar', 'aria-label': 'Machines' },
        h('section', {}, h('h2', { class: 'eyebrow' }, 'Examples'), exampleList),
        h('section', {}, h('h2', { class: 'eyebrow' }, 'Your machines'), customList, newBtn),
      ),
      h(
        'main',
        { class: 'workspace' },
        h(
          'div',
          { class: 'machine-head' },
          h('div', { class: 'machine-meta' }, title, description),
          h('div', { class: 'machine-actions' }, editBtn, deleteBtn),
        ),
        h(
          'section',
          { class: 'panel stage' },
          h('div', { class: 'stage-input' }, wordForm, chips, wordError),
          tape.root,
          h(
            'div',
            { class: 'stage-info' },
            h('div', { class: 'status-row' }, badge, stepCounter, h('span', { class: 'config-wrap' }, h('span', { class: 'muted' }, 'Configuration'), configText)),
            explanation,
          ),
          h(
            'div',
            { class: 'controls' },
            h('div', { class: 'transport-group' }, firstBtn, prevBtn, playBtn, nextBtn, lastBtn),
            h('label', { class: 'speed' }, h('span', { class: 'muted' }, 'Speed'), speed, speedLabel),
            h('p', { class: 'kbd-hint' }, h('kbd', {}, '←'), h('kbd', {}, '→'), ' step ', h('kbd', {}, 'Space'), ' play'),
          ),
        ),
        h(
          'div',
          { class: 'split' },
          h(
            'section',
            { class: 'panel' },
            panelHead(
              'Transition function',
              h(
                'div',
                { class: 'legend' },
                h('span', {}, h('i', { class: 'swatch apply' }), 'next'),
                h('span', {}, h('i', { class: 'swatch stuck' }), 'undefined'),
                h('span', {}, h('i', { class: 'swatch accept' }), 'accepting'),
              ),
            ),
            deltaTable.root,
          ),
          h('section', { class: 'panel' }, panelHead('Computation', chainCount), chain.root),
        ),
        h('section', { class: 'panel' }, panelHead('Formal definition'), definition),
      ),
    ),
    h('footer', { class: 'footer' }, `© ${new Date().getFullYear()} Ali El Kassem`),
    editor.dialog,
    toast,
  );

  // ---------- machines ----------
  function machineItem(e: Entry): HTMLElement {
    const b = h(
      'button',
      { type: 'button', class: 'machine-item', 'aria-current': e === entry ? 'true' : undefined },
      h('span', { class: 'mi-name' }, e.machine.name),
      h('span', { class: 'mi-desc' }, e.machine.description || `${e.machine.states.length} states`),
    );
    b.addEventListener('click', () => selectMachine(e));
    return h('li', {}, b);
  }

  function renderSidebar(): void {
    exampleList.replaceChildren(...builtIn.map(machineItem));
    customList.replaceChildren(
      ...(custom.length ? custom.map(machineItem) : [h('li', { class: 'empty' }, 'Write your own machine in a simple text format.')]),
    );
    // on narrow screens the lists scroll sideways: bring the selected machine into view
    for (const list of [exampleList, customList]) {
      const current = list.querySelector<HTMLElement>('[aria-current="true"]')?.parentElement;
      if (current && list.scrollWidth > list.clientWidth) list.scrollLeft = current.offsetLeft - 16;
    }
  }

  function selectMachine(e: Entry, word?: string): void {
    entry = e;
    const m = e.machine;
    title.textContent = m.name;
    description.textContent = m.description;
    description.hidden = !m.description;
    const isCustom = custom.includes(e);
    editBtn.querySelector('.label')!.textContent = isCustom ? 'Edit' : 'Edit a copy';
    deleteBtn.hidden = !isCustom;
    // numeric keypad on phones when Σ only has digits
    wordInput.inputMode = m.inputAlphabet.every((a) => /^\d$/.test(a)) ? 'numeric' : 'text';
    wordInput.placeholder = `word over {${m.inputAlphabet.join(', ')}}, empty = ε`;
    deltaTable.setup(m);
    definition.replaceChildren(definitionBody(m));
    chips.replaceChildren(
      ...(m.examples ?? []).map((w) => {
        const chip = h('button', { type: 'button', class: 'chip', 'data-word': w }, showWord(w));
        chip.addEventListener('click', () => {
          wordInput.value = w;
          clearError();
          loadWord(w);
        });
        return chip;
      }),
    );
    renderSidebar();
    const initial = word ?? m.examples?.[0] ?? '';
    wordInput.value = initial;
    clearError();
    loadWord(initial);
  }

  function openEditor(mode: 'new' | 'edit'): void {
    const isCustom = custom.includes(entry);
    const editing = mode === 'edit' && isCustom;
    const id = editing ? entry.machine.id : `custom-${Date.now().toString(36)}`;
    const source = mode === 'new' ? NEW_MACHINE_SOURCE : (entry.source ?? toSource(entry.machine));
    editor.open({
      title: mode === 'new' ? 'New machine' : editing ? `Edit ${entry.machine.name}` : `Edit a copy of ${entry.machine.name}`,
      hint: editing ? 'Changes replace this machine.' : 'Saving adds the machine to “Your machines” in this browser.',
      source: mode === 'edit' && !isCustom ? source.replace(/^name: (.*)$/m, 'name: $1 (copy)') : source,
      id,
      onSave: (machine, src) => {
        const saved: Entry = { machine, source: src };
        const at = custom.findIndex((e) => e.machine.id === id);
        if (at >= 0) custom[at] = saved;
        else custom.push(saved);
        persist();
        selectMachine(saved);
        notify('Machine saved');
      },
    });
  }

  // ---------- running ----------
  function loadWord(word: string): void {
    pause();
    trace = run(entry.machine, word, DEFAULT_MAX_STEPS);
    for (const chip of chips.querySelectorAll<HTMLElement>('[data-word]')) {
      chip.setAttribute('aria-pressed', String(chip.dataset.word === word));
    }
    tape.setup(trace);
    chain.setup(trace);
    chainCount.textContent = `${trace.steps.toLocaleString('en')} step${trace.steps === 1 ? '' : 's'}`;
    index = 0;
    render(false);
    syncUrl();
  }

  function goTo(i: number, animate = false): void {
    const next = Math.max(0, Math.min(i, trace.length - 1));
    if (next === index && i !== index) return;
    index = next;
    render(animate);
  }

  function render(animate: boolean): void {
    const snap: Snapshot = trace.at(index);
    const last = trace.length - 1;
    tape.show(snap, animate);
    deltaTable.show(snap);
    chain.show(index);

    const status = snap.halt ?? 'running';
    const labels = { running: 'Running', accept: 'Accepted', reject: 'Rejected', limit: 'Step limit reached' };
    badge.className = `badge ${status}`;
    badge.replaceChildren(h('i', { class: 'dot' }), labels[status]);
    stepCounter.replaceChildren('Step ', h('b', {}, index.toLocaleString('en')), ` / ${last.toLocaleString('en')}`);
    configText.textContent = formatConfig(entry.machine, snap, { context: 24 });
    explanation.textContent = explain(entry.machine, snap, trace.maxSteps);
    explanation.className = `explanation ${status}`;

    firstBtn.disabled = prevBtn.disabled = index === 0;
    nextBtn.disabled = lastBtn.disabled = index === last;
  }

  // ---------- auto-play ----------
  const stepsPerSecond = () => Number(speed.value);

  function play(): void {
    if (index === trace.length - 1) goTo(0);
    playBtn.replaceChildren(icon('pause', 18));
    playBtn.setAttribute('aria-label', 'Pause (space)');
    playBtn.title = 'Pause (space)';
    tick();
  }

  function tick(): void {
    timer = window.setTimeout(() => {
      goTo(index + 1, stepsPerSecond() <= 12);
      if (index >= trace.length - 1) pause();
      else tick();
    }, 1000 / stepsPerSecond());
  }

  function pause(): void {
    if (timer === undefined) return;
    window.clearTimeout(timer);
    timer = undefined;
    playBtn.replaceChildren(icon('play', 18));
    playBtn.setAttribute('aria-label', 'Play (space)');
    playBtn.title = 'Play (space)';
  }

  const togglePlay = () => (timer === undefined ? play() : pause());

  function updateSpeed(): void {
    speedLabel.textContent = `${speed.value}/s`;
    const ms = Math.min(260, Math.round(700 / stepsPerSecond()));
    tape.root.style.setProperty('--move-ms', `${ms}ms`);
  }

  // ---------- URL and sharing ----------
  function syncUrl(): void {
    const params = new URLSearchParams();
    if (entry.source !== undefined) params.set('src', encodeBase64Url(entry.source));
    else params.set('m', entry.machine.id);
    params.set('w', trace.word);
    history.replaceState(null, '', `#${params}`);
  }

  function fromUrl(): boolean {
    const params = new URLSearchParams(location.hash.slice(1));
    const word = params.get('w') ?? undefined;
    const wordFor = (m: TuringMachine) => (word !== undefined && !validateWord(m, word, MAX_WORD_LENGTH) ? word : undefined);
    const id = params.get('m');
    const src = params.get('src');
    if (id) {
      const found = [...builtIn, ...custom].find((e) => e.machine.id === id);
      if (found) return selectMachine(found, wordFor(found.machine)), true;
    }
    if (src) {
      const source = decodeBase64Url(src);
      if (source === null) return false;
      let found = custom.find((e) => e.source === source);
      if (!found) {
        const parsed = parseMachine(source, `custom-${Date.now().toString(36)}`);
        if (!parsed.ok) return false;
        found = { machine: parsed.machine, source };
        custom.push(found);
        persist();
      }
      selectMachine(found, wordFor(found.machine));
      return true;
    }
    return false;
  }

  let toastTimer: number | undefined;
  function notify(message: string): void {
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  // ---------- events ----------
  function clearError(): void {
    wordError.textContent = '';
    wordInput.removeAttribute('aria-invalid');
  }

  wordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = wordInput.value.trim();
    const word = raw === 'ε' ? '' : raw;
    const error = validateWord(entry.machine, word, MAX_WORD_LENGTH);
    wordError.textContent = error ?? '';
    wordInput.setAttribute('aria-invalid', String(Boolean(error)));
    if (!error) loadWord(word);
  });
  wordInput.addEventListener('input', clearError);

  firstBtn.addEventListener('click', () => (pause(), goTo(0)));
  prevBtn.addEventListener('click', () => (pause(), goTo(index - 1, true)));
  nextBtn.addEventListener('click', () => (pause(), goTo(index + 1, true)));
  lastBtn.addEventListener('click', () => (pause(), goTo(trace.length - 1)));
  playBtn.addEventListener('click', togglePlay);
  speed.addEventListener('input', updateSpeed);

  newBtn.addEventListener('click', () => openEditor('new'));
  editBtn.addEventListener('click', () => openEditor('edit'));
  deleteBtn.addEventListener('click', () => {
    if (!confirm(`Delete “${entry.machine.name}” from this browser?`)) return;
    custom.splice(custom.indexOf(entry), 1);
    persist();
    selectMachine(builtIn[0]);
    notify('Machine deleted');
  });
  shareBtn.addEventListener('click', async () => {
    syncUrl();
    try {
      await navigator.clipboard.writeText(location.href);
      notify('Link copied to the clipboard');
    } catch {
      notify('Copy the link from the address bar');
    }
  });

  const isTyping = (t: EventTarget | null) =>
    t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;

  document.addEventListener('keydown', (e) => {
    if (editor.dialog.open || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
    if (e.key === 'ArrowLeft') {
      pause();
      goTo(index - 1, true);
    } else if (e.key === 'ArrowRight') {
      pause();
      goTo(index + 1, true);
    } else if (e.key === ' ') {
      if (!e.repeat) togglePlay();
    } else return;
    e.preventDefault();
  });
  // A focused button would also "click" on space release; the shortcut already handled it.
  document.addEventListener('keyup', (e) => {
    if (e.key === ' ' && e.target instanceof HTMLButtonElement && !editor.dialog.open) e.preventDefault();
  });

  // a pasted share link in an open tab only changes the hash
  window.addEventListener('hashchange', () => fromUrl());

  updateSpeed();
  if (!fromUrl()) selectMachine(entry);
}
