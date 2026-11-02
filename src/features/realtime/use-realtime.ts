'use client';

import { useEffect, useRef } from 'react';
import { sharedCoupleRealtime, type RealtimeEvent } from './realtime-client';

export interface UseRealtimeOptions {
  readonly bookingId?: string | null | undefined;
  readonly filterBooking?: boolean | undefined;
  readonly enabled?: boolean | undefined;
  readonly onEvent?: ((event: RealtimeEvent) => void) | undefined;
  readonly onResync?: (() => void) | undefined;
}

export function useRealtimeSubscription({
  bookingId,
  filterBooking = false,
  enabled = true,
  onEvent,
  onResync,
}: UseRealtimeOptions): void {
  const onEventRef = useRef(onEvent);
  const onResyncRef = useRef(onResync);

  useEffect(() => {
    onEventRef.current = onEvent;
    onResyncRef.current = onResync;
  });

  useEffect(() => {
    if (!enabled) return;

    const unsubEvent = sharedCoupleRealtime.addEventListener((event) => {
      if (
        filterBooking &&
        bookingId &&
        event.scope.bookingId &&
        event.scope.bookingId !== bookingId
      ) {
        return; // Ignore other bookings only when explicitly opted in
      }
      onEventRef.current?.(event);
    });

    const unsubResync = sharedCoupleRealtime.addResyncListener(() => {
      onResyncRef.current?.();
    });

    let unsubBooking: (() => void) | undefined;
    if (bookingId) {
      unsubBooking = sharedCoupleRealtime.subscribeBooking(bookingId);
    }

    return () => {
      unsubEvent();
      unsubResync();
      unsubBooking?.();
    };
  }, [bookingId, enabled, filterBooking]);
}
