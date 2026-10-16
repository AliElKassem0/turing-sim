import { describe, expect, it } from 'vitest';
import { machines } from '../src/machines/index.ts';
import { run } from '../src/tm/engine.ts';
import { NEW_MACHINE_SOURCE, parseMachine, toSource } from '../src/tm/source.ts';

describe('machine text format', () => {
  it.each(machines.map((m) => [m.id, m] as const))('round-trips %s', (_, m) => {
    const parsed = parseMachine(toSource(m), m.id);
    expect(parsed).toEqual({ ok: true, machine: m });
  });

  it('parses the new-machine template', () => {
    const parsed = parseMachine(NEW_MACHINE_SOURCE);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(run(parsed.machine, 'aab').result).toBe('accept');
    expect(run(parsed.machine, 'ba').result).toBe('reject');
    expect(parsed.machine.examples).toContain('');
  });

  it('infers states and alphabets from the rules', () => {
    const ok = parseMachine('accept: q1 // comment\ninput: a\nq0, a -> q0, X, R\nq0 B -> q1 B N   // spaces work too');
    expect(ok.ok && ok.machine).toMatchObject({
      states: ['q0', 'q1'],
      startState: 'q0',
      inputAlphabet: ['a'],
      tapeAlphabet: ['a', 'X', 'B'],
    });
  });

  it('reports errors with line numbers', () => {
    const parsed = parseMachine('name: x\nq0, a -> q1, a, U\nq0, b -> q1\ncolour: red\nq0, a -> q0, a, R\nq0, a -> q1, a, R');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.map((e) => e.line)).toEqual([2, 3, 4, 6]);
    expect(parsed.errors[0].message).toMatch(/L, R or N/);
    expect(parsed.errors[3].message).toMatch(/deterministic/);
  });

  it('checks the machine as a whole', () => {
    const parsed = parseMachine('input: a B\nq0, a -> q0, a, R');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors[0]).toMatchObject({ line: 0, message: expect.stringMatching(/blank/) });
  });
});
