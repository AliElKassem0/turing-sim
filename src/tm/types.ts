/** Head movement: R = one cell right, L = one cell left, N = stay. */
export type Move = 'L' | 'R' | 'N';

/** Right-hand side of a δ entry: δ(q, a) = (next, write, move). */
export interface Transition {
  next: string;
  write: string;
  move: Move;
}

/**
 * δ as a partial function: delta[state][symbol].
 * A missing entry means "–" (no rule), so the machine halts there.
 */
export type TransitionTable = Record<string, Partial<Record<string, Transition>>>;

/** M = (Q, Σ, Γ, δ, q0, F) plus a few fields for the UI. */
export interface TuringMachine {
  /** Stable identifier, used by the machine dropdown. */
  id: string;
  name: string;
  description: string;
  /** Q */
  states: string[];
  /** Σ */
  inputAlphabet: string[];
  /** Γ (must contain Σ and the blank) */
  tapeAlphabet: string[];
  /** The blank symbol, e.g. "B". */
  blank: string;
  /** q0 */
  startState: string;
  /** F */
  acceptStates: string[];
  delta: TransitionTable;
  /** Short description of each state's job. */
  stateNotes?: Record<string, string>;
  /** Example words shown as preset buttons ("" = ε). */
  examples?: string[];
}
