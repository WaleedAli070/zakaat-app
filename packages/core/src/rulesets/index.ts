import { isOption, RULE_IDS, RULES, type RuleId, type RuleSelection } from '../rules/registry.js';
import type { Mode } from '../types.js';
import { InvalidInputError } from '../validate.js';
import { GENERAL_2026_1 } from './general.js';
import { HANAFI_2026_1 } from './hanafi.js';
import { HANBALI_2026_1 } from './hanbali.js';
import { MALIKI_2026_1 } from './maliki.js';
import { SHAFII_2026_1 } from './shafii.js';

export type Ruleset = {
  id: string;
  mode: Mode;
  version: string;
  defaults: RuleSelection;
  overridable: readonly RuleId[];
};

const OVERRIDABLE = RULE_IDS.filter((id) => RULES[id].overridable);

function make(mode: Mode, version: string, defaults: RuleSelection): Ruleset {
  return {
    id: `${mode.toLowerCase()}@${version}`,
    mode,
    version,
    defaults,
    overridable: mode === 'GENERAL' ? [] : OVERRIDABLE,
  };
}

export const RULESETS: Record<Mode, Ruleset> = {
  HANAFI: make('HANAFI', '2026.1', HANAFI_2026_1),
  SHAFII: make('SHAFII', '2026.1', SHAFII_2026_1),
  MALIKI: make('MALIKI', '2026.1', MALIKI_2026_1),
  HANBALI: make('HANBALI', '2026.1', HANBALI_2026_1),
  GENERAL: make('GENERAL', '2026.1', GENERAL_2026_1),
};

export const RULESETS_BY_ID: Record<string, Ruleset> = Object.fromEntries(
  Object.values(RULESETS).map((rs) => [rs.id, rs]),
);

export class UnknownRulesetError extends Error {
  constructor(public readonly rulesetId: string) {
    super(`Unknown ruleset id: ${rulesetId}`);
    this.name = 'UnknownRulesetError';
  }
}

export function getRuleset(mode: Mode): Ruleset {
  return RULESETS[mode];
}

export function getRulesetById(id: string): Ruleset {
  const rs = Object.hasOwn(RULESETS_BY_ID, id) ? RULESETS_BY_ID[id] : undefined;
  if (!rs) throw new UnknownRulesetError(id);
  return rs;
}

export function resolveRules(
  mode: Mode,
  overrides?: Partial<RuleSelection>,
  rulesetId?: string,
): { rulesetId: string; rules: RuleSelection; appliedOverrides: RuleId[] } {
  const rs = rulesetId === undefined ? getRuleset(mode) : getRulesetById(rulesetId);
  if (rs.mode !== mode) {
    throw new InvalidInputError(
      'rulesetId',
      'input',
      `ruleset ${rs.id} is for mode ${rs.mode}, not ${mode}`,
    );
  }
  const rules: Record<string, string> = { ...rs.defaults };
  const applied: RuleId[] = [];
  if (overrides) {
    for (const id of rs.overridable) {
      const value = overrides[id];
      if (value !== undefined && isOption(id, value)) {
        rules[id] = value;
        applied.push(id);
      }
    }
  }
  return { rulesetId: rs.id, rules: rules as unknown as RuleSelection, appliedOverrides: applied };
}
