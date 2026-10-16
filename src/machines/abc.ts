import type { TuringMachine } from '../tm/types.ts';

/** Decides aⁿbⁿcⁿ, a classic language that is not context-free, by marking one a, b and c per round. */
const machine: TuringMachine = {
  id: 'abc',
  name: 'aⁿbⁿcⁿ',
  description: 'Decides L = { aⁿbⁿcⁿ | n ≥ 1 }, which no pushdown automaton can. Each round marks one a as X, one b as Y and one c as Z.',
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'],
  inputAlphabet: ['a', 'b', 'c'],
  tapeAlphabet: ['a', 'b', 'c', 'X', 'Y', 'Z', 'B'],
  blank: 'B',
  startState: 'q0',
  acceptStates: ['q5'],
  delta: {
    q0: {
      a: { next: 'q1', write: 'X', move: 'R' },
      Y: { next: 'q4', write: 'Y', move: 'R' },
    },
    q1: {
      a: { next: 'q1', write: 'a', move: 'R' },
      b: { next: 'q2', write: 'Y', move: 'R' },
      Y: { next: 'q1', write: 'Y', move: 'R' },
    },
    q2: {
      b: { next: 'q2', write: 'b', move: 'R' },
      c: { next: 'q3', write: 'Z', move: 'L' },
      Z: { next: 'q2', write: 'Z', move: 'R' },
    },
    q3: {
      a: { next: 'q3', write: 'a', move: 'L' },
      b: { next: 'q3', write: 'b', move: 'L' },
      X: { next: 'q0', write: 'X', move: 'R' },
      Y: { next: 'q3', write: 'Y', move: 'L' },
      Z: { next: 'q3', write: 'Z', move: 'L' },
    },
    q4: {
      Y: { next: 'q4', write: 'Y', move: 'R' },
      Z: { next: 'q4', write: 'Z', move: 'R' },
      B: { next: 'q5', write: 'B', move: 'N' },
    },
    q5: {},
  },
  stateNotes: {
    q0: 'marking the next a as X',
    q1: 'looking for the next b',
    q2: 'looking for the next c',
    q3: 'walking back left to the last X',
    q4: 'all a marked: only Y and Z may be left',
    q5: 'accepting state',
  },
  examples: ['abc', 'aabbcc', 'aaabbbccc', 'aabbc', 'abcabc', 'acb'],
};

export default machine;
