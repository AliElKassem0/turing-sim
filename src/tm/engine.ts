import type { Transition, TuringMachine } from './types.ts';

/** Sparse tape: only non-blank cells are stored, every other cell holds the blank. */
export type Tape = ReadonlyMap<number, string>;

/** A configuration: tape contents, head position and current state. */
export interface Config {
  tape: Tape;
  head: number;
  state: string;
}

/**
 * Why a run stopped:
 * - accept: the current state is an accepting state
 * - reject: there is no rule δ(q, a) and q is not accepting
 * - limit:  the safety limit on the number of steps was reached
 */
export type HaltReason = 'accept' | 'reject' | 'limit';

export interface RuleUse {
  state: string;
  symbol: string;
  transition: Transition;
}

/** The configuration after `step` transitions, plus what happens next. */
export interface Snapshot extends Config {
  /** Number of transitions applied so far. */
  step: number;
  /** Symbol under the head in this configuration. */
  read: string;
  /** The rule applied to leave this configuration, or null if there is none. */
  rule: RuleUse | null;
  /** null while the machine is still running. */
  halt: HaltReason | null;
}

export const DEFAULT_MAX_STEPS = 10_000;

export function readCell(tape: Tape, pos: number, blank: string): string {
  return tape.get(pos) ?? blank;
}

/** Start configuration: the word on cells 0..n-1, head on cell 0, start state. */
export function initialConfig(machine: TuringMachine, word: string): Config {
  const tape = new Map<number, string>();
  [...word].forEach((symbol, i) => {
    if (symbol !== machine.blank) tape.set(i, symbol);
  });
  return { tape, head: 0, state: machine.startState };
}

/** δ(state, symbol), or undefined for "–". */
export function lookup(machine: TuringMachine, state: string, symbol: string): Transition | undefined {
  return machine.delta[state]?.[symbol];
}

export function isAccepting(machine: TuringMachine, state: string): boolean {
  return machine.acceptStates.includes(state);
}

/**
 * Whether the machine halts in this configuration.
 * Acceptance is checked first: an accepting state always halts.
 */
export function haltReason(machine: TuringMachine, config: Config): 'accept' | 'reject' | null {
  if (isAccepting(machine, config.state)) return 'accept';
  const symbol = readCell(config.tape, config.head, machine.blank);
  return lookup(machine, config.state, symbol) ? null : 'reject';
}

const OFFSET: Record<Transition['move'], number> = { L: -1, R: 1, N: 0 };

function write(tape: Map<number, string>, pos: number, symbol: string, blank: string): void {
  if (symbol === blank) tape.delete(pos);
  else tape.set(pos, symbol);
}

/**
 * One step: read the symbol under the head, look up δ(state, symbol),
 * write, move and switch state. Pure. Returns null if the machine halts here.
 */
export function step(machine: TuringMachine, config: Config): Config | null {
  if (haltReason(machine, config)) return null;
  const symbol = readCell(config.tape, config.head, machine.blank);
  const t = lookup(machine, config.state, symbol)!;
  const tape = new Map(config.tape);
  write(tape, config.head, t.write, machine.blank);
  return { tape, head: config.head + OFFSET[t.move], state: t.next };
}

/** Every CHECKPOINT steps the full tape is stored; other tapes are rebuilt from the writes in between. */
const CHECKPOINT = 128;

interface Frame {
  head: number;
  state: string;
  read: string;
  rule: RuleUse | null;
  halt: HaltReason | null;
}

/**
 * The full history of a run. Stores one small frame per step plus a tape
 * checkpoint every 128 steps, so even 10,000 steps on a growing tape stay cheap.
 */
export class Trace {
  readonly machine: TuringMachine;
  readonly word: string;
  readonly maxSteps: number;
  private frames: Frame[] = [];
  private checkpoints: Map<number, string>[] = [];
  /** writes[i] = what step i → i+1 wrote, as [position, symbol]. */
  private writes: [number, string][] = [];
  private minHead = 0;
  private maxHead = 0;

  constructor(machine: TuringMachine, word: string, maxSteps = DEFAULT_MAX_STEPS) {
    this.machine = machine;
    this.word = word;
    this.maxSteps = maxSteps;

    const { blank } = machine;
    const start = initialConfig(machine, word);
    const tape = new Map(start.tape);
    let head = start.head;
    let state = start.state;

    for (let i = 0; ; i++) {
      if (i % CHECKPOINT === 0) this.checkpoints.push(new Map(tape));
      if (head < this.minHead) this.minHead = head;
      if (head > this.maxHead) this.maxHead = head;

      const read = readCell(tape, head, blank);
      const reason = haltReason(machine, { tape, head, state });
      const t = reason ? undefined : lookup(machine, state, read);
      const halt = reason ?? (i >= maxSteps ? 'limit' : null);
      this.frames.push({ head, state, read, rule: t ? { state, symbol: read, transition: t } : null, halt });
      if (halt) break;

      write(tape, head, t!.write, blank);
      this.writes.push([head, t!.write]);
      head += OFFSET[t!.move];
      state = t!.next;
    }
  }

  /** Number of configurations (steps + 1). */
  get length(): number {
    return this.frames.length;
  }

  /** Number of transitions applied. */
  get steps(): number {
    return this.frames.length - 1;
  }

  get result(): HaltReason {
    return this.frames[this.frames.length - 1].halt!;
  }

  /** Leftmost and rightmost cell the run touches (input and every head position). */
  get extent(): [number, number] {
    return [Math.min(0, this.minHead), Math.max(this.word.length - 1, this.maxHead, 0)];
  }

  /** The configuration after i steps. */
  at(i: number): Snapshot {
    const frame = this.frames[i];
    if (!frame) throw new RangeError(`step ${i} is outside 0..${this.steps}`);
    const base = Math.floor(i / CHECKPOINT);
    const tape = new Map(this.checkpoints[base]);
    for (let s = base * CHECKPOINT; s < i; s++) write(tape, this.writes[s][0], this.writes[s][1], this.machine.blank);
    return { ...frame, tape, step: i };
  }

  /** All configurations. Meant for short runs and tests. */
  snapshots(): Snapshot[] {
    return this.frames.map((_, i) => this.at(i));
  }
}

/** Runs the machine on `word` and records every configuration. */
export function run(machine: TuringMachine, word: string, maxSteps = DEFAULT_MAX_STEPS): Trace {
  return new Trace(machine, word, maxSteps);
}

/** Checks a word against Σ. Returns an error message, or null if the word is valid. */
export function validateWord(machine: TuringMachine, word: string, maxLength = 20): string | null {
  if (word.length > maxLength) return `Too long: at most ${maxLength} symbols are allowed.`;
  const bad = [...word].find((c) => !machine.inputAlphabet.includes(c));
  if (bad !== undefined) {
    return `"${bad}" is not in the input alphabet Σ = {${machine.inputAlphabet.join(', ')}}.`;
  }
  return null;
}
