import type { Config, Tape } from './engine.ts';
import type { TuringMachine } from './types.ts';

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

/** "q0" → "q₀", "q12" → "q₁₂". Names without trailing digits are unchanged. */
export function subscriptState(state: string): string {
  return state.replace(/\d+$/, (digits) => [...digits].map((d) => SUBSCRIPT_DIGITS[Number(d)]).join(''));
}

/** Leftmost and rightmost non-blank cell, extended to include the head. */
export function usedRange(config: Config): [number, number] {
  let min = config.head;
  let max = config.head;
  for (const pos of config.tape.keys()) {
    if (pos < min) min = pos;
    if (pos > max) max = pos;
  }
  return [min, max];
}

/** Splits a configuration into α, q and β (β starts with the symbol under the head). */
export function configParts(config: Config, blank: string): { alpha: string; state: string; beta: string } {
  const [min, max] = usedRange(config);
  let alpha = '';
  let beta = '';
  for (let pos = min; pos <= max; pos++) {
    const symbol = config.tape.get(pos) ?? blank;
    if (pos < config.head) alpha += symbol;
    else beta += symbol;
  }
  return { alpha, state: config.state, beta };
}

export interface FormatOptions {
  /** pretty: "00q₀11" (default), plain: "00 q0 11" */
  style?: 'pretty' | 'plain';
  /** Show at most this many symbols on each side of the head, with "…" for the rest. */
  context?: number;
}

/** Formats a configuration in the usual notation α q β: the state stands right before the symbol under the head. */
export function formatConfig(machine: TuringMachine, config: Config, options: FormatOptions = {}): string {
  let { alpha, state, beta } = configParts(config, machine.blank);
  const { style = 'pretty', context } = options;
  if (context !== undefined) {
    if (alpha.length > context) alpha = '…' + alpha.slice(-context);
    if (beta.length > context + 1) beta = beta.slice(0, context + 1) + '…';
  }
  if (style === 'plain') return [alpha, state, beta].filter(Boolean).join(' ');
  return alpha + subscriptState(state) + beta;
}

/** The tape from the leftmost to the rightmost non-blank cell ("" if the tape is empty). */
export function tapeContents(tape: Tape, blank: string): string {
  if (tape.size === 0) return '';
  const keys = [...tape.keys()];
  const min = Math.min(...keys);
  const max = Math.max(...keys);
  let out = '';
  for (let pos = min; pos <= max; pos++) out += tape.get(pos) ?? blank;
  return out;
}
