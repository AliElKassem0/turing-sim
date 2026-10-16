import { describe, expect, it } from 'vitest';
import { machines } from '../src/machines/index.ts';
import { run } from '../src/tm/engine.ts';
import { tapeContents } from '../src/tm/format.ts';
import { validateMachine } from '../src/tm/validate.ts';

const byId = (id: string) => machines.find((m) => m.id === id)!;

/** All words over `alphabet` up to length `max`. */
function* words(alphabet: string[], max: number): Generator<string> {
  yield '';
  let level = [''];
  for (let len = 1; len <= max; len++) {
    level = level.flatMap((w) => alphabet.map((a) => w + a));
    yield* level;
  }
}

const decides = (id: string, inL: (w: string) => boolean, max: number) => {
  const m = byId(id);
  for (const w of words(m.inputAlphabet, max)) {
    expect(run(m, w).result, `"${w}"`).toBe(inL(w) ? 'accept' : 'reject');
  }
};

describe('example machines', () => {
  it('are all valid and have unique ids', () => {
    expect(machines.length).toBeGreaterThanOrEqual(6);
    expect(new Set(machines.map((m) => m.id)).size).toBe(machines.length);
    for (const m of machines) expect(validateMachine(m), m.id).toEqual([]);
  });

  it('0ⁿ1ⁿ', () => decides('zeros-ones', (w) => /^(0*)(1*)$/.test(w) && w.length > 0 && w.indexOf('1') === w.length / 2, 8));

  it('palindromes', () => decides('palindromes', (w) => w === [...w].reverse().join(''), 8));

  it('aⁿbⁿcⁿ', () =>
    decides('abc', (w) => {
      const n = w.length / 3;
      return n >= 1 && w === 'a'.repeat(n) + 'b'.repeat(n) + 'c'.repeat(n);
    }, 7));

  it('binary increment', () => {
    const m = byId('binary-increment');
    for (let n = 0; n < 70; n++) {
      const trace = run(m, n.toString(2));
      expect(trace.result).toBe('accept');
      expect(parseInt(tapeContents(trace.at(trace.steps).tape, m.blank), 2)).toBe(n + 1);
    }
    const empty = run(m, ''); // ε counts as 0
    expect(tapeContents(empty.at(empty.steps).tape, m.blank)).toBe('1');
  });

  it('unary addition', () => {
    const m = byId('unary-addition');
    for (let a = 0; a < 6; a++) {
      for (let b = 0; b < 6; b++) {
        const trace = run(m, '1'.repeat(a) + '+' + '1'.repeat(b));
        expect(trace.result).toBe('accept');
        expect(tapeContents(trace.at(trace.steps).tape, m.blank)).toBe('1'.repeat(a + b));
      }
    }
  });

  it('busy beaver writes six 1s in 14 steps', () => {
    const m = byId('busy-beaver');
    const trace = run(m, '');
    expect(trace.result).toBe('accept');
    expect(trace.steps).toBe(14);
    expect(tapeContents(trace.at(14).tape, m.blank)).toBe('111111');
  });
});
