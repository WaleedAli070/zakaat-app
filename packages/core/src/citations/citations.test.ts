import { describe, expect, it } from 'vitest';
import { RULE_IDS, RULES } from '../rules/registry.js';
import { CITATIONS, citationIdsFor, FIXED_OPTIONS } from './index.js';

describe('citations', () => {
  it('every registry option has at least one citation with a URL', () => {
    for (const id of RULE_IDS) {
      for (const opt of RULES[id].options) {
        const list = CITATIONS[`${id}:${opt}`] ?? [];
        expect(list.length, `${id}:${opt}`).toBeGreaterThan(0);
        for (const c of list) {
          expect(c.url, c.id).toMatch(/^https?:\/\//);
          expect(c.source.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every FIXED option used by the engine has a citation', () => {
    for (const opt of FIXED_OPTIONS) {
      expect(citationIdsFor('FIXED', opt).length, opt).toBeGreaterThan(0);
    }
  });

  it('citation ids are unique and match their key', () => {
    const seen = new Set<string>();
    for (const [key, list] of Object.entries(CITATIONS)) {
      for (const c of list) {
        expect(seen.has(c.id), c.id).toBe(false);
        seen.add(c.id);
        expect(c.id.startsWith(key.replace(':', '.'))).toBe(true);
      }
    }
  });
});
