import type { TuringMachine } from '../tm/types.ts';

/** Decides L = { 0ⁿ1ⁿ | n ≥ 1 } by erasing the last 1 and the first 0 until nothing is left. */
const machine: TuringMachine = {
  id: 'zeros-ones',
  name: '0ⁿ1ⁿ',
  description: 'Decides L = { 0ⁿ1ⁿ | n ≥ 1 }. Repeatedly erases the last 1 and the first 0 until nothing is left.',
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  blank: 'B',
  startState: 'q0',
  acceptStates: ['q7'],
  delta: {
    q0: { '0': { next: 'q0', write: '0', move: 'R' }, '1': { next: 'q1', write: '1', move: 'R' } },
    q1: { '1': { next: 'q1', write: '1', move: 'R' }, B: { next: 'q2', write: 'B', move: 'L' } },
    q2: { '1': { next: 'q3', write: 'B', move: 'L' } },
    q3: {
      '0': { next: 'q3', write: '0', move: 'L' },
      '1': { next: 'q3', write: '1', move: 'L' },
      B: { next: 'q4', write: 'B', move: 'R' },
    },
    q4: { '0': { next: 'q5', write: 'B', move: 'R' } },
    q5: {
      '0': { next: 'q6', write: '0', move: 'R' },
      '1': { next: 'q6', write: '1', move: 'R' },
      B: { next: 'q7', write: 'B', move: 'N' },
    },
    q6: {
      '0': { next: 'q6', write: '0', move: 'R' },
      '1': { next: 'q6', write: '1', move: 'R' },
      B: { next: 'q2', write: 'B', move: 'L' },
    },
    q7: {},
  },
  stateNotes: {
    q0: 'walking right over the 0s',
    q1: 'walking right over the 1s',
    q2: 'on the last symbol, must be a 1, erase it',
    q3: 'walking back left to the start',
    q4: 'on the first symbol, must be a 0, erase it',
    q5: 'checking whether anything is left',
    q6: 'walking right to the end',
    q7: 'accepting end state',
  },
  examples: ['0011', '01', '000111', '001', '0101', '10', ''],
};

export default machine;
