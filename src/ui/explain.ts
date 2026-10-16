import type { Snapshot } from '../tm/engine.ts';
import { subscriptState as sub, tapeContents } from '../tm/format.ts';
import type { TuringMachine } from '../tm/types.ts';

const MOVE_TEXT = { R: 'move right', L: 'move left', N: 'stay on this cell' } as const;

/** Plain-English explanation of this configuration: the next step, or why the machine halts. */
export function explain(machine: TuringMachine, snap: Snapshot, maxSteps: number): string {
  const q = sub(snap.state);
  const a = snap.read;
  const { blank } = machine;
  const note = machine.stateNotes?.[snap.state];
  const where = `State ${q}${note ? ` (${note})` : ''} reads ${a}.`;

  if (snap.halt === 'accept') {
    const contents = tapeContents(snap.tape, blank);
    const output = contents ? ` The tape now holds ${contents}.` : '';
    return `${where} ${q} is an accepting state, so the machine halts: the input is accepted.${output}`;
  }
  if (snap.halt === 'reject') {
    return `${where} δ(${q}, ${a}) is undefined, so the machine halts. ${q} is not an accepting state: the input is rejected.`;
  }

  const { next, write, move } = snap.rule!.transition;
  const p = sub(next);
  const change = next === snap.state ? `stay in ${q}` : `switch to ${p}`;
  const writeText =
    write === a
      ? `keep the ${a}`
      : write === blank
        ? `erase the ${a} (write ${blank})`
        : a === blank
          ? `write ${write} into the blank cell`
          : `replace the ${a} with ${write}`;
  const rule = `δ(${q}, ${a}) = (${p}, ${write}, ${move})`;

  if (snap.halt === 'limit') {
    return `${where} The machine has not halted after ${maxSteps.toLocaleString('en')} steps, so the simulation stops here. It may run forever. The next rule would be ${rule}.`;
  }
  return `${where} Rule ${rule}: ${change}, ${writeText}, ${MOVE_TEXT[move]}.`;
}
