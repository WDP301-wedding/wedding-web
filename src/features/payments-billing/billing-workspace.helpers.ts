'use client';

import { createExperienceGateway } from '../identity-access/experience-api';
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
  | Readonly<{ kind: 'deposit'; body: DepositBody; amountVnd: number | null }>
  | Readonly<{ kind: 'balance'; body: BalanceBody; amountVnd: number | null }>;

export const lastCheckoutKey = 'wedding.lastCheckout';

export function rememberCheckout(bookingId: string, attemptId: string) {
  try {
    const payload = JSON.stringify({ bookingId, attemptId });
    localStorage.setItem(lastCheckoutKey, payload);
    localStorage.setItem(`${lastCheckoutKey}.${attemptId}`, payload);
  } catch {
    // Trình duyệt chặn storage: người dùng vẫn mở được trạng thái từ trang Thanh toán.
  }
}

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
        ...(saved.documentDigest === undefined
          ? {}
          : { documentDigest: saved.documentDigest }),
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

export async function loadAvailableBookings(authorize: Authorize): Promise<
  readonly { bookingId: string; label: string }[]
> {
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

export async function executeStartCheckout({
  context,
  intent,
  gateway,
  intents,
  authorize,
}: {
  context: BillingContext;
  intent: CheckoutIntent;
  gateway: CoupleBillingGateway;
  intents: ReturnType<typeof createBillingIntents>;
  authorize: Authorize;
}): Promise<CheckoutView> {
  return intents.run(
    `checkout:${context.bookingId}`,
    intent.body,
    (key, stableBody) =>
      authorize((token) =>
        intent.kind === 'deposit'
          ? gateway.startDeposit(token, context.bookingId, stableBody as DepositBody, key)
          : gateway.startBalance(token, context.bookingId, stableBody as BalanceBody, key),
      ),
    true,
  );
}

export function resetExpiredCheckoutState({
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
}: {
  checkout: CheckoutView | null;
  setCheckout: (v: CheckoutView | null) => void;
  setAttempt: (v: AttemptView | null) => void;
  setAttemptId: (v: string) => void;
  setIntent: (v: CheckoutIntent | null) => void;
  setRetry: (v: boolean) => void;
  context: BillingContext | null;
  intents: ReturnType<typeof createBillingIntents>;
  run: (op: () => Promise<void>) => Promise<void>;
  load: (id: string) => Promise<void>;
}) {
  if (!checkout) return;
  const currentAttemptId = checkout.paymentAttemptId;
  setCheckout(null);
  setAttempt(null);
  setAttemptId('');
  setIntent(null);
  setRetry(false);
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.delete('attemptId');
    window.history.replaceState({}, '', url.toString());
  }
  if (context?.bookingId) {
    void intents.completeCheckout(`checkout:${context.bookingId}`, currentAttemptId);
    void run(() => load(context.bookingId));
  }
}
