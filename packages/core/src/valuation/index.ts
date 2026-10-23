import type { Currency } from '../money.js';
import type { RuleSelection } from '../rules/registry.js';
import type { AssetInput, AssetLine, Explanation, Mode, PriceTable } from '../types.js';
import { valueMetal } from './metal.js';
import { valueMoney } from './money.js';
import { valueRealEstate } from './realEstate.js';
import { valueReceivable } from './receivable.js';
import { valueRetirement } from './retirement.js';
import { valueStock } from './stock.js';

export type ValuationContext = {
  mode: Mode;
  rules: RuleSelection;
  base: Currency;
  prices: PriceTable;
};
export type Valued = { line: AssetLine; explanations: Explanation[] };

export function valueAsset(asset: AssetInput, ctx: ValuationContext): Valued {
  switch (asset.category) {
    case 'CASH':
    case 'BANK':
    case 'FOREIGN_CURRENCY':
    case 'OTHER':
      return valueMoney(asset, ctx);
    case 'GOLD':
    case 'SILVER':
      return valueMetal(asset, ctx);
    case 'STOCK':
      return valueStock(asset, ctx);
    case 'RETIREMENT':
      return valueRetirement(asset, ctx);
    case 'REAL_ESTATE':
      return valueRealEstate(asset, ctx);
    case 'RECEIVABLE':
      return valueReceivable(asset, ctx);
  }
}
