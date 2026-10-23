import { describe, expect, it } from 'vitest';
import { RULESETS } from '../src/index.js';

describe('ruleset table', () => {
  it('pins every default of every mode', () => {
    expect(RULESETS).toMatchSnapshot();
  });
});
