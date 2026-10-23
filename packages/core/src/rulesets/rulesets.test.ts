import { describe, expect, it } from 'vitest';
import { isOption, RULE_IDS, RULES } from '../rules/registry.js';
import { MODES } from '../types.js';
import { InvalidInputError } from '../validate.js';
import {
  getRuleset,
  getRulesetById,
  RULESETS,
  RULESETS_BY_ID,
  resolveRules,
  UnknownRulesetError,
} from './index.js';

describe('rulesets', () => {
  it('every mode has a valid default for every rule', () => {
    for (const mode of MODES) {
      const rs = getRuleset(mode);
      expect(rs.mode).toBe(mode);
      expect(rs.id).toBe(`${mode.toLowerCase()}@2026.1`);
      for (const id of RULE_IDS) expect(isOption(id, rs.defaults[id])).toBe(true);
    }
  });

  it('pins the spec defaults that matter most', () => {
    expect(RULESETS.HANAFI.defaults.JEWELLERY_PERSONAL).toBe('ZAKATABLE');
    expect(RULESETS.SHAFII.defaults.JEWELLERY_PERSONAL).toBe('EXEMPT_IF_WORN');
    expect(RULESETS.SHAFII.defaults.DEBT_DEDUCTION_SCOPE).toBe('NONE');
    expect(RULESETS.MALIKI.defaults.HAWL_MODEL).toBe('CONTINUOUS');
    expect(RULESETS.MALIKI.defaults.DEBT_SURPLUS_OFFSET).toBe('ON');
    expect(RULESETS.HANBALI.defaults.NISAB_COMBINE_METALS).toBe('SEPARATE');
    expect(RULESETS.HANAFI.defaults.NISAB_GRAMS).toBe('STD_87_612');
    expect(RULESETS.GENERAL.defaults.DEBT_DEDUCTION_SCOPE).toBe('NONE');
    expect(RULESETS.GENERAL.defaults.STOCK_PASSIVE_METHOD).toBe('FULL_MARKET_VALUE');
    expect(RULESETS.GENERAL.defaults.HAWL_MODEL).toBe('START_END');
    expect(RULESETS.MALIKI.defaults.ADVANCE_PAYMENT).toBe('RESTRICTED');
  });

  it('applies overridable overrides and ignores invalid or non-overridable ones', () => {
    const r = resolveRules('HANAFI', {
      JEWELLERY_PERSONAL: 'EXEMPT_IF_WORN',
      HAWL_MODEL: 'CONTINUOUS',
      NISAB_METAL: 'PLATINUM' as never,
    });
    expect(r.rules.JEWELLERY_PERSONAL).toBe('EXEMPT_IF_WORN');
    expect(r.rules.HAWL_MODEL).toBe('START_END');
    expect(r.rules.NISAB_METAL).toBe('SILVER');
    expect(r.appliedOverrides).toEqual(['JEWELLERY_PERSONAL']);
    expect(r.rulesetId).toBe('hanafi@2026.1');
  });

  it('GENERAL ignores every override', () => {
    const r = resolveRules('GENERAL', {
      DEBT_DEDUCTION_SCOPE: 'FULL',
      JEWELLERY_PERSONAL: 'EXEMPT_IF_WORN',
    });
    expect(r.rules.DEBT_DEDUCTION_SCOPE).toBe('NONE');
    expect(r.rules.JEWELLERY_PERSONAL).toBe('ZAKATABLE');
    expect(r.appliedOverrides).toEqual([]);
  });

  it('overridable lists match the registry', () => {
    for (const mode of MODES) {
      const rs = getRuleset(mode);
      const fromRegistry = RULE_IDS.filter((id) => RULES[id].overridable);
      expect(rs.overridable).toEqual(mode === 'GENERAL' ? [] : fromRegistry);
    }
  });
});

describe('rulesets by id', () => {
  it('looks up every ruleset by its id', () => {
    for (const mode of MODES) {
      const rs = getRuleset(mode);
      expect(getRulesetById(rs.id)).toBe(rs);
      expect(RULESETS_BY_ID[rs.id]).toBe(rs);
    }
  });
  it('throws UnknownRulesetError for an unknown id', () => {
    expect(() => getRulesetById('hanafi@1999.1')).toThrow(UnknownRulesetError);
    expect(() => getRulesetById('toString')).toThrow(UnknownRulesetError);
  });
  it('resolveRules honours an explicit id and rejects a mode mismatch', () => {
    expect(resolveRules('HANAFI', undefined, 'hanafi@2026.1').rulesetId).toBe('hanafi@2026.1');
    expect(() => resolveRules('HANAFI', undefined, 'shafii@2026.1')).toThrow(InvalidInputError);
  });
});
