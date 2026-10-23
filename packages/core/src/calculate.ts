import { explain } from './explain.js';
import { evaluateHawl } from './hawl.js';
import { computeDeductions } from './liabilities.js';
import { D, type Decimal, RATE_DIVISOR, roundUpToMinorUnit, sum, toDS, ZERO } from './money.js';
import { computeNisab } from './nisab.js';
import { resolveRules } from './rulesets/index.js';
import type { AssetLine, CalculationInput, CalculationOutput, Explanation } from './types.js';
import { type ValuationContext, valueAsset } from './valuation/index.js';
import { ENGINE_VERSION } from './version.js';

export function calculate(input: CalculationInput): CalculationOutput {
  const { rulesetId, rules } = resolveRules(input.mode, input.overrides);
  const ctx: ValuationContext = {
    mode: input.mode,
    rules,
    base: input.baseCurrency,
    prices: input.prices,
  };
  const explanations: Explanation[] = [];
  const lines: AssetLine[] = [];

  for (const asset of input.assets) {
    const v = valueAsset(asset, ctx);
    lines.push(v.line);
    explanations.push(...v.explanations);
  }
  const gross = sum(lines.map((l) => D(l.zakatableValue)));

  const ded = computeDeductions({
    liabilities: input.liabilities,
    ...(input.surplusNonZakatableAssets !== undefined
      ? { surplusNonZakatableAssets: input.surplusNonZakatableAssets }
      : {}),
    ...(input.priorUnpaidZakat !== undefined ? { priorUnpaidZakat: input.priorUnpaidZakat } : {}),
    ctx,
  });
  explanations.push(...ded.explanations);
  let deductions = ded.total;
  if (deductions.gt(gross)) {
    explanations.push(
      explain({
        ruleId: 'FIXED',
        option: 'DEDUCTIONS_CAPPED_AT_GROSS',
        mode: input.mode,
        subjectId: 'liabilities',
        inputs: { requested: deductions, gross },
        output: gross,
        effect: 'INFO',
      }),
    );
    deductions = gross;
  }
  const net = gross.minus(deductions);

  const nisab = computeNisab(rules, input.baseCurrency, input.prices);
  const threshold = D(nisab.applicable.value);
  explanations.push(
    explain({
      ruleId: 'NISAB_METAL',
      option: rules.NISAB_METAL,
      mode: input.mode,
      subjectId: 'nisab',
      inputs: { standard: nisab.applicable.standard, threshold, net },
      output: threshold,
      effect: 'INFO',
    }),
  );
  explanations.push(
    explain({
      ruleId: 'NISAB_GRAMS',
      option: rules.NISAB_GRAMS,
      mode: input.mode,
      subjectId: 'nisab',
      inputs: { resolvedStandard: nisab.applicable.standard },
      output: threshold,
      effect: 'INFO',
    }),
  );

  let assessable: Decimal;
  let meetsNisab: boolean;
  if (rules.NISAB_COMBINE_METALS === 'COMBINE') {
    assessable = net;
    meetsNisab = net.gte(threshold);
    explanations.push(
      explain({
        ruleId: 'NISAB_COMBINE_METALS',
        option: 'COMBINE',
        mode: input.mode,
        subjectId: 'nisab',
        inputs: { net, threshold },
        output: assessable,
        effect: 'INFO',
      }),
    );
  } else {
    const goldBucket = sum(
      lines.filter((l) => l.category === 'GOLD').map((l) => D(l.zakatableValue)),
    );
    const silverBucket = sum(
      lines.filter((l) => l.category === 'SILVER').map((l) => D(l.zakatableValue)),
    );
    let moneyBucket = gross.minus(goldBucket).minus(silverBucket).minus(deductions);
    if (moneyBucket.isNegative()) moneyBucket = ZERO;
    const std = nisab.applicable.standard;
    const goldMeets = goldBucket.gt(ZERO) && goldBucket.gte(D(nisab.gold[std]));
    const silverMeets = silverBucket.gt(ZERO) && silverBucket.gte(D(nisab.silver[std]));
    const moneyMeets = moneyBucket.gt(ZERO) && moneyBucket.gte(threshold);
    assessable = sum([
      goldMeets ? goldBucket : ZERO,
      silverMeets ? silverBucket : ZERO,
      moneyMeets ? moneyBucket : ZERO,
    ]);
    meetsNisab = goldMeets || silverMeets || moneyMeets;
    explanations.push(
      explain({
        ruleId: 'NISAB_COMBINE_METALS',
        option: 'SEPARATE',
        mode: input.mode,
        subjectId: 'nisab',
        inputs: {
          goldBucket,
          goldNisab: nisab.gold[std],
          goldMeets,
          silverBucket,
          silverNisab: nisab.silver[std],
          silverMeets,
          moneyBucket,
          moneyNisab: threshold,
          moneyMeets,
        },
        output: assessable,
        effect: 'INFO',
      }),
    );
  }

  const hawl = evaluateHawl(input.hawl, {
    mode: input.mode,
    rules,
    ...(input.hijriOffsetDays !== undefined ? { hijriOffsetDays: input.hijriOffsetDays } : {}),
  });
  explanations.push(...hawl.explanations);

  let zakatDue = ZERO;
  const unrounded = assessable.div(RATE_DIVISOR);
  if (meetsNisab && hawl.status === 'DUE') {
    zakatDue = roundUpToMinorUnit(unrounded, input.baseCurrency);
  }
  explanations.push(
    explain({
      ruleId: 'FIXED',
      option: 'RATE_LUNAR_2_5',
      mode: input.mode,
      subjectId: 'due',
      inputs: { assessable, meetsNisab, hawlStatus: hawl.status },
      output: meetsNisab && hawl.status === 'DUE' ? unrounded : ZERO,
      effect: 'INFO',
    }),
  );
  explanations.push(
    explain({
      ruleId: 'FIXED',
      option: 'ROUND_UP_FINAL_MINOR_UNIT',
      mode: input.mode,
      subjectId: 'due',
      inputs: { unrounded, currency: input.baseCurrency },
      output: zakatDue,
      effect: 'INFO',
    }),
  );

  return {
    engineVersion: ENGINE_VERSION,
    rulesetId,
    mode: input.mode,
    baseCurrency: input.baseCurrency,
    effectiveRules: rules,
    lines,
    grossZakatable: toDS(gross),
    deductions: toDS(deductions),
    net: toDS(net),
    nisab,
    meetsNisab,
    hawlStatus: hawl.status,
    zakatDue: toDS(zakatDue),
    explanations,
  };
}
