import type { TuringMachine } from '../tm/types.ts';

/** Decides palindromes over {a, b}: compare and erase the outermost symbols until nothing is left. */
const machine: TuringMachine = {
  id: 'palindromes',
  name: 'Palindromes',
  description: 'Decides L = { w ∈ {a, b}* | w = wᴿ }. Erases the first symbol, then checks that the last symbol matches it.',
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
  inputAlphabet: ['a', 'b'],
  tapeAlphabet: ['a', 'b', 'B'],
  blank: 'B',
  startState: 'q0',
  acceptStates: ['q6'],
  delta: {
    q0: {
      a: { next: 'q1', write: 'B', move: 'R' },
      b: { next: 'q2', write: 'B', move: 'R' },
      B: { next: 'q6', write: 'B', move: 'N' },
    },
    q1: {
      a: { next: 'q1', write: 'a', move: 'R' },
      b: { next: 'q1', write: 'b', move: 'R' },
      B: { next: 'q3', write: 'B', move: 'L' },
    },
    q2: {
      a: { next: 'q2', write: 'a', move: 'R' },
      b: { next: 'q2', write: 'b', move: 'R' },
      B: { next: 'q4', write: 'B', move: 'L' },
    },
    q3: {
      a: { next: 'q5', write: 'B', move: 'L' },
      B: { next: 'q6', write: 'B', move: 'N' },
    },
    q4: {
      b: { next: 'q5', write: 'B', move: 'L' },
      B: { next: 'q6', write: 'B', move: 'N' },
    },
    q5: {
      a: { next: 'q5', write: 'a', move: 'L' },
      b: { next: 'q5', write: 'b', move: 'L' },
      B: { next: 'q0', write: 'B', move: 'R' },
    },
    q6: {},
  },
  stateNotes: {
    q0: 'erasing the first symbol and remembering it',
    q1: 'remembered a, walking right to the end',
    q2: 'remembered b, walking right to the end',
    q3: 'last symbol must be an a, erase it',
    q4: 'last symbol must be a b, erase it',
    q5: 'walking back left to the start',
    q6: 'accepting state',
  },
  examples: ['abba', 'aba', 'abab', 'baab', 'a', ''],
};

export default machine;
