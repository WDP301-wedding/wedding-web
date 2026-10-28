'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { useSpaceExtras } from '../couple-workspace/space-provider';
import type { Proposal } from '../couple-workspace/use-couple-workspace';
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
  applyStartedCheckout,
  completed,
  executeFetchRestoredAttempt,
  executeLoadBilling,
  executeRefreshCompletedAttempt,
  executeStartCheckout,
  lastCheckoutKey,
  rememberCheckout,
  resetExpiredCheckoutState,
  syncUrlParams,
} from './billing-workspace.helpers';
import {
  useAvailableBookings,
  useBillingRealtimeSync,
  useWorkspaceSync,
} from './billing-workspace-sync';
import { useExpired } from './checkout-link';

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
  const contextSeedRef = useRef<Proposal | undefined>(initialProposal ?? undefined);
  const pendingProviderReadRef = useRef<Proposal | undefined>(undefined);
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
  const busyRef = useRef(false);
  const identifierEditedRef = useRef(false);
  const activeRequestIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const availableBookings = useAvailableBookings(authorize, embedded, fail);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      if (identifierEditedRef.current) return;
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
    const next = pendingProviderReadRef.current;
    pendingProviderReadRef.current = undefined;
    if (next) {
      contextSeedRef.current = next;
      setBookingId(next.bookingId);
      void run(() => load(next.bookingId));
    }
  };

  const run = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    setError(null);
    try {
      await operation();
    } catch (caught) {
      fail(caught);
    } finally {
      busyRef.current = false;
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
    const seed = contextSeedRef.current;
    contextSeedRef.current = undefined;

    const loaded = await executeLoadBilling({
      id,
      contextSeed: seed,
      gateway,
      authorize,
      intents,
      currentContext: context,
      currentAttempt: attempt,
      currentCheckout: checkout,
      attemptId,
    });
    if (activeRequestIdRef.current !== requestId) return;

    if (loaded.value.accessLevel !== 'FULL') {
      setView(null);
      if (loaded.hideBalanceAttempt) {
        setAttempt(null);
        setAttemptId('');
        setCheckout(null);
      }
    }

    setContext(loaded.value);
    setView(loaded.result);
    setBookingId(id);
    syncUrlParams(id);
    onBookingChange?.(id);
    setIntent(loaded.recoveryIntent);
    setRetry(loaded.recoveryIntent !== null);

    if (loaded.restoreAttemptId !== '') {
      setAttemptId(loaded.restoreAttemptId);
      setIntent(null);
      setRetry(false);
      const restored = await executeFetchRestoredAttempt({
        gateway,
        authorize,
        id,
        restoreAttemptId: loaded.restoreAttemptId,
        discovered: loaded.discovered,
        accessLevel: loaded.value.accessLevel,
      });
      if (activeRequestIdRef.current !== requestId) return;
      await intents.rememberAttempt(`checkout:${id}`, loaded.restoreAttemptId);
      await displayAttempt(id, restored);
      if (
        loaded.discovered === undefined &&
        loaded.recoveryIntent !== null &&
        restored.checkoutUrl === undefined &&
        restored.status !== 'SUCCEEDED' &&
        restored.status !== 'FAILED' &&
        Date.parse(restored.expiresAt) > Date.now()
      ) {
        setIntent(loaded.recoveryIntent);
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

  useBillingRealtimeSync({ bookingId, embedded, run, load });

  const start = async () => {
    if (
      busyRef.current ||
      context === null ||
      intent === null ||
      context.bookingId !== bookingId.trim()
    )
      return;
    busyRef.current = true;
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
      applyStartedCheckout({
        value,
        bookingId: context.bookingId,
        setCheckout,
        setAttemptId,
        setAttempt,
        setIntent,
        setRetry,
      });
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
      busyRef.current = false;
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
    busyRef,
    pendingProviderReadRef,
    contextSeedRef,
    setBookingId,
  });

  const { restaurant } = useSpaceExtras();
  const isCheckoutExpired = useExpired(checkout?.expiresAt);
  const isCheckoutActive = checkout !== null && !isCheckoutExpired;
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
    identifierEditedRef,
    setNeedsAttemptStatus,
    run,
    load,
    start,
    displayAttempt,
    handleResetExpired,
  };
}
