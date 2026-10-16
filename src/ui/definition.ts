import { subscriptState as sub } from '../tm/format.ts';
import type { TuringMachine } from '../tm/types.ts';
import { h } from './dom.ts';

const set = (items: string[]) => `{${items.join(', ')}}`;

/** The formal 7-tuple M = (Q, Σ, Γ, δ, q₀, B, F) with the actual sets. */
export function definitionBody(m: TuringMachine): HTMLElement {
  const rules = m.states.reduce((n, q) => n + Object.values(m.delta[q] ?? {}).filter(Boolean).length, 0);
  const rows: [string, string, string][] = [
    ['Q', set(m.states.map(sub)), 'states'],
    ['Σ', set(m.inputAlphabet), 'input alphabet'],
    ['Γ', set(m.tapeAlphabet), 'tape alphabet'],
    ['δ', `Q × Γ ⇀ Q × Γ × {L, R, N}`, `partial, ${rules} rules`],
    [sub(m.startState), '', 'start state'],
    [m.blank, '', 'blank symbol'],
    ['F', set(m.acceptStates.map(sub)), 'accepting states'],
  ];
  return h(
    'div',
    { class: 'definition' },
    h('p', { class: 'tuple' }, `M = (Q, Σ, Γ, δ, ${sub(m.startState)}, ${m.blank}, F)`),
    h(
      'dl',
      {},
      ...rows.flatMap(([k, v, label]) => [
        h('dt', {}, k),
        h('dd', {}, v && h('span', { class: 'set' }, v), h('span', { class: 'dd-label' }, label)),
      ]),
    ),
  );
}
