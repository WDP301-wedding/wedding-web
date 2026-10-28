'use client';

import type {
  AttemptView,
  BalanceBody,
  BillingContext,
  CheckoutView,
  CoupleBillingGateway,
  DepositBody,
} from './billing-api';
import type { createBillingIntents } from './billing-intents';
import type { Authorize, CheckoutIntent } from './billing-workspace.helpers';

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

export function applyStartedCheckout({
  value,
  bookingId,
  setCheckout,
  setAttemptId,
  setAttempt,
  setIntent,
  setRetry,
}: {
  value: CheckoutView;
  bookingId: string;
  setCheckout: (v: CheckoutView | null) => void;
  setAttemptId: (v: string) => void;
  setAttempt: (v: AttemptView | null) => void;
  setIntent: (v: CheckoutIntent | null) => void;
  setRetry: (v: boolean) => void;
}) {
  setCheckout(value);
  rememberCheckout(bookingId, value.paymentAttemptId);
  setAttemptId(value.paymentAttemptId);
  setAttempt(null);
  setIntent(null);
  setRetry(false);
  if (typeof window !== 'undefined') {
    const query = new URLSearchParams({
      bookingId,
      attemptId: value.paymentAttemptId,
    });
    window.history.replaceState({}, '', `/khong-gian/thanh-toan?${query.toString()}`);
  }
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
