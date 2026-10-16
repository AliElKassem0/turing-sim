# Turing Machine Simulator

A general-purpose Turing machine simulator that runs entirely in the browser.
Write a machine in a small text format, give it an input and step through the
computation: an animated tape and head, the transition function with the active
rule highlighted, the full computation as a chain of configurations, and a
plain-English explanation of every step.

**Features**

- Six example machines: 0ⁿ1ⁿ, palindromes, aⁿbⁿcⁿ, binary increment, unary addition and the 3-state busy beaver
- Machine editor with live validation and line-numbered errors
- Your machines are saved in the browser, and any machine plus input can be shared as a link
- Step forwards and backwards, play at adjustable speed, or jump to any configuration
- Configurations in the standard α q β notation (for example `00q₀11`)
- A safety limit of 10,000 steps for machines that never halt, with fast history even on growing tapes
- Light and dark theme, keyboard shortcuts (`←` `→` step, `Space` play), works on phones

Built with TypeScript and Vite, no UI framework and no backend.

## Run it locally

You need Node.js 22 or newer.

```bash
npm install
npm run dev     # dev server at http://localhost:5173
npm test        # unit tests (Vitest)
npm run build   # type-check and build into dist/
```

## Machine format

```
name: Binary increment
description: Computes n + 1 for a binary number n.
input: 0 1          // input alphabet Σ
blank: B            // blank symbol (default B)
start: q0
accept: q2          // accepting states
examples: 1011 111 ε

note q0: walking right to the last digit

// state, read -> next, write, move (L, R or N)
q0, 0 -> q0, 0, R
q0, 1 -> q0, 1, R
q0, B -> q1, B, L
q1, 1 -> q1, 0, L
q1, 0 -> q2, 1, N
q1, B -> q2, 1, N
```

States and the tape alphabet are inferred from the rules. δ is partial: when no
rule applies, the machine halts and accepts only if it is in an accepting state.

## Semantics

- The tape is infinite in both directions; every cell outside the input holds the blank.
- The head starts on the first input symbol (on a blank for the empty word ε).
- One step reads the symbol under the head, looks up δ(state, symbol), writes, moves (L = −1, R = +1, N = 0) and switches state.
- An accepting state halts immediately with *accepted*. A missing rule in any other state halts with *rejected*.

## Project layout

```
src/tm/types.ts        TuringMachine type
src/tm/engine.ts       initialConfig, step, run → Trace (pure, no DOM)
src/tm/format.ts       configurations in α q β notation
src/tm/source.ts       text format parser and serializer
src/tm/validate.ts     structural checks for machines
src/machines/*.ts      built-in example machines, one per file
src/ui/                all DOM rendering
tests/                 Vitest tests
```

### Adding a built-in machine

Add a file to `src/machines/` that default-exports a `TuringMachine` (copy
`binary-increment.ts` as a template). It shows up in the sidebar automatically;
`src/machines/index.ts` only controls the display order. Add a test to
`tests/machines.test.ts`.

## Deployment

`.github/workflows/deploy.yml` runs the tests, builds the site and publishes it to
GitHub Pages on every push to `main`. The Vite `base` is `/turing-sim/` (see
`vite.config.ts`), so the site lives at `https://<username>.github.io/turing-sim/`.
If you rename the repository, change `base` to match.

## About this project

This is a learning project. The visual design is fully AI-generated. The
simulation logic is my own: I worked out how the machine has to behave (the
tape model, the step rule, the partial transition function, when a machine
halts, accepts or rejects, and how the engine is structured) and verified the
expected results by running the machines by hand. I did this to understand how
a Turing machine actually works and how to simulate one. AI then turned that
specification into TypeScript.

## Author

Ali El Kassem
