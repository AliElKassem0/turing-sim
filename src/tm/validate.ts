import type { TuringMachine } from './types.ts';

/** Structural checks for a machine definition. Returns a list of problems (empty = valid). */
export function validateMachine(m: TuringMachine): string[] {
  const errors: string[] = [];
  const states = new Set(m.states);
  const gamma = new Set(m.tapeAlphabet);
  const set = (xs: Iterable<string>) => `{${[...xs].join(', ')}}`;

  if (m.states.length === 0) errors.push('The machine needs at least one state.');
  if (states.size !== m.states.length) errors.push('Q contains a state twice.');
  if (!states.has(m.startState)) errors.push(`The start state ${m.startState} is not in Q.`);
  for (const q of m.acceptStates) if (!states.has(q)) errors.push(`The accepting state ${q} is not in Q.`);

  for (const a of m.tapeAlphabet) if ([...a].length !== 1) errors.push(`Tape symbols must be single characters, "${a}" is not.`);
  if (!gamma.has(m.blank)) errors.push(`The blank ${m.blank} must be in Γ = ${set(gamma)}.`);
  if (m.inputAlphabet.includes(m.blank)) errors.push(`The blank ${m.blank} must not be in Σ.`);
  for (const a of m.inputAlphabet) if (!gamma.has(a)) errors.push(`Input symbol ${a} is not in Γ.`);

  for (const [q, row] of Object.entries(m.delta)) {
    if (!states.has(q)) errors.push(`δ has a row for ${q}, which is not in Q.`);
    for (const [a, t] of Object.entries(row)) {
      if (!t) continue;
      const where = `δ(${q}, ${a})`;
      if (!gamma.has(a)) errors.push(`${where}: ${a} is not in Γ.`);
      if (!states.has(t.next)) errors.push(`${where}: target state ${t.next} is not in Q.`);
      if (!gamma.has(t.write)) errors.push(`${where}: written symbol ${t.write} is not in Γ.`);
      if (!['L', 'R', 'N'].includes(t.move)) errors.push(`${where}: move must be L, R or N.`);
    }
  }
  for (const w of m.examples ?? []) {
    const bad = [...w].find((c) => !m.inputAlphabet.includes(c));
    if (bad !== undefined) errors.push(`Example "${w}" uses ${bad}, which is not in Σ.`);
  }
  return errors;
}
