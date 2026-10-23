import { describe, expect, it } from 'vitest';
import { RULE_IDS, RULES } from '../rules/registry.js';
import { CITATIONS, citationIdsFor, FIXED_OPTIONS, SPEC_URL } from './index.js';

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

  it('every citation sourced from the internal spec is flagged internal', () => {
    let seen = 0;
    for (const list of Object.values(CITATIONS)) {
      for (const c of list) {
        if (c.url === SPEC_URL || c.source.startsWith('Zakaat App design spec')) {
          seen++;
          expect(c.internal, c.id).toBe(true);
          expect(c.source).toBe('Zakaat App design spec (internal — pending scholar review)');
        } else {
          expect(c.internal, c.id).toBeUndefined();
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
