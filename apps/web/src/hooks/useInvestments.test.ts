import { describe, it, expect } from 'vitest';
import * as hooks from './useInvestments';

describe('useInvestments module', () => {
  it('exporta useUpdateInvestment', () => {
    expect(typeof hooks.useUpdateInvestment).toBe('function');
  });
});
