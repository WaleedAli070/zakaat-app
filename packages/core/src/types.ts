import type { ISODate } from './hijri.js';
import type { Currency, DecimalString } from './money.js';
import type { RuleId, RuleSelection } from './rules/registry.js';

export type Mode = 'HANAFI' | 'SHAFII' | 'MALIKI' | 'HANBALI' | 'GENERAL';
export const MODES: readonly Mode[] = ['HANAFI', 'SHAFII', 'MALIKI', 'HANBALI', 'GENERAL'];

export type Metal = 'XAU' | 'XAG';
export type NisabMetal = 'SILVER' | 'GOLD';
export type NisabStandard = 'STD_85_595' | 'STD_87_612';

export const NISAB_GRAMS: Record<NisabMetal, Record<NisabStandard, DecimalString>> = {
  GOLD: { STD_85_595: '85', STD_87_612: '87.48' },
  SILVER: { STD_85_595: '595', STD_87_612: '612.36' },
};

export type PriceTable = {
  asOf: ISODate;
  /** price of one gram of pure metal, keyed by quote currency */
  perGram: Record<Metal, Partial<Record<Currency, DecimalString>>>;
  /** units of each currency per 1 USD; USD itself is '1' */
  fx: { USD: Partial<Record<Currency, DecimalString>> };
  fileHash?: string;
};

export type JewelleryUsage = 'WORN' | 'STORED' | 'INVESTMENT' | 'MENS';
export type StockIntent = 'TRADING' | 'PASSIVE';
export type RealEstateType = 'HOME' | 'RENTAL' | 'LAND_RESALE' | 'PLOT_FILE';
export type ReceivableStrength = 'STRONG' | 'WEAK';

type AssetBase = { id: string; label: string; currency: Currency };

export type MoneyAsset = AssetBase & {
  category: 'CASH' | 'BANK' | 'FOREIGN_CURRENCY' | 'OTHER';
  amount: DecimalString;
};
export type MetalAsset = AssetBase & {
  category: 'GOLD' | 'SILVER';
  weightGrams: DecimalString;
  /** fraction 0..1, e.g. 22k = 22/24 */
  purity: DecimalString;
  usage: JewelleryUsage;
  excessive?: boolean;
};
export type StockAsset = AssetBase & {
  category: 'STOCK';
  marketValue: DecimalString;
  intent: StockIntent;
  /** user-supplied zakatable-asset ratio 0..100; overrides the mode's proxy when present */
  proxyPercent?: DecimalString;
  dividendsReceived?: DecimalString;
};
export type RetirementAsset = AssetBase & {
  category: 'RETIREMENT';
  vestedBalance: DecimalString;
  accessible: boolean;
  taxPercent: DecimalString;
  penaltyPercent: DecimalString;
  /** share 0..100 of the balance that came from voluntary contributions */
  voluntaryPercent: DecimalString;
  zakatableProportionPercent?: DecimalString;
};
export type RealEstateAsset = AssetBase & {
  category: 'REAL_ESTATE';
  type: RealEstateType;
  marketValue: DecimalString;
  savedRent?: DecimalString;
  netAnnualRent?: DecimalString;
  specificPlot?: boolean;
  resaleIntentAtPurchase?: boolean;
  possessionTaken?: boolean;
  amountPaid?: DecimalString;
};
export type ReceivableAsset = AssetBase & {
  category: 'RECEIVABLE';
  amount: DecimalString;
  strength: ReceivableStrength;
};
export type AssetInput =
  | MoneyAsset
  | MetalAsset
  | StockAsset
  | RetirementAsset
  | RealEstateAsset
  | ReceivableAsset;
export type AssetCategory = AssetInput['category'];

export type LiabilityInput = {
  id: string;
  label: string;
  kind: 'IMMEDIATE' | 'LONG_TERM';
  currency: Currency;
  totalOutstanding: DecimalString;
  /** the instalment or arrears presently payable */
  currentlyDue: DecimalString;
  /** principal + interest falling due in the next 12 lunar months */
  dueWithinYear: DecimalString;
  interestWithinYear: DecimalString;
};

export type HawlInput = {
  startISO: ISODate;
  closeISO: ISODate;
  /** continuous modes: did wealth fall below nisab during the year? */
  dipBelowNisab?: 'NO' | 'YES';
  /** start/end modes: did wealth fall to zero or basic needs during the year? */
  wealthHitZero?: 'NO' | 'YES';
  /** when the answer above is YES: the date nisab was regained */
  regainedISO?: ISODate;
};

export type CalculationInput = {
  mode: Mode;
  baseCurrency: Currency;
  overrides?: Partial<RuleSelection>;
  assets: readonly AssetInput[];
  liabilities: readonly LiabilityInput[];
  /** base currency; value of surplus non-zakatable assets beyond basic needs (Maliki/Hanbali offset) */
  surplusNonZakatableAssets?: DecimalString;
  /** base currency; zakat from earlier years still unpaid */
  priorUnpaidZakat?: DecimalString;
  hawl: HawlInput;
  prices: PriceTable;
  hijriOffsetDays?: number;
};

export type Effect = 'INCLUDE' | 'EXCLUDE' | 'PARTIAL' | 'DEDUCT' | 'INFO' | 'WARNING';

export type Explanation = {
  ruleId: RuleId | 'FIXED';
  option: string;
  mode: Mode;
  subjectId: string;
  inputs: Record<string, string>;
  output: DecimalString;
  effect: Effect;
  citationIds: readonly string[];
  messageKey: string;
};

export type AssetLine = {
  assetId: string;
  category: AssetCategory;
  label: string;
  baseValue: DecimalString;
  zakatableValue: DecimalString;
  effect: Effect;
};

export type NisabBreakdown = {
  silver: Record<NisabStandard, DecimalString>;
  gold: Record<NisabStandard, DecimalString>;
  applicable: { metal: NisabMetal; standard: NisabStandard; value: DecimalString };
};

export type HawlStatus = 'DUE' | 'BROKEN' | 'RESET';

export type CalculationOutput = {
  engineVersion: string;
  rulesetId: string;
  mode: Mode;
  baseCurrency: Currency;
  effectiveRules: RuleSelection;
  lines: readonly AssetLine[];
  grossZakatable: DecimalString;
  deductions: DecimalString;
  net: DecimalString;
  nisab: NisabBreakdown;
  meetsNisab: boolean;
  hawlStatus: HawlStatus;
  zakatDue: DecimalString;
  explanations: readonly Explanation[];
};
