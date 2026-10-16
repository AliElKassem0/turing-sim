import type { TuringMachine } from '../tm/types.ts';

// Every other .ts file in this folder default-exports one machine.
// Adding a machine = adding a file; it shows up in the machine list automatically.
const modules = import.meta.glob<TuringMachine>(['./*.ts', '!./index.ts'], { eager: true, import: 'default' });

/** Display order; machines not listed here follow alphabetically. */
const ORDER = ['zeros-ones', 'palindromes', 'abc', 'binary-increment', 'unary-addition', 'busy-beaver'];
const rank = (m: TuringMachine) => (ORDER.includes(m.id) ? ORDER.indexOf(m.id) : ORDER.length);

export const machines: TuringMachine[] = Object.values(modules).sort(
  (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
);
