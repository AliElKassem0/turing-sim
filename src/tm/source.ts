import type { Move, Transition, TransitionTable, TuringMachine } from './types.ts';
import { validateMachine } from './validate.ts';

/**
 * Plain-text machine format used by the editor and share links:
 *
 *   name: Binary increment
 *   input: 0 1
 *   blank: B
 *   start: q0
 *   accept: q2
 *   q0, 0 -> q0, 0, R
 *
 * Header lines are "key: value", rules are "state, read -> next, write, move".
 * Everything after // is a comment.
 */

export interface SourceError {
  /** 1-based line number, or 0 for problems with the machine as a whole. */
  line: number;
  message: string;
}

export type ParseResult = { ok: true; machine: TuringMachine } | { ok: false; errors: SourceError[] };

const KEYS = ['name', 'description', 'input', 'tape', 'blank', 'start', 'accept', 'states', 'examples'] as const;
type Key = (typeof KEYS)[number];

const list = (value: string) => value.split(/[\s,]+/).filter(Boolean);
const EMPTY_WORD = 'ε';

export function parseMachine(text: string, id = 'custom'): ParseResult {
  const errors: SourceError[] = [];
  const header = new Map<Key, { value: string; line: number }>();
  const notes: Record<string, string> = {};
  const delta: TransitionTable = {};
  const seenStates: string[] = [];
  const seenSymbols: string[] = [];
  const addState = (q: string) => seenStates.includes(q) || seenStates.push(q);
  const addSymbol = (a: string) => seenSymbols.includes(a) || seenSymbols.push(a);

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const src = raw.replace(/(^|\s)\/\/.*$/, '').trim();
    if (!src) return;

    const arrow = src.match(/->|→/);
    if (arrow) {
      const lhs = list(src.slice(0, arrow.index));
      const rhs = list(src.slice(arrow.index! + arrow[0].length));
      if (lhs.length !== 2 || rhs.length !== 3) {
        errors.push({ line, message: 'A rule looks like "q0, a -> q1, b, R".' });
        return;
      }
      const [q, a] = lhs;
      const [next, write, move] = rhs;
      for (const sym of [a, write]) {
        if ([...sym].length !== 1) errors.push({ line, message: `Tape symbols are single characters, "${sym}" is not.` });
      }
      if (!['L', 'R', 'N'].includes(move)) {
        errors.push({ line, message: `The move must be L, R or N, not "${move}".` });
        return;
      }
      if (delta[q]?.[a]) {
        errors.push({ line, message: `There is already a rule for δ(${q}, ${a}). The machine must be deterministic.` });
        return;
      }
      (delta[q] ??= {})[a] = { next, write, move: move as Move } satisfies Transition;
      addState(q);
      addState(next);
      addSymbol(a);
      addSymbol(write);
      return;
    }

    const kv = src.match(/^([A-Za-z]+)(?:\s+(\S+))?\s*:\s*(.*)$/);
    if (!kv) {
      errors.push({ line, message: 'Expected "key: value" or a rule "q0, a -> q1, b, R".' });
      return;
    }
    const [, rawKey, arg, value] = kv;
    const key = rawKey.toLowerCase();
    if (key === 'note' && arg) {
      notes[arg] = value.trim();
    } else if ((KEYS as readonly string[]).includes(key) && !arg) {
      if (header.has(key as Key)) errors.push({ line, message: `"${key}" is set twice.` });
      header.set(key as Key, { value: value.trim(), line });
    } else {
      errors.push({ line, message: `Unknown setting "${rawKey}". Known: ${KEYS.join(', ')}, note <state>.` });
    }
  });

  const get = (key: Key) => header.get(key)?.value;
  const blank = get('blank') || 'B';
  if ([...blank].length !== 1) errors.push({ line: header.get('blank')!.line, message: 'The blank must be a single character.' });

  const declared = get('states') !== undefined ? list(get('states')!) : [];
  const accept = list(get('accept') ?? '');
  const start = get('start') || declared[0] || seenStates[0];
  if (!start) errors.push({ line: 0, message: 'No states yet: add "start: q0" or a rule.' });

  const states = [...declared];
  for (const q of [start, ...seenStates, ...accept]) if (q && !states.includes(q)) states.push(q);
  if (declared.length && states.length > declared.length) {
    const extra = states.slice(declared.length).join(', ');
    errors.push({ line: header.get('states')!.line, message: `States used but not listed in "states": ${extra}.` });
  }

  const input = get('input') !== undefined ? list(get('input')!) : seenSymbols.filter((a) => a !== blank);
  const tape = get('tape') !== undefined ? list(get('tape')!) : [];
  for (const a of [...input, ...seenSymbols, blank]) if (!tape.includes(a)) tape.push(a);
  if (get('tape') !== undefined && tape.length > list(get('tape')!).length) {
    const extra = tape.slice(list(get('tape')!).length).join(', ');
    errors.push({ line: header.get('tape')!.line, message: `Symbols used but not listed in "tape": ${extra}.` });
  }

  const examples = list(get('examples') ?? '').map((w) => (w === EMPTY_WORD ? '' : w));

  const machine: TuringMachine = {
    id,
    name: get('name') || 'Untitled machine',
    description: get('description') ?? '',
    states,
    inputAlphabet: input,
    tapeAlphabet: tape,
    blank,
    startState: start ?? '',
    acceptStates: accept,
    delta: Object.fromEntries(states.map((q) => [q, delta[q] ?? {}])),
    ...(Object.keys(notes).length ? { stateNotes: notes } : {}),
    ...(examples.length ? { examples } : {}),
  };

  if (errors.length === 0) {
    for (const message of validateMachine(machine)) errors.push({ line: 0, message });
  }
  return errors.length ? { ok: false, errors } : { ok: true, machine };
}

/** Writes a machine in the text format. parseMachine(toSource(m)) gives m back. */
export function toSource(m: TuringMachine): string {
  const out: string[] = [
    `name: ${m.name}`,
    ...(m.description ? [`description: ${m.description}`] : []),
    `input: ${m.inputAlphabet.join(' ')}`,
    `tape: ${m.tapeAlphabet.join(' ')}`,
    `blank: ${m.blank}`,
    `start: ${m.startState}`,
    `accept: ${m.acceptStates.join(' ')}`,
    `states: ${m.states.join(' ')}`,
  ];
  if (m.examples?.length) out.push(`examples: ${m.examples.map((w) => w || EMPTY_WORD).join(' ')}`);

  const notes = m.states.filter((q) => m.stateNotes?.[q]);
  if (notes.length) out.push('', ...notes.map((q) => `note ${q}: ${m.stateNotes![q]}`));

  const width = Math.max(...m.states.map((q) => q.length));
  out.push('', '// state, read -> next, write, move (L, R or N)');
  for (const q of m.states) {
    for (const a of m.tapeAlphabet) {
      const t = m.delta[q]?.[a];
      if (t) out.push(`${(q + ',').padEnd(width + 1)} ${a} -> ${(t.next + ',').padEnd(width + 1)} ${t.write}, ${t.move}`);
    }
  }
  return out.join('\n') + '\n';
}

/** Starting point for a new machine in the editor. */
export const NEW_MACHINE_SOURCE = `name: My machine
description: Accepts words over {a, b} that end in b.
input: a b
blank: B
start: q0
accept: q2
examples: ab aab ba ε

note q0: walking right to the end of the word
note q1: checking the last symbol
note q2: accept

// state, read -> next, write, move (L, R or N)
q0, a -> q0, a, R
q0, b -> q0, b, R
q0, B -> q1, B, L
q1, b -> q2, b, N
`;
