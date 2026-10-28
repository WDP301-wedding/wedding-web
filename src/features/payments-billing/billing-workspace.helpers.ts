'use client';

import { createExperienceGateway } from '../identity-access/experience-api';
import type { Proposal } from '../couple-workspace/use-couple-workspace';
import type {
  AttemptView,
  BalanceBody,
  BillingContext,
  BillingView,
  CheckoutView,
  CoupleBillingGateway,
  DepositBody,
} from './billing-api';
import type { createBillingIntents } from './billing-intents';

export type Authorize = <T>(operation: (token: string) => Promise<T>) => Promise<T>;

export type CheckoutIntent =
  | Readonly<{
      kind: 'deposit';
      body: DepositBody;
      amountVnd: number | null;
      displayContext?: BillingContext;
    }>
  | Readonly<{ kind: 'balance'; body: BalanceBody; amountVnd: number | null }>;

import {
  lastCheckoutKey,
  rememberCheckout,
  executeStartCheckout,
  applyStartedCheckout,
  resetExpiredCheckoutState,
} from './billing-checkout.helpers';

export {
  lastCheckoutKey,
  rememberCheckout,
  executeStartCheckout,
  applyStartedCheckout,
  resetExpiredCheckoutState,
};

export const completed = (value: AttemptView) =>
  value.status === 'FAILED' ||
  (value.status === 'SUCCEEDED' && value.applicationStatus === 'SUCCEEDED');

export function syncUrlParams(bookingId: string, attemptId?: string) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('bookingId', bookingId);
  if (attemptId) url.searchParams.set('attemptId', attemptId);
  window.history.replaceState({}, '', url.toString());
}

export function buildRecoveryIntent(
  saved: {
    timelineRevisionId?: string | undefined;
    contractRevisionId?: string | undefined;
    documentDigest?: string | undefined;
    expectedBillingRevision?: number | undefined;
  } | null,
  accessLevel: 'RESTRICTED' | 'FULL',
): CheckoutIntent | null {
  if (saved?.timelineRevisionId !== undefined) {
    return {
      kind: 'deposit',
      body: {
        timelineRevisionId: saved.timelineRevisionId,
        ...(saved.contractRevisionId === undefined
          ? {}
          : { contractRevisionId: saved.contractRevisionId }),
        ...(saved.documentDigest === undefined ? {} : { documentDigest: saved.documentDigest }),
      },
      amountVnd: null,
    };
  }
  if (saved?.expectedBillingRevision !== undefined && accessLevel === 'FULL') {
    return {
      kind: 'balance',
      body: { expectedBillingRevision: saved.expectedBillingRevision },
      amountVnd: null,
    };
  }
  return null;
}

export function resolveRestoreAttemptId(
  discovered: AttemptView | undefined,
  savedAllowed: boolean,
  savedCheckoutAttemptId: string | undefined,
  hideBalanceAttempt: boolean,
  isSameBooking: boolean,
  currentAttemptId: string,
): string {
  if (discovered !== undefined) return discovered.paymentAttemptId;
  if (savedAllowed && savedCheckoutAttemptId !== undefined) return savedCheckoutAttemptId;
  if (!hideBalanceAttempt && isSameBooking) return currentAttemptId.trim();
  return '';
}

export function resolveCheckoutFromAttempt(
  restored: AttemptView,
  previousCheckout: CheckoutView | null,
): CheckoutView | null {
  if (restored.status === 'FAILED' || restored.status === 'SUCCEEDED') return null;
  if (restored.checkoutUrl) {
    return {
      paymentAttemptId: restored.paymentAttemptId,
      status: restored.status,
      checkoutUrl: restored.checkoutUrl,
      expiresAt: restored.expiresAt,
    };
  }
  return previousCheckout?.paymentAttemptId === restored.paymentAttemptId ? previousCheckout : null;
}

export function applyAttemptDisplayState({
  id,
  restored,
  setAttempt,
  setAttemptId,
  setNeedsAttemptStatus,
  setIntent,
  setRetry,
  setCheckout,
}: {
  id: string;
  restored: AttemptView;
  setAttempt: (v: AttemptView | null) => void;
  setAttemptId: (v: string) => void;
  setNeedsAttemptStatus: (v: boolean) => void;
  setIntent: (v: CheckoutIntent | null) => void;
  setRetry: (v: boolean) => void;
  setCheckout: (updater: (prev: CheckoutView | null) => CheckoutView | null) => void;
}) {
  setAttempt(restored);
  setAttemptId(restored.paymentAttemptId);
  setNeedsAttemptStatus(false);
  setIntent(null);
  setRetry(false);
  setCheckout((previous) => resolveCheckoutFromAttempt(restored, previous));
  rememberCheckout(id, restored.paymentAttemptId);
  syncUrlParams(id, restored.paymentAttemptId);
}

