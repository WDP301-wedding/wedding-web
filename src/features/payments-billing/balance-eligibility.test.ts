import { describe, expect, it } from 'vitest';

import { balanceGate, blockedBalanceCopy } from './balance-eligibility';
import { readEligibility } from './billing-api';

describe('balanceGate', () => {
  it('allows payment only when the backend says canPay at the page revision', () => {
    expect(
      balanceGate(
        { canPay: true, reasonCode: null, nextAction: 'PAY_BALANCE', billingRevision: 2 },
        2,
      ),
    ).toEqual({ allowed: true, billingRevision: 2 });
  });

  it('treats a historical page revision as stale even when canPay is true', () => {
    const gate = balanceGate(
      { canPay: true, reasonCode: null, nextAction: 'PAY_BALANCE', billingRevision: 3 },
      2,
    );
    expect(gate).toMatchObject({
      allowed: false,
      action: 'refresh',
      reasonCode: 'STALE_BILLING_REVISION',
    });
  });

  it('blocks while eligibility is unknown (loading, error, older backend)', () => {
    expect(balanceGate(null, 2)).toMatchObject({ allowed: false, reasonCode: 'UNKNOWN' });
    expect(balanceGate(undefined, 2)).toMatchObject({ allowed: false, action: 'refresh' });
  });

  it.each(Object.keys(blockedBalanceCopy) as (keyof typeof blockedBalanceCopy)[])(
    'maps %s to a Vietnamese message and an action',
    (reasonCode) => {
      const gate = balanceGate(
        { canPay: false, reasonCode, nextAction: 'CONTACT_RESTAURANT', billingRevision: 2 },
        2,
      );
      expect(gate).toMatchObject({ allowed: false, reasonCode });
      expect(gate.allowed ? '' : gate.message).toMatch(/\p{L}/u);
    },
  );
});

describe('readEligibility', () => {
  it('accepts the two contract shapes', () => {
    expect(
      readEligibility({
        canPay: true,
        reasonCode: null,
        nextAction: 'PAY_BALANCE',
        billingRevision: 2,
      }),
    ).toEqual({ canPay: true, reasonCode: null, nextAction: 'PAY_BALANCE', billingRevision: 2 });
    expect(
      readEligibility({
        canPay: false,
        reasonCode: 'INVOICE_FINALIZATION_REQUIRED',
        nextAction: 'WAIT_FOR_FINAL_INVOICE',
        billingRevision: 2,
      }),
    ).toMatchObject({ canPay: false, reasonCode: 'INVOICE_FINALIZATION_REQUIRED' });
  });

  it.each([
    undefined,
    null,
    {},
    { canPay: true, reasonCode: null, nextAction: 'PAY_BALANCE' },
    { canPay: false, reasonCode: 'SOMETHING_NEW', nextAction: 'NONE', billingRevision: 1 },
    { canPay: true, reasonCode: 'X', nextAction: 'PAY_BALANCE', billingRevision: 1 },
  ])('rejects missing or unknown values: %j', (raw) => {
    expect(readEligibility(raw)).toBeNull();
  });
});
