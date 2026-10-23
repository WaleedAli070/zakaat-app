import { type Currency, D, toDS } from './money.js';
import { metalPricePerGram } from './prices.js';
import type { RuleSelection } from './rules/registry.js';
import {
  NISAB_GRAMS,
  type NisabBreakdown,
  type NisabMetal,
  type NisabStandard,
  type PriceTable,
} from './types.js';

const STANDARDS: readonly NisabStandard[] = ['STD_85_595', 'STD_87_612'];

export function computeNisab(
  rules: RuleSelection,
  base: Currency,
  prices: PriceTable,
): NisabBreakdown {
  const gold = metalPricePerGram('XAU', base, prices);
  const silver = metalPricePerGram('XAG', base, prices);
  const table = {
    GOLD: Object.fromEntries(
      STANDARDS.map((s) => [s, toDS(D(NISAB_GRAMS.GOLD[s]).mul(gold))]),
    ) as Record<NisabStandard, string>,
    SILVER: Object.fromEntries(
      STANDARDS.map((s) => [s, toDS(D(NISAB_GRAMS.SILVER[s]).mul(silver))]),
    ) as Record<NisabStandard, string>,
  };
  const metal: NisabMetal = rules.NISAB_METAL;
  let standard: NisabStandard;
  if (rules.NISAB_GRAMS === 'LOWER_VALUE') {
    standard = D(table[metal].STD_85_595).lte(D(table[metal].STD_87_612))
      ? 'STD_85_595'
      : 'STD_87_612';
  } else {
    standard = rules.NISAB_GRAMS;
  }
  return {
    silver: table.SILVER,
    gold: table.GOLD,
    applicable: { metal, standard, value: table[metal][standard] },
  };
}