export async function executeFetchRestoredAttempt({
  gateway,
  authorize,
  id,
  restoreAttemptId,
  discovered,
  accessLevel,
}: {
  gateway: CoupleBillingGateway;
  authorize: Authorize;
  id: string;
  restoreAttemptId: string;
  discovered: AttemptView | undefined;
  accessLevel: 'RESTRICTED' | 'FULL';
}): Promise<AttemptView> {
  const restored = await authorize((token) =>
    discovered !== undefined && Date.parse(discovered.expiresAt) > Date.now()
      ? gateway.loadAttempt(token, id, restoreAttemptId, true)
      : gateway.loadAttempt(token, id, restoreAttemptId),
  );
  if (
    restored.paymentAttemptId !== restoreAttemptId ||
    (accessLevel !== 'FULL' && restored.purpose !== 'DEPOSIT')
  ) {
    throw new Error('Attempt mismatch');
  }
  return restored;
}

export async function executeRefreshCompletedAttempt({
  gateway,
  authorize,
  id,
}: {
  gateway: CoupleBillingGateway;
  authorize: Authorize;
  id: string;
}): Promise<{ context: BillingContext; view: BillingView | null }> {
  const refreshed = await authorize((token) => gateway.loadContext(token, id));
  const refreshedView =
    refreshed.accessLevel === 'FULL' ? await authorize((token) => gateway.load(token, id)) : null;
  if (refreshed.bookingId !== id || (refreshedView !== null && refreshedView.bookingId !== id)) {
    throw new Error('Booking mismatch');
  }
  return { context: refreshed, view: refreshedView };
}

export async function loadAvailableBookings(
  authorize: Authorize,
): Promise<readonly { bookingId: string; label: string }[]> {
  const expGateway = createExperienceGateway();
  const overview = await authorize((token) => expGateway.overview(token));
  if (!overview?.data) return [];
  return overview.data.map((item) => {
    const [y, m, d] = item.eventDate.split('-');
    const eventDateFormatted = y && m && d ? `${d}/${m}/${y}` : item.eventDate;
    return {
      bookingId: item.bookingId,
      label: `${item.hallName} · ${eventDateFormatted} · ${item.shiftCode === 'LUNCH' ? 'Trưa' : 'Tối'}`,
    };
  });
}

export async function executeLoadBilling({
  id,
  contextSeed,
  gateway,
  authorize,
  intents,
  currentContext,
  currentAttempt,
  currentCheckout,
  attemptId,
}: {
  id: string;
  contextSeed: Proposal | undefined;
  gateway: CoupleBillingGateway;
  authorize: Authorize;
  intents: ReturnType<typeof createBillingIntents>;
  currentContext: BillingContext | null;
  currentAttempt: AttemptView | null;
  currentCheckout: CheckoutView | null;
  attemptId: string;
}) {
  const value = await authorize((token) => gateway.loadContext(token, id, contextSeed));
  if (value.bookingId !== id) throw new Error('Booking mismatch');

  const hideBalanceAttempt =
    value.accessLevel !== 'FULL' &&
    (currentAttempt?.purpose === 'BALANCE' ||
      (currentCheckout !== null && currentContext?.accessLevel === 'FULL'));

  const saved = await intents.pending(`checkout:${id}`);
  const savedAllowed = saved?.timelineRevisionId !== undefined || value.accessLevel === 'FULL';
  const active = await authorize((token) => gateway.loadActiveAttempts(token, id));

  const discovered = active.find(
    (item) => value.accessLevel === 'FULL' || item.purpose === 'DEPOSIT',
  );
  const isSameBooking =
    currentContext?.bookingId === id ||
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('bookingId') === id);

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
  if (result !== null && result.bookingId !== id) throw new Error('Billing mismatch');

  const recoveryIntent = buildRecoveryIntent(saved, value.accessLevel);

  return {
    value,
    result,
    hideBalanceAttempt,
    restoreAttemptId,
    discovered,
    recoveryIntent,
  };
}
