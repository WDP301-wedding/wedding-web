'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { useSpaceExtras } from '../couple-workspace/space-provider';
import type { Proposal } from '../couple-workspace/use-couple-workspace';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { balanceGate } from './balance-eligibility';
import type {
  AttemptView,
  BillingContext,
  BillingView,
  CheckoutView,
  CoupleBillingGateway,
} from './billing-api';
import { billingMessage, denied, unresolved } from './billing-display';
import { createBillingIntents } from './billing-intents';
import {
  type Authorize,
  type CheckoutIntent,
  applyAttemptDisplayState,
  buildRecoveryIntent,
  completed,
  executeFetchRestoredAttempt,
  executeRefreshCompletedAttempt,
  executeStartCheckout,
  lastCheckoutKey,
  rememberCheckout,
  resetExpiredCheckoutState,
  resolveRestoreAttemptId,
  syncUrlParams,
} from './billing-workspace.helpers.js';
import { useAvailableBookings, useWorkspaceSync } from './billing-workspace-sync.js';

export {
  type Authorize,
  type CheckoutIntent,
  completed,
  lastCheckoutKey,
  rememberCheckout,
};

export function useBillingWorkspace({
  accountId,
  gateway,
  intents: provided,
  onBookingChange,
  embedded,
  authorize,
  initialProposal,
}: {
  accountId: string;
  gateway: CoupleBillingGateway;
  intents?: ReturnType<typeof createBillingIntents> | undefined;
  onBookingChange?: ((bookingId: string) => void) | undefined;
  embedded: boolean;
  authorize: Authorize;
  initialProposal?: Proposal | null | undefined;
}) {
  const [intents] = useState(() => provided ?? createBillingIntents(accountId));
  const contextSeed = useRef<Proposal | undefined>(initialProposal ?? undefined);
  const pendingProviderRead = useRef<Proposal | undefined>(undefined);
  const [bookingId, setBookingId] = useState(() => initialProposal?.bookingId ?? '');
  const [context, setContext] = useState<BillingContext | null>(null);
  const [view, setView] = useState<BillingView | null>(null);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [checkout, setCheckout] = useState<CheckoutView | null>(null);
  const [intent, setIntent] = useState<CheckoutIntent | null>(null);
  const [retry, setRetry] = useState(false);
  const [needsAttemptStatus, setNeedsAttemptStatus] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const identifierEdited = useRef(false);
  const activeRequestIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const availableBookings = useAvailableBookings(authorize, embedded, fail);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      if (identifierEdited.current) return;
      setBookingId(params.get('bookingId') ?? '');
      setAttemptId(params.get('attemptId') ?? '');
    });
  }, []);

  function fail(caught: unknown) {
    if (denied(caught)) {
      setContext(null);
      setView(null);
      setAttempt(null);
      setCheckout(null);
      setIntent(null);
      setNeedsAttemptStatus(false);
    }
    setError(billingMessage(caught));
  }

  const drainProviderRead = () => {
    const next = pendingProviderRead.current;
    pendingProviderRead.current = undefined;
    if (next) {
      contextSeed.current = next;
      setBookingId(next.bookingId);
      void run(() => load(next.bookingId));
    }
  };

  const run = async (operation: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await operation();
    } catch (caught) {
      fail(caught);
    } finally {
      busy.current = false;
      setPending(false);
      drainProviderRead();
    }
  };

  const displayAttempt = async (id: string, restored: AttemptView) => {
    applyAttemptDisplayState({
      id,
      restored,
      setAttempt,
      setAttemptId,
      setNeedsAttemptStatus,
      setIntent,
      setRetry,
      setCheckout,
    });
    if (completed(restored))
      await intents.completeCheckout(`checkout:${id}`, restored.paymentAttemptId);
  };

  const load = async (id: string) => {
    const requestId = id + ':' + Date.now();
    activeRequestIdRef.current = requestId;
    setNeedsAttemptStatus(true);
    const seed = contextSeed.current;
    contextSeed.current = undefined;
    const value = await authorize((token) => gateway.loadContext(token, id, seed));
    if (activeRequestIdRef.current !== requestId) return;
    if (value.bookingId !== id) throw new Error('Booking mismatch');
    const hideBalanceAttempt =
      value.accessLevel !== 'FULL' &&
      (attempt?.purpose === 'BALANCE' || (checkout !== null && context?.accessLevel === 'FULL'));
    if (value.accessLevel !== 'FULL') {
      setView(null);
      if (hideBalanceAttempt) {
        setAttempt(null);
        setAttemptId('');
        setCheckout(null);
      }
    }
    const saved = await intents.pending(`checkout:${id}`);
    const savedAllowed = saved?.timelineRevisionId !== undefined || value.accessLevel === 'FULL';
    const active = await authorize((token) => gateway.loadActiveAttempts(token, id));
    if (activeRequestIdRef.current !== requestId) return;
    const discovered = active.find(
      (item) => value.accessLevel === 'FULL' || item.purpose === 'DEPOSIT',
    );
    const isSameBooking =
      context?.bookingId === id ||
      new URLSearchParams(window.location.search).get('bookingId') === id;
    const restoreAttemptId = resolveRestoreAttemptId(
      discovered,
      savedAllowed,
      saved?.checkoutAttemptId,
      hideBalanceAttempt,
      isSameBooking,
      attemptId,
    );
    const result =
      value.accessLevel === 'FULL' ? await authorize((token) => gateway.load(token, id)) : null;
    if (activeRequestIdRef.current !== requestId) return;
    if (result !== null && result.bookingId !== id) throw new Error('Billing mismatch');
    setContext(value);
    setView(result);
    setBookingId(id);
    syncUrlParams(id);
    onBookingChange?.(id);
    const recoveryIntent = buildRecoveryIntent(saved, value.accessLevel);
    setIntent(recoveryIntent);
    setRetry(recoveryIntent !== null);
    if (restoreAttemptId !== '') {
      setAttemptId(restoreAttemptId);
      setIntent(null);
      setRetry(false);
      const restored = await executeFetchRestoredAttempt({
        gateway,
        authorize,
        id,
        restoreAttemptId,
        discovered,
        accessLevel: value.accessLevel,
      });
      if (activeRequestIdRef.current !== requestId) return;
      await intents.rememberAttempt(`checkout:${id}`, restoreAttemptId);
      await displayAttempt(id, restored);
      if (
        discovered === undefined &&
        recoveryIntent !== null &&
        restored.checkoutUrl === undefined &&
        restored.status !== 'SUCCEEDED' &&
        restored.status !== 'FAILED' &&
        Date.parse(restored.expiresAt) > Date.now()
      ) {
        setIntent(recoveryIntent);
        setRetry(true);
      }
      if (completed(restored)) {
        setNeedsAttemptStatus(true);
        const refreshed = await executeRefreshCompletedAttempt({ gateway, authorize, id });
        if (activeRequestIdRef.current !== requestId) return;
        setContext(refreshed.context);
        setView(refreshed.view);
        setNeedsAttemptStatus(false);
      }
    } else setNeedsAttemptStatus(false);
  };

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

  const start = async () => {
    if (
      busy.current ||
      context === null ||
      intent === null ||
      context.bookingId !== bookingId.trim()
    )
      return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const value = await executeStartCheckout({
        context,
        intent,
        gateway,
        intents,
        authorize,
      });
      setCheckout(value);
      rememberCheckout(context.bookingId, value.paymentAttemptId);
      setAttemptId(value.paymentAttemptId);
      setAttempt(null);
      setIntent(null);
      setRetry(false);
      const query = new URLSearchParams({
        bookingId: context.bookingId,
        attemptId: value.paymentAttemptId,
      });
      window.history.replaceState({}, '', `/khong-gian/thanh-toan?${query.toString()}`);
    } catch (caught) {
      fail(caught);
      const unknown = unresolved(caught);
      setRetry(unknown);
      if (!unknown) setIntent(null);
      if (caught instanceof ApiClientError && caught.code === 'PAYMENT_ATTEMPT_ACTIVE') {
        await load(context.bookingId).catch(fail);
      } else if (intent.kind === 'balance' && !unknown && !denied(caught))
        void load(context.bookingId).catch(() => undefined);
    } finally {
      busy.current = false;
      setPending(false);
      drainProviderRead();
    }
  };

  const gate =
    view === null ? null : balanceGate(view.balancePaymentEligibility, view.billingRevision);

  useWorkspaceSync({
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
  });

  const { restaurant } = useSpaceExtras();
  const isCheckoutActive =
    checkout !== null &&
    (Number.isNaN(Date.parse(checkout.expiresAt)) || Date.parse(checkout.expiresAt) > Date.now());
  const inFlight = attempt !== null && !completed(attempt);
  const blocked = pending || intent !== null || isCheckoutActive || inFlight || needsAttemptStatus;

  const handleResetExpired = () =>
    resetExpiredCheckoutState({
      checkout,
      setCheckout,
      setAttempt,
      setAttemptId,
      setIntent,
      setRetry,
      context,
      intents,
      run,
      load,
    });

  return {
    bookingId,
    setBookingId,
    context,
    setContext,
    view,
    setView,
    attempt,
    setAttempt,
    attemptId,
    setAttemptId,
    checkout,
    setCheckout,
    intent,
    setIntent,
    retry,
    setRetry,
    pending,
    error,
    setError,
    availableBookings,
    blocked,
    isCheckoutActive,
    inFlight,
    gate,
    restaurant,
    identifierEdited,
    setNeedsAttemptStatus,
    run,
    load,
    start,
    displayAttempt,
    handleResetExpired,
  };
}
