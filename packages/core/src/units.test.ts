import { describe, expect, it } from 'vitest';
import { D, toDS } from './money.js';
import { GRAMS_PER, karatToPurity, permilleToPurity, toGrams } from './units.js';

describe('units', () => {
  it('uses the exact spec constants', () => {
    expect(toDS(GRAMS_PER.TOLA)).toBe('11.6638038');
    expect(toDS(GRAMS_PER.MASHA)).toBe('0.972');
    expect(toDS(GRAMS_PER.OZT)).toBe('31.1034768');
    expect(toDS(GRAMS_PER.G)).toBe('1');
  });

  it('converts tola and masha to grams exactly', () => {
    expect(toDS(toGrams(D('1'), 'TOLA'))).toBe('11.6638038');
    expect(toDS(toGrams(D('12'), 'MASHA'))).toBe('11.664');
    expect(toDS(toGrams(D('2.5'), 'OZT'))).toBe('77.758692');
  });

  it('maps karat and permille to purity fractions', () => {
    expect(toDS(karatToPurity(24))).toBe('1');
    expect(toDS(karatToPurity(22))).toBe('0.9166666666666666666666666666666666666667');
    expect(toDS(karatToPurity(18))).toBe('0.75');
    expect(toDS(permilleToPurity(925))).toBe('0.925');
    expect(() => karatToPurity(25)).toThrow(RangeError);
    expect(() => karatToPurity(0)).toThrow(RangeError);
    expect(() => permilleToPurity(1001)).toThrow(RangeError);
  });
});
