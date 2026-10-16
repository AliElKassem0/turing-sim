import { describe, expect, it } from 'vitest';
import zerosOnes from '../src/machines/zeros-ones.ts';
import { initialConfig, run, step, validateWord } from '../src/tm/engine.ts';
import type { TuringMachine } from '../src/tm/types.ts';

type Expected = [word: string, result: 'accept' | 'reject', steps: number, stuck?: [string, string]];

const cases: Expected[] = [
  ['', 'reject', 0, ['q0', 'B']],
  ['0', 'reject', 1, ['q0', 'B']],
  ['1', 'reject', 4, ['q4', 'B']],
  ['01', 'accept', 8],
  ['0011', 'accept', 19],
  ['000111', 'accept', 34],
  ['10', 'reject', 1, ['q1', '0']],
  ['0101', 'reject', 2, ['q1', '0']],
  ['001', 'reject', 11, ['q2', '0']],
  ['0001', 'reject', 14, ['q2', '0']],
  ['00011', 'reject', 24, ['q2', '0']],
  ['011', 'reject', 13, ['q4', 'B']],
];

describe('0ⁿ1ⁿ machine', () => {
  it.each(cases)('"%s" → %s after %i steps', (word, result, steps, stuck) => {
    const trace = run(zerosOnes, word);
    expect(trace.result).toBe(result);
    expect(trace.steps).toBe(steps);
    expect(trace.length).toBe(steps + 1);
    const last = trace.at(trace.steps);
    expect(last.rule).toBeNull();
    if (stuck) expect([last.state, last.read]).toEqual(stuck);
    else expect(last.state).toBe('q7');
  });
});

describe('engine', () => {
  it('starts with the head on the first input symbol, or on a blank for ε', () => {
    const c = initialConfig(zerosOnes, '01');
    expect([c.head, c.state, c.tape.get(0), c.tape.get(1)]).toEqual([0, 'q0', '0', '1']);
    expect(initialConfig(zerosOnes, '').tape.size).toBe(0);
  });

  it('step() is pure and returns null when the machine halts', () => {
    const c0 = initialConfig(zerosOnes, '0');
    const c1 = step(zerosOnes, c0)!;
    expect(c1).toMatchObject({ head: 1, state: 'q0' });
    expect(c0.head).toBe(0);
    expect(step(zerosOnes, c1)).toBeNull();
  });

  it('the trace agrees with repeated step() calls', () => {
    const trace = run(zerosOnes, '000111');
    let config = initialConfig(zerosOnes, '000111');
    for (let i = 0; i <= trace.steps; i++) {
      const snap = trace.at(i);
      expect([snap.head, snap.state, [...snap.tape].sort()]).toEqual([config.head, config.state, [...config.tape].sort()]);
      if (i < trace.steps) config = step(zerosOnes, config)!;
    }
  });

  const writer: TuringMachine = {
    ...zerosOnes,
    id: 'writer',
    delta: { q0: { B: { next: 'q0', write: '1', move: 'R' } } },
  };

  it('stops at the safety limit for a machine that never halts', () => {
    const trace = run(writer, '', 50);
    expect(trace.result).toBe('limit');
    expect(trace.steps).toBe(50);
    expect(trace.at(50).tape.size).toBe(50);
  });

  it('handles 10,000 steps on a growing tape quickly', () => {
    const t0 = performance.now();
    const trace = run(writer, '');
    expect(trace.steps).toBe(10_000);
    expect(trace.at(9_999).tape.size).toBe(9_999);
    expect(trace.extent).toEqual([0, 10_000]);
    expect(performance.now() - t0).toBeLessThan(1000);
  });

  it('validates input words', () => {
    expect(validateWord(zerosOnes, '0011')).toBeNull();
    expect(validateWord(zerosOnes, '')).toBeNull();
    expect(validateWord(zerosOnes, '012')).toMatch(/"2"/);
    expect(validateWord(zerosOnes, '0'.repeat(21))).toMatch(/Too long/);
  });
});
