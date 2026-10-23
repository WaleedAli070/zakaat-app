import { D, Decimal } from './money.js';

export type WeightUnit = 'G' | 'TOLA' | 'MASHA' | 'OZT';

export const GRAMS_PER: Record<WeightUnit, Decimal> = {
  G: D('1'),
  TOLA: D('11.6638038'),
  MASHA: D('0.972'),
  OZT: D('31.1034768'),
};

export function toGrams(value: Decimal, unit: WeightUnit): Decimal {
  return value.mul(GRAMS_PER[unit]);
}

export function karatToPurity(karat: number): Decimal {
  if (!Number.isInteger(karat) || karat < 1 || karat > 24)
    throw new RangeError(`karat out of range: ${karat}`);
  return new Decimal(karat).div(24);
}

export function permilleToPurity(permille: number): Decimal {
  if (!Number.isInteger(permille) || permille < 1 || permille > 1000)
    throw new RangeError(`permille out of range: ${permille}`);
  return new Decimal(permille).div(1000);
}
