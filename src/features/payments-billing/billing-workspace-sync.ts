'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { Proposal } from '../couple-workspace/use-couple-workspace';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import type { balanceGate } from './balance-eligibility';
import type { BillingContext, BillingView } from './billing-api';
import { type Authorize, loadAvailableBookings } from './billing-workspace.helpers';

export function useAvailableBookings(
  authorize: Authorize,
  embedded: boolean,
  onError: (caught: unknown) => void,
) {
  const [availableBookings, setAvailableBookings] = useState<
    readonly { bookingId: string; label: string }[]
  >([]);

  useEffect(() => {
    if (embedded) return;
    let active = true;
    void loadAvailableBookings(authorize)
      .then((mapped) => {
        if (active) setAvailableBookings(mapped);
      })
      .catch((caught: unknown) => {
        if (active) onError(caught);
      });
    return () => {
      active = false;
    };
  }, [authorize, embedded, onError]);

  return availableBookings;
}

export function useWorkspaceSync({
  embedded,
  bookingId,
  context,
  view,
  gate,
  initialProposal,
  load,
  run,
  busyRef,
  pendingProviderReadRef,
  contextSeedRef,
  setBookingId,
}: {
  embedded: boolean;
  bookingId: string;
  context: BillingContext | null;
  view: BillingView | null;
  gate: ReturnType<typeof balanceGate> | null;
  initialProposal: Proposal | null | undefined;
  load: (id: string) => Promise<void>;
  run: (operation: () => Promise<void>) => Promise<void>;
  busyRef: { current: boolean };
  pendingProviderReadRef: { current: Proposal | undefined };
  contextSeedRef: { current: Proposal | undefined };
  setBookingId: (id: string) => void;
}) {
  const autoOpened = useRef(false);
  const openFromUrl = useEffectEvent((id: string) => {
    void run(() => load(id));
  });
  useEffect(() => {
    if (!embedded || autoOpened.current || bookingId === '') return;
    autoOpened.current = true;
    openFromUrl(bookingId);
  }, [embedded, bookingId]);

  const autoRefreshedFor = useRef<number | null>(null);
  const refreshBilling = useEffectEvent(() => {
    if (context !== null) void run(() => load(context.bookingId));
  });

  const previousProviderProposal = useRef(initialProposal);
  const readProviderProposal = useEffectEvent((next: Proposal) => {
    if (busyRef.current) {
      pendingProviderReadRef.current = next;
      return;
    }
    contextSeedRef.current = next;
    setBookingId(next.bookingId);
    void run(() => load(next.bookingId));
  });
  useEffect(() => {
    if (!embedded || !initialProposal || previousProviderProposal.current === initialProposal)
      return;
    previousProviderProposal.current = initialProposal;
    if (autoOpened.current) readProviderProposal(initialProposal);
  }, [embedded, initialProposal]);

  const needsRefresh = gate !== null && !gate.allowed && gate.action === 'refresh';
  useEffect(() => {
    if (!needsRefresh || view === null || autoRefreshedFor.current === view.billingRevision) return;
    autoRefreshedFor.current = view.billingRevision;
    refreshBilling();
  }, [needsRefresh, view]);
}

export function useBillingRealtimeSync({
  bookingId,
  embedded,
  run,
  load,
}: {
  bookingId: string;
  embedded: boolean;
  run: (operation: () => Promise<void>) => Promise<void>;
  load: (bookingId: string) => Promise<void>;
}) {
  useRealtimeSubscription({
    bookingId: bookingId || undefined,
    enabled: Boolean(bookingId) && !embedded,
    onEvent: (event) => {
      if (!event.scope.bookingId || event.scope.bookingId === bookingId) {
        if (
          event.type === 'billing.updated' ||
          event.type === 'deposit.received' ||
          event.type === 'contract.updated'
        ) {
          void run(() => load(bookingId));
        }
      }
    },
    onResync: () => {
      if (bookingId) {
        void run(() => load(bookingId));
      }
    },
  });
}

