'use client';

import { useState } from 'react';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { settlementApi } from '../settlement/settlement-api';
import { settlementStatus, type SettlementStatus } from '../settlement/settlement-status';
import { authorizedRead, type Proposal } from './use-couple-workspace';

export function useOverviewSettlement(proposal: Proposal | null) {
  const bookingId = proposal?.bookingId ?? '';
  const enabled =
    proposal?.capabilities.accessLevel === 'FULL' &&
    (proposal.phase === 'CONFIRMED' || proposal.phase === 'COMPLETED');
  const [result, setResult] = useState<{
    bookingId: string;
    status: SettlementStatus;
    error: FriendlyError | null;
  } | null>(null);
  const live = useLiveRefresh(
    async (isCurrent) => {
      try {
        const [billing, invoices] = await authorizedRead((token) =>
          Promise.all([
            settlementApi.billing(token, bookingId),
            settlementApi.invoices(token, bookingId),
          ]),
        );
        if (!isCurrent()) return;
        const current = invoices.revisions.find(
          (invoice) => invoice.invoiceRevisionId === invoices.currentRevisionId,
        );
        const status =
          invoices.currentRevisionId && !current
            ? 'unknown'
            : settlementStatus(billing, current?.document.totalVnd ?? null);
        setResult({ bookingId, status, error: null });
      } catch (error) {
        if (isCurrent())
          setResult({ bookingId, status: 'unknown', error: describeApiError(error) });
      }
    },
    {
      scope: bookingId,
      bookingId,
      enabled,
      initial: true,
      types: ['booking.updated', 'billing.updated', 'contract.updated', 'deposit.received'],
    },
  );
  return {
    status:
      enabled && result?.bookingId === bookingId ? result.status : ('unknown' as SettlementStatus),
    error: enabled && result?.bookingId === bookingId ? result.error : null,
    retry: live.refresh,
  };
}
