import type { TuringMachine } from '../tm/types.ts';

/** Adds 1 to a binary number: walk to the last digit, then propagate the carry to the left. */
const machine: TuringMachine = {
  id: 'binary-increment',
  name: 'Binary increment',
  description: 'Computes n + 1 for a binary number n. Turns trailing 1s into 0s and the first 0 (or blank) into a 1.',
  states: ['q0', 'q1', 'q2'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  startState: 'q0',
  acceptStates: ['q2'],
  delta: {
    q0: {
      '0': { next: 'q0', write: '0', move: 'R' },
      '1': { next: 'q0', write: '1', move: 'R' },
      B: { next: 'q1', write: 'B', move: 'L' },
    },
    q1: {
      '0': { next: 'q2', write: '1', move: 'N' },
      '1': { next: 'q1', write: '0', move: 'L' },
      B: { next: 'q2', write: '1', move: 'N' },
    },
    q2: {},
  },
  stateNotes: {
    q0: 'walking right to the last digit',
    q1: 'adding the carry, moving left',
    q2: 'done, the tape holds n + 1',
  },
  examples: ['1011', '111', '1001', '0', ''],
};

export default machine;
