import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Proposal } from './use-couple-workspace';
import { useOverviewSettlement } from './use-overview-settlement';

const fixture = vi.hoisted(() => ({ billing: vi.fn(), invoices: vi.fn() }));
vi.mock('../settlement/settlement-api', () => ({ settlementApi: fixture }));
vi.mock('./use-couple-workspace', () => ({
  authorizedRead: (operation: (token: string) => Promise<unknown>) => operation('token'),
}));
vi.mock('../realtime/use-realtime', () => ({ useRealtimeSubscription: () => undefined }));
const proposal = (bookingId: string, accessLevel = 'FULL') =>
  ({
    bookingId,
    phase: 'COMPLETED',
    capabilities: { accessLevel },
  }) as Proposal;
const billing = {
  billingRevision: 5,
  totals: { acceptedChargesVnd: 100, netPaidVnd: 100, outstandingVnd: 0, creditVnd: 0 },
  balancePaymentEligibility: { billingRevision: 5, reasonCode: 'BILLING_BALANCE_LIMIT_EXCEEDED' },
};
const invoices = {
  currentRevisionId: 'i',
  revisions: [{ invoiceRevisionId: 'i', document: { totalVnd: 100 } }],
};

beforeEach(() => {
  fixture.billing.mockReset().mockResolvedValue(billing);
  fixture.invoices.mockReset().mockResolvedValue(invoices);
});

describe('overview settlement reads', () => {
  it('uses invoice and ledger evidence, then clears settlement when a later read fails', async () => {
    const { result } = renderHook(() => useOverviewSettlement(proposal('b1')));
    await waitFor(() => expect(result.current.status).toBe('settled'));
    fixture.billing.mockRejectedValueOnce(new Error('unavailable'));
    await act(() => result.current.retry());
    expect(result.current.status).toBe('unknown');
    expect(result.current.error).not.toBeNull();
  });
  it('never carries a settled result across a booking switch', async () => {
    const { result, rerender } = renderHook(({ id }) => useOverviewSettlement(proposal(id)), {
      initialProps: { id: 'b1' },
    });
    await waitFor(() => expect(result.current.status).toBe('settled'));
    fixture.billing.mockReturnValueOnce(new Promise(() => {}));
    rerender({ id: 'b2' });
    expect(result.current.status).toBe('unknown');
  });
  it('does not read post-deposit resources before FULL access', async () => {
    const { result } = renderHook(() => useOverviewSettlement(proposal('b1', 'RESTRICTED')));
    await act(() => Promise.resolve());
    expect(result.current.status).toBe('unknown');
    expect(fixture.billing).not.toHaveBeenCalled();
  });
  it('does not use an older invoice if the current revision is missing from the response', async () => {
    fixture.invoices.mockResolvedValueOnce({ ...invoices, currentRevisionId: 'new' });
    const { result } = renderHook(() => useOverviewSettlement(proposal('b1')));
    await waitFor(() => expect(fixture.invoices).toHaveBeenCalled());
    expect(result.current.status).toBe('unknown');
  });
});
