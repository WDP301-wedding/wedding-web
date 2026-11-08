import { describe, expect, it } from 'vitest';
import { contractDepositRate } from './deposit-policy';
describe('contract deposit policy', () => {
  it('uses the frozen rate rather than deriving a percentage from rounded money', () => {
    expect(
      contractDepositRate({ depositRate: 50, contractTotalVnd: 101, depositAmountVnd: 51 }),
    ).toBe(50);
    expect(contractDepositRate({ contractTotalVnd: 1, depositAmountVnd: 1 })).toBe(30);
    expect(() => contractDepositRate({ depositRate: 101 })).toThrow();
  });
});
