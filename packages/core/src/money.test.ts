import { describe, expect, it } from 'vitest';
import {
  D,
  InvalidDecimalError,
  RATE_DIVISOR,
  roundUpToMinorUnit,
  sum,
  toDS,
  ZERO,
} from './money.js';

describe('D / toDS', () => {
  it('parses canonical decimal strings exactly', () => {
    expect(toDS(D('1234.5600'))).toBe('1234.56');
    expect(toDS(D('-0.10'))).toBe('-0.1');
    expect(toDS(D('0'))).toBe('0');
    expect(toDS(D('1000000000000.000001'))).toBe('1000000000000.000001');
  });

  it('rejects non-canonical input', () => {
    expect(() => D('1e5')).toThrow(InvalidDecimalError);
    expect(() => D('1,000')).toThrow(InvalidDecimalError);
    expect(() => D('')).toThrow(InvalidDecimalError);
    expect(() => D('abc')).toThrow(InvalidDecimalError);
    expect(() => D('NaN')).toThrow(InvalidDecimalError);
  });

  it('normalises negative zero to 0', () => {
    expect(toDS(D('-0'))).toBe('0');
    expect(toDS(D('-0.00'))).toBe('0');
    expect(toDS(ZERO.times(-1))).toBe('0');
  });

  it('passes Decimal values through unchanged', () => {
    const x = D('1.5');
    expect(D(x)).toBe(x);
  });

  it('never produces exponent notation', () => {
    expect(toDS(D('0.0000001'))).toBe('0.0000001');
    expect(toDS(D('123456789012345678901234'))).toBe('123456789012345678901234');
  });
});

describe('sum', () => {
  it('adds exactly without float drift', () => {
    expect(toDS(sum([D('0.1'), D('0.2')]))).toBe('0.3');
    expect(toDS(sum([]))).toBe('0');
  });
});

describe('roundUpToMinorUnit', () => {
  it('rounds up (away from zero) to 2 decimals for PKR', () => {
    expect(toDS(roundUpToMinorUnit(D('100.001'), 'PKR'))).toBe('100.01');
    expect(toDS(roundUpToMinorUnit(D('100.00'), 'PKR'))).toBe('100');
    expect(toDS(roundUpToMinorUnit(D('0.0001'), 'USD'))).toBe('0.01');
    expect(toDS(roundUpToMinorUnit(D('-100.001'), 'PKR'))).toBe('-100.01');
  });

  it('divides by 40 exactly for the zakat rate', () => {
    expect(toDS(D('1000').div(RATE_DIVISOR))).toBe('25');
    expect(toDS(ZERO.div(RATE_DIVISOR))).toBe('0');
  });
});
