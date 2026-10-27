'use client';

import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { InlineError } from '../../design-system/inline-error';
import { type FriendlyError, describeApiError } from '../../lib/api/api-errors';
import { BrandMark } from '../../design-system/brand-mark';
import { browserSession } from '../identity-access/browser-session';
import type { WebIdentitySession, WebSessionSnapshot } from '../identity-access/session';
import { CoupleWorkspaceContext, type Proposal } from '../couple-workspace/use-couple-workspace';
import {
  createCoupleBillingGateway,
  type CoupleBillingGateway,
} from './billing-api';
import { type createBillingIntents } from './billing-intents';
import { CheckoutLinkPanel } from './checkout-link';
import { BillingDepositSection } from './billing-deposit-section';
import { BillingBalanceSection } from './billing-balance-section';
import { BillingConfirmSection } from './billing-confirm-section';
import { BillingAttemptPanel } from './billing-attempt-panel';
import {
  type Authorize,
  completed,
  lastCheckoutKey,
  useBillingWorkspace,
} from './use-billing-workspace';

export { lastCheckoutKey };

const identity = browserSession;
const billing = createCoupleBillingGateway();

export function CoupleBillingPage({
  session = identity,
  gateway = billing,
  onBookingChange,
  embedded = false,
}: Readonly<{
  session?: WebIdentitySession;
  gateway?: CoupleBillingGateway;
  onBookingChange?: ((bookingId: string) => void) | undefined;
  embedded?: boolean;
}>) {
  const workspace = useContext(CoupleWorkspaceContext);
  const [snapshot, setSnapshot] = useState<WebSessionSnapshot | null>(null);
  const [restoreError, setRestoreError] = useState<FriendlyError | null>(null);
  const [restoreKey, setRestoreKey] = useState(0);
  useEffect(() => {
    let active = true;
    void session
      .restore()
      .then((value) => {
        if (active) {
          setSnapshot(value);
          setRestoreError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setRestoreError(describeApiError(caught));
      });
    return () => {
      active = false;
    };
  }, [session, restoreKey]);
  if (restoreError)
    return (
      <InlineError
        error={restoreError}
        onRetry={() => {
          setRestoreError(null);
          setRestoreKey((value) => value + 1);
        }}
      />
    );
  if (snapshot === null)
    return (
      <div className="billing-shell">
        <h1>Đang mở thanh toán…</h1>
        <p role="status">Đang kiểm tra phiên đăng nhập.</p>
      </div>
    );
  if (snapshot.status === 'anonymous')
    return (
      <div className="billing-shell">
        <h1>Cần đăng nhập</h1>
        <p role="alert">Đăng nhập bằng tài khoản được cấp quyền trên hồ sơ đặt tiệc.</p>
        <Link href="/dang-nhap">Về trang đăng nhập</Link>
      </div>
    );
  return (
    <CoupleBillingWorkspace
      key={snapshot.actor.accountId}
      accountId={snapshot.actor.accountId}
      authorize={(operation) => session.authorize(operation)}
      gateway={gateway}
      onBookingChange={onBookingChange}
      embedded={embedded}
      initialProposal={
        embedded && workspace?.state.status === 'ready' ? workspace.state.proposal : undefined
      }
    />
  );
}

export function CoupleBillingWorkspace({
  accountId,
  authorize,
  gateway,
  intents,
  onBookingChange,
  embedded = false,
  initialProposal,
}: Readonly<{
  accountId: string;
  initialProposal?: Proposal | undefined;
  authorize: Authorize;
  gateway: CoupleBillingGateway;
  intents?: ReturnType<typeof createBillingIntents> | undefined;
  onBookingChange?: ((bookingId: string) => void) | undefined;
  embedded?: boolean;
}>) {
  const {
    bookingId,
    setBookingId,
    context,
    setContext,
    view,
    setView,
    attempt,
    attemptId,
    setAttemptId,
    checkout,
    intent,
    setIntent,
    retry,
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
  } = useBillingWorkspace({
    accountId,
    gateway,
    intents,
    onBookingChange,
    embedded,
    authorize,
    initialProposal,
  });

  return (
    <div className="billing-shell billing-couple">
      {embedded ? null : (
        <header className="billing-header">
          <Link className="billing-wordmark" href="/" aria-label="Hỷ Yến — Trang chủ">
            <BrandMark compact />
          </Link>
          <nav aria-label="Không gian cặp đôi">
            <Link href="/khong-gian/thoa-thuan/kich-ban">Đề xuất và kịch bản</Link>
            <Link href="/khong-gian/thanh-toan" aria-current="page">
              Thanh toán
            </Link>
          </nav>
        </header>
      )}
      <section className="billing-intro">
        <h1>Thanh toán cho ngày trọng đại</h1>
        <p>Xem khoản cọc, số dư và trạng thái đã được nhà hàng xác minh.</p>

        {!embedded && availableBookings.length > 0 && (
          <div className="billing-booking-select-wrapper mb-3 text-left">
            <label htmlFor="billing-booking-select" className="block text-sm font-medium mb-1">
              Chọn hồ sơ tiệc cưới của bạn:
            </label>
            <select
              id="billing-booking-select"
              value={context?.bookingId ?? bookingId}
              disabled={blocked}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId) {
                  identifierEditedRef.current = true;
                  setBookingId(selectedId);
                  setContext(null);
                  setView(null);
                  setAttemptId('');
                  setNeedsAttemptStatus(false);
                  setError(null);
                  void run(() => load(selectedId));
                }
              }}
              className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883] bg-white text-sm"
            >
              <option value="">-- Danh sách tiệc cưới đã lưu --</option>
              {availableBookings.map((b) => (
                <option key={b.bookingId} value={b.bookingId}>
                  {b.label} (#{b.bookingId.slice(0, 8)})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>
      {embedded ? null : (
        <form
          className="billing-lookup"
          onSubmit={(event) => {
            event.preventDefault();
            setContext(null);
            setView(null);
            void run(() => load(bookingId.trim()));
          }}
        >
          <label>
            Mã hồ sơ đặt tiệc
            <input
              required
              value={bookingId}
              disabled={blocked}
              onChange={(event) => {
                if (blocked) return;
                identifierEditedRef.current = true;
                setBookingId(event.target.value);
                setContext(null);
                setView(null);
                setAttemptId('');
                setNeedsAttemptStatus(false);
                setError(null);
              }}
            />
          </label>
          <button disabled={blocked}>Mở thanh toán</button>
        </form>
      )}
      <div aria-live="polite" className="billing-live">
        {pending && <p role="status">Đang kiểm tra với máy chủ…</p>}
        {error !== null && <p role="alert">{error}</p>}
      </div>
      {context !== null && (
        <>
          <div className="billing-section-heading">
            <h2>Hồ sơ của hai bạn</h2>
            <button
              className="billing-secondary"
              disabled={pending}
              onClick={() => {
                void run(async () => {
                  await load(context.bookingId);
                });
              }}
            >
              Làm mới hồ sơ
            </button>
          </div>
          <BillingDepositSection
            context={context}
            blocked={blocked}
            isCheckoutActive={isCheckoutActive}
            inFlight={inFlight}
            onStartDeposit={() => {
              if (context.timelineRevisionId === null || context.contractRequired) return;
              setIntent({
                kind: 'deposit',
                body: {
                  timelineRevisionId: context.timelineRevisionId,
                  ...(context.contract
                    ? {
                        contractRevisionId: context.contract.revisionId,
                        documentDigest: context.contract.documentDigest,
                      }
                    : {}),
                },
                amountVnd: context.depositAmountVnd,
              });
            }}
          />
          {view !== null && (
            <BillingBalanceSection
              view={view}
              blocked={blocked}
              gate={gate}
              pending={pending}
              attemptId={attemptId}
              restaurant={restaurant}
              onStartBalance={() => {
                if (gate === null || !gate.allowed) return;
                setIntent({
                  kind: 'balance',
                  body: { expectedBillingRevision: view.billingRevision },
                  amountVnd: view.totals.outstandingVnd,
                });
              }}
              onRefreshLedger={() => void run(() => load(context.bookingId))}
              onLoadMoreHistory={() => {
                void run(async () => {
                  const value = await authorize((token) =>
                    gateway.load(token, context.bookingId, {
                      cursor: view.nextCursor!,
                      throughBillingRevision: view.billingRevision,
                    }),
                  );
                  if (
                    value.bookingId !== context.bookingId ||
                    value.billingRevision !== view.billingRevision
                  )
                    throw new Error('History mismatch');
                  setView({ ...value, history: [...view.history, ...value.history] });
                });
              }}
            />
          )}
          {intent !== null && (
            <BillingConfirmSection
              intent={intent}
              pending={pending}
              retry={retry}
              onConfirm={() => {
                void start();
              }}
              onCancel={() => setIntent(null)}
            />
          )}
          {checkout !== null && (
            <CheckoutLinkPanel
              checkout={checkout}
              status={
                attempt?.paymentAttemptId === checkout.paymentAttemptId
                  ? attempt.status
                  : checkout.status
              }
              onResetExpired={handleResetExpired}
            />
          )}
          <BillingAttemptPanel
            embedded={embedded}
            attemptId={attemptId}
            setAttemptId={setAttemptId}
            pending={pending}
            intentActive={intent !== null}
            checkoutActive={checkout !== null}
            attempt={attempt}
            onCheckStatus={() => {
              void run(async () => {
                const value = await authorize((token) =>
                  gateway.loadAttempt(token, context.bookingId, attemptId.trim()),
                );
                if (value.paymentAttemptId !== attemptId.trim())
                  throw new Error('Attempt mismatch');
                if (context.accessLevel !== 'FULL' && value.purpose !== 'DEPOSIT')
                  throw new Error('Attempt mismatch');
                await displayAttempt(context.bookingId, value);
                if (completed(value)) await load(context.bookingId);
              });
            }}
          />
        </>
      )}
    </div>
  );
}
