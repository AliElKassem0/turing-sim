import type { TuringMachine } from '../tm/types.ts';

/** The 3-state, 2-symbol busy beaver: started on an empty tape it writes six 1s and halts after 14 steps. */
const machine: TuringMachine = {
  id: 'busy-beaver',
  name: 'Busy beaver (3 states)',
  description: 'The 3-state champion: on an empty tape it writes six 1s in 14 steps before halting, more than any other 3-state machine.',
  states: ['q0', 'q1', 'q2', 'q3'],
  inputAlphabet: ['1'],
  tapeAlphabet: ['1', 'B'],
  blank: 'B',
  startState: 'q0',
  acceptStates: ['q3'],
  delta: {
    q0: {
      B: { next: 'q1', write: '1', move: 'R' },
      '1': { next: 'q3', write: '1', move: 'R' },
    },
    q1: {
      B: { next: 'q2', write: 'B', move: 'R' },
      '1': { next: 'q1', write: '1', move: 'R' },
    },
    q2: {
      B: { next: 'q2', write: '1', move: 'L' },
      '1': { next: 'q0', write: '1', move: 'L' },
    },
    q3: {},
  },
  stateNotes: {
    q0: 'state A',
    q1: 'state B',
    q2: 'state C',
    q3: 'halt',
  },
  examples: [''],
};

export default machine;
