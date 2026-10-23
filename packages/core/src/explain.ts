import { citationIdsFor } from './citations/index.js';
import { type Decimal, toDS } from './money.js';
import type { RuleId } from './rules/registry.js';
import type { Effect, Explanation, Mode } from './types.js';

type InputValue = Decimal | string | boolean | number;

export function explain(args: {
  ruleId: RuleId | 'FIXED';
  option: string;
  mode: Mode;
  subjectId: string;
  inputs: Record<string, InputValue>;
  output: Decimal;
  effect: Effect;
  messageSuffix?: string;
}): Explanation {
  const inputs: Record<string, string> = {};
  for (const [k, v] of Object.entries(args.inputs)) {
    inputs[k] = typeof v === 'object' ? toDS(v) : String(v);
  }
  const suffix = args.messageSuffix ? `.${args.messageSuffix}` : '';
  return {
    ruleId: args.ruleId,
    option: args.option,
    mode: args.mode,
    subjectId: args.subjectId,
    inputs,
    output: toDS(args.output),
    effect: args.effect,
    citationIds: citationIdsFor(args.ruleId, args.option),
    messageKey: `rule.${args.ruleId}.${args.option}.${args.effect}${suffix}`,
  };
}
