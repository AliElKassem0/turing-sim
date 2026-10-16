import { describe, expect, it } from 'vitest';
import zerosOnes from '../src/machines/zeros-ones.ts';
import { initialConfig, run } from '../src/tm/engine.ts';
import { formatConfig, subscriptState, tapeContents } from '../src/tm/format.ts';

const plain = { style: 'plain' } as const;

describe('formatConfig (α q β)', () => {
  it('puts the state in front of the first symbol at the start', () => {
    expect(formatConfig(zerosOnes, initialConfig(zerosOnes, '0011'), plain)).toBe('q0 0011');
  });

  it('puts the state in front of the symbol under the head after 2 steps', () => {
    const trace = run(zerosOnes, '0011');
    expect(formatConfig(zerosOnes, trace.at(2), plain)).toBe('00 q0 11');
    expect(formatConfig(zerosOnes, trace.at(2))).toBe('00q₀11');
  });

  it('shows blanks inside the range and extends the range to the head', () => {
    const snaps = run(zerosOnes, '0011').snapshots();
    expect(formatConfig(zerosOnes, snaps[5], plain)).toBe('001 q2 1');
    expect(formatConfig(zerosOnes, snaps.find((s) => s.head === -1)!, plain)).toBe('q3 B001');
    expect(formatConfig(zerosOnes, snaps.find((s) => s.state === 'q5')!, plain)).toBe('q5 01');
  });

  it('shows the empty word as a single blank under the head', () => {
    expect(formatConfig(zerosOnes, initialConfig(zerosOnes, ''))).toBe('q₀B');
  });

  it('can shorten long configurations around the head', () => {
    const config = { tape: new Map([...'0000011111'].map((c, i) => [i, c] as const)), head: 5, state: 'q1' };
    expect(formatConfig(zerosOnes, config, { context: 2 })).toBe('…00q₁111…');
  });

  it('writes state indices as subscripts', () => {
    expect(subscriptState('q7')).toBe('q₇');
    expect(subscriptState('q12')).toBe('q₁₂');
    expect(subscriptState('accept')).toBe('accept');
  });

  it('reads the tape contents', () => {
    expect(tapeContents(new Map([[0, '1'], [2, '1']]), 'B')).toBe('1B1');
    expect(tapeContents(new Map(), 'B')).toBe('');
  });
});
