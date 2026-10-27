'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { Proposal } from '../couple-workspace/use-couple-workspace';
import type { balanceGate } from './balance-eligibility';
import type { BillingContext, BillingView } from './billing-api';
import { type Authorize, loadAvailableBookings } from './billing-workspace.helpers.js';

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
  busy,
  pendingProviderRead,
  contextSeed,
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
  busy: { current: boolean };
  pendingProviderRead: { current: Proposal | undefined };
  contextSeed: { current: Proposal | undefined };
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
    if (busy.current) {
      pendingProviderRead.current = next;
      return;
    }
    contextSeed.current = next;
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
