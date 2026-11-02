'use client';
import { useState } from 'react';
import { browserSession } from '../identity-access/browser-session';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { describeApiError } from '../../lib/api/api-errors';
import { printRequest, seatingSchema, type InvitationSeating } from './print-purchase-api';
export function useInvitationSeating(bookingId: string, enabled: boolean) {
  const [tables, setTables] = useState<InvitationSeating | null>(null),
    [error, setError] = useState<string | null>(null);
  const live = useLiveRefresh(
    async (isCurrent) => {
      try {
        const data = await browserSession.authorize((token) =>
          printRequest(token, `/bookings/${bookingId}/print-orders/seating-preview`, seatingSchema),
        );
        if (isCurrent()) {
          setTables(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isCurrent()) {
          setTables(null);
          setError(describeApiError(err).message);
        }
      }
    },
    {
      scope: bookingId + ':invitation-seating',
      bookingId,
      enabled,
      types: ['seating.updated', 'booking.updated'],
      initial: true,
    },
  );
  return { tables, error, refresh: live.refresh };
}
