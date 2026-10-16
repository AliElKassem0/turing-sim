import type { TuringMachine } from '../tm/types.ts';

/** Adds two unary numbers: 1ⁿ+1ᵐ becomes 1ⁿ⁺ᵐ. */
const machine: TuringMachine = {
  id: 'unary-addition',
  name: 'Unary addition',
  description: 'Computes n + m in unary: turns 1ⁿ+1ᵐ into 1ⁿ⁺ᵐ by replacing the + with a 1 and erasing the last 1.',
  states: ['q0', 'q1', 'q2', 'q3'],
  inputAlphabet: ['1', '+'],
  tapeAlphabet: ['1', '+', 'B'],
  blank: 'B',
  startState: 'q0',
  acceptStates: ['q3'],
  delta: {
    q0: {
      '1': { next: 'q0', write: '1', move: 'R' },
      '+': { next: 'q1', write: '1', move: 'R' },
    },
    q1: {
      '1': { next: 'q1', write: '1', move: 'R' },
      B: { next: 'q2', write: 'B', move: 'L' },
    },
    q2: {
      '1': { next: 'q3', write: 'B', move: 'N' },
    },
    q3: {},
  },
  stateNotes: {
    q0: 'walking right to the +',
    q1: 'walking right to the end',
    q2: 'erasing one 1 to make up for the +',
    q3: 'done, the tape holds n + m',
  },
  examples: ['11+111', '1+1', '111+', '+'],
};

export default machine;
