import { describe, expect, it } from 'vitest';
import zerosOnes from '../src/machines/zeros-ones.ts';
import { run } from '../src/tm/engine.ts';
import { explain } from '../src/ui/explain.ts';

const lastOf = (word: string) => {
  const trace = run(zerosOnes, word);
  return explain(zerosOnes, trace.at(trace.steps), trace.maxSteps);
};

describe('explain', () => {
  it('describes the rule applied in the next step', () => {
    const trace = run(zerosOnes, '0011');
    expect(explain(zerosOnes, trace.at(0), trace.maxSteps)).toBe(
      'State q₀ (walking right over the 0s) reads 0. Rule δ(q₀, 0) = (q₀, 0, R): stay in q₀, keep the 0, move right.',
    );
    expect(explain(zerosOnes, trace.at(5), trace.maxSteps)).toContain('switch to q₃, erase the 1 (write B), move left.');
  });

  it('explains why the machine rejects', () => {
    expect(lastOf('001')).toContain('δ(q₂, 0) is undefined, so the machine halts. q₂ is not an accepting state: the input is rejected.');
  });

  it('explains acceptance', () => {
    expect(lastOf('01')).toContain('q₇ is an accepting state, so the machine halts: the input is accepted.');
  });
});
