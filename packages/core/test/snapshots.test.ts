/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { type CalculationInput, calculate } from '../src/index.js';

const files = import.meta.glob<{ default: { name: string; input: CalculationInput } }>(
  './vectors/**/*.json',
  { eager: true },
);

describe('explanation snapshots', () => {
  for (const [path, mod] of Object.entries(files)) {
    it(`${mod.default.name} (${path})`, () => {
      const out = calculate(mod.default.input);
      expect(
        out.explanations.map((e) => ({
          ruleId: e.ruleId,
          option: e.option,
          subjectId: e.subjectId,
          effect: e.effect,
          output: e.output,
          messageKey: e.messageKey,
        })),
      ).toMatchSnapshot();
    });
  }
});
