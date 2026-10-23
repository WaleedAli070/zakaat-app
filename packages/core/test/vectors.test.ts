/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { type CalculationInput, calculate } from '../src/index.js';

type Vector = {
  name: string;
  reviewedBy: { name: string; organisation: string; date: string } | null;
  sources: string[];
  input: CalculationInput;
  expected: {
    grossZakatable: string;
    deductions: string;
    net: string;
    zakatDue: string;
    meetsNisab: boolean;
    hawlStatus: 'DUE' | 'BROKEN' | 'RESET';
    explanationIncludes: { ruleId: string; option: string; subjectId: string; effect: string }[];
  };
};

const files = import.meta.glob<{ default: Vector }>('./vectors/**/*.json', { eager: true });
const vectors = Object.entries(files).map(([path, mod]) => ({ path, vector: mod.default }));

describe('golden vectors', () => {
  it('loads at least nine vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(9);
  });

  for (const { path, vector } of vectors) {
    it(`${vector.name} (${path})`, () => {
      const out = calculate(vector.input);
      expect(out.grossZakatable).toBe(vector.expected.grossZakatable);
      expect(out.deductions).toBe(vector.expected.deductions);
      expect(out.net).toBe(vector.expected.net);
      expect(out.zakatDue).toBe(vector.expected.zakatDue);
      expect(out.meetsNisab).toBe(vector.expected.meetsNisab);
      expect(out.hawlStatus).toBe(vector.expected.hawlStatus);
      for (const want of vector.expected.explanationIncludes) {
        const found = out.explanations.some(
          (e) =>
            e.ruleId === want.ruleId &&
            e.option === want.option &&
            e.subjectId === want.subjectId &&
            e.effect === want.effect,
        );
        expect(found, `${vector.name}: ${JSON.stringify(want)}`).toBe(true);
      }
      expect(Array.isArray(vector.sources) && vector.sources.length > 0).toBe(true);
    });
  }
});
