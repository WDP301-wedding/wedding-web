'use client';
import { InlineError } from '../../design-system/inline-error';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';

import Link from 'next/link';
import { useContext, useEffect, useEffectEvent, useRef, useState } from 'react';
import { type WebIdentitySession, type WebSessionSnapshot } from '../identity-access/session';
import { browserSession } from '../identity-access/browser-session';
import { createExperienceGateway } from '../identity-access/experience-api';
import { ApiClientError } from '../../lib/api/client';
import {
  createCoupleBillingGateway,
  type AttemptView,
  type BillingContext,
  type BillingView,
  type CheckoutView,
  type CoupleBillingGateway,
  type DepositBody,
  type BalanceBody,
} from './billing-api';
import { createBillingIntents } from './billing-intents';
import { balanceGate } from './balance-eligibility';
import { CheckoutLinkPanel } from './checkout-link';
import { useSpaceExtras } from '../couple-workspace/space-provider';
import { CoupleWorkspaceContext, type Proposal } from '../couple-workspace/use-couple-workspace';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import {
  AttemptStatus,
  BillingHistory,
  BillingSummary,
  billingMessage,
  denied,
  money,
  unresolved,
} from './billing-display';
import { BrandMark } from '../../design-system/brand-mark';
import { Celebrate } from '../../design-system/celebrate';

type Authorize = <T>(operation: (token: string) => Promise<T>) => Promise<T>;
type CheckoutIntent =
  | Readonly<{ kind: 'deposit'; body: DepositBody; amountVnd: number | null }>
  | Readonly<{ kind: 'balance'; body: BalanceBody; amountVnd: number | null }>;
// Dùng chung một phiên cho cả ứng dụng: nhiều instance sẽ làm mới cookie refresh (bị xoay vòng)
// nhiều lần không cần thiết và có thể làm backend thu hồi phiên.
const identity = browserSession;
const billing = createCoupleBillingGateway();
/**
 * Ghi nhớ giao dịch vừa tạo để trang `/khong-gian/thanh-toan/ket-qua` (VNPay chuyển về, thường ở tab mới)
 * biết phải kiểm tra giao dịch nào. Chỉ lưu mã booking và mã giao dịch, không lưu dữ liệu nhạy cảm.
 */
export const lastCheckoutKey = 'wedding.lastCheckout';
function rememberCheckout(bookingId: string, attemptId: string) {
  try {
    const payload = JSON.stringify({ bookingId, attemptId });
    localStorage.setItem(lastCheckoutKey, payload);
    localStorage.setItem(`${lastCheckoutKey}.${attemptId}`, payload);
  } catch {
    // Trình duyệt chặn storage: người dùng vẫn mở được trạng thái từ trang Thanh toán.
  }
}
const completed = (value: AttemptView) =>
  value.status === 'FAILED' ||
  (value.status === 'SUCCEEDED' && value.applicationStatus === 'SUCCEEDED');
export function CoupleBillingPage({
  session = identity,
  gateway = billing,
  onBookingChange,
  embedded = false,
}: Readonly<{
  session?: WebIdentitySession;
  gateway?: CoupleBillingGateway;
  onBookingChange?: ((bookingId: string) => void) | undefined;
  /**
   * true trong Không gian cưới v2: tiệc đã được chọn sẵn (`?bookingId` do lớp cache ghi) nên
   * tự mở ngay, KHÔNG hiện ô nhập mã hồ sơ / ô chọn tiệc (đổi tiệc ở thanh trên của khung).
   */
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
  intents: provided,
  onBookingChange,
  embedded = false,
  initialProposal,
}: Readonly<{
  accountId: string;
  initialProposal?: Proposal | undefined;
  authorize: Authorize;
  gateway: CoupleBillingGateway;
  intents?: ReturnType<typeof createBillingIntents>;
  onBookingChange?: ((bookingId: string) => void) | undefined;
  embedded?: boolean;
}>) {
  const [intents] = useState(() => provided ?? createBillingIntents(accountId));
  const contextSeed = useRef(initialProposal);
  const pendingProviderRead = useRef<Proposal | undefined>(undefined);
  const previousProviderProposal = useRef(initialProposal);
  const [bookingId, setBookingId] = useState('');
  const [context, setContext] = useState<BillingContext | null>(null);
  const [view, setView] = useState<BillingView | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [checkout, setCheckout] = useState<CheckoutView | null>(null);
  const [intent, setIntent] = useState<CheckoutIntent | null>(null);
  const [retry, setRetry] = useState(false);
  const [needsAttemptStatus, setNeedsAttemptStatus] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const identifierEdited = useRef(false);
  const activeRequestIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableBookings, setAvailableBookings] = useState<
    readonly { bookingId: string; label: string }[]
  >([]);

  useEffect(() => {
    // Trong khung v2 không cần danh sách tiệc (không còn ô chọn tiệc ở trang này).
    if (embedded) return;
    let active = true;
    const expGateway = createExperienceGateway();
    void authorize((token) => expGateway.overview(token))
      .then((overview) => {
        if (!active || !overview?.data) return;
        const mapped = overview.data.map((item) => {
          const [y, m, d] = item.eventDate.split('-');
          const eventDateFormatted = y && m && d ? `${d}/${m}/${y}` : item.eventDate;
          return {
            bookingId: item.bookingId,
            label: `${item.hallName} · ${eventDateFormatted} · ${item.shiftCode === 'LUNCH' ? 'Trưa' : 'Tối'}`,
          };
        });
        setAvailableBookings(mapped);
      })
      .catch((caught: unknown) => {
        if (active) fail(caught);
      });
    return () => {
      active = false;
    };
  }, [authorize, embedded]);

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
    setAttempt(restored);
    setAttemptId(restored.paymentAttemptId);
    setNeedsAttemptStatus(false);
    setIntent(null);
    setRetry(false);
    setCheckout((previous) =>
      restored.status === 'FAILED' || restored.status === 'SUCCEEDED'
        ? null
        : restored.checkoutUrl
          ? {
              paymentAttemptId: restored.paymentAttemptId,
              status: restored.status,
              checkoutUrl: restored.checkoutUrl,
              expiresAt: restored.expiresAt,
            }
          : previous?.paymentAttemptId === restored.paymentAttemptId
            ? previous
            : null,
    );
    rememberCheckout(id, restored.paymentAttemptId);
    const url = new URL(window.location.href);
    url.searchParams.set('bookingId', id);
    url.searchParams.set('attemptId', restored.paymentAttemptId);
    window.history.replaceState({}, '', url.toString());
    if (completed(restored))
      await intents.completeCheckout(`checkout:${id}`, restored.paymentAttemptId);
  };
  const load = async (id: string) => {
    const requestId = id + ':' + Date.now();
    activeRequestIdRef.current = requestId;
    // A failed discovery must not leave a previously enabled payment button usable.
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
    const restoreAttemptId =
      discovered !== undefined
        ? discovered.paymentAttemptId
        : savedAllowed && saved?.checkoutAttemptId !== undefined
          ? saved.checkoutAttemptId
          : !hideBalanceAttempt &&
              (context?.bookingId === id ||
                new URLSearchParams(window.location.search).get('bookingId') === id)
            ? attemptId.trim()
            : '';
    const result =
      value.accessLevel === 'FULL' ? await authorize((token) => gateway.load(token, id)) : null;
    if (activeRequestIdRef.current !== requestId) return;
    if (result !== null && result.bookingId !== id) throw new Error('Billing mismatch');
    setContext(value);
    setView(result);
    setBookingId(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('bookingId', id);
      window.history.replaceState({}, '', url.toString());
    }
    onBookingChange?.(id);
    const recoveryIntent: CheckoutIntent | null =
      saved?.timelineRevisionId !== undefined
        ? {
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
          }
        : saved?.expectedBillingRevision !== undefined && value.accessLevel === 'FULL'
          ? {
              kind: 'balance',
              body: { expectedBillingRevision: saved.expectedBillingRevision },
              amountVnd: null,
            }
          : null;
    setIntent(recoveryIntent);
    setRetry(recoveryIntent !== null);
    if (restoreAttemptId !== '') {
      setAttemptId(restoreAttemptId);
      setIntent(null);
      setRetry(false);
      const restored = await authorize((token) =>
        discovered !== undefined && Date.parse(discovered.expiresAt) > Date.now()
          ? gateway.loadAttempt(token, id, restoreAttemptId, true)
          : gateway.loadAttempt(token, id, restoreAttemptId),
      );
      if (activeRequestIdRef.current !== requestId) return;
      if (
        restored.paymentAttemptId !== restoreAttemptId ||
        (value.accessLevel !== 'FULL' && restored.purpose !== 'DEPOSIT')
      )
        throw new Error('Attempt mismatch');
      // The server's active attempt wins; with no active attempt an authorized
      // route lookup can also finish a lost-response journal already made terminal.
      await intents.rememberAttempt(`checkout:${id}`, restoreAttemptId);
      await displayAttempt(id, restored);
      // Older status responses can omit checkoutUrl. Replaying the saved command
      // uses its original key/body and cannot create a second payment intent.
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
        const refreshed = await authorize((token) => gateway.loadContext(token, id));
        const refreshedView =
          refreshed.accessLevel === 'FULL'
            ? await authorize((token) => gateway.load(token, id))
            : null;
        if (activeRequestIdRef.current !== requestId) return;
        if (
          refreshed.bookingId !== id ||
          (refreshedView !== null && refreshedView.bookingId !== id)
        )
          throw new Error('Booking mismatch');
        setContext(refreshed);
        setView(refreshedView);
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
      const value = await intents.run(
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
        // A different tab/device may have created the checkout after our initial read.
        // Discover that attempt rather than retrying POST with another key.
        await load(context.bookingId).catch(fail);
      }
      // Backend từ chối hẳn (vd. 409: chưa chốt hoá đơn, đang có giao dịch, công nợ đổi):
      // tải lại billing MỘT lần để nút và lời nhắc hiện đúng điều kiện mới. Không tự thử lại POST.
      else if (intent.kind === 'balance' && !unknown && !denied(caught))
        void load(context.bookingId).catch(() => undefined);
    } finally {
      busy.current = false;
      setPending(false);
      drainProviderRead();
    }
  };
  /*
   * Tự mở thanh toán trong khung v2. `useEffectEvent` (React 19.2): hàm bên trong luôn đọc
   * state mới nhất (bookingId, attemptId từ URL) nhưng KHÔNG phải khai báo làm dependency,
   * nên effect chỉ chạy khi bookingId thay đổi chứ không chạy lại mỗi lần render.
   */
  const autoOpened = useRef(false);
  const openFromUrl = useEffectEvent((id: string) => {
    void run(() => load(id));
  });
  useEffect(() => {
    if (!embedded || autoOpened.current || bookingId === '') return;
    autoOpened.current = true;
    openFromUrl(bookingId);
  }, [embedded, bookingId]);
  /*
   * Điều kiện thanh toán phần còn lại do backend quyết định (PR #76). Khi backend báo dữ liệu cũ
   * (STALE_BILLING_REVISION) hoặc chưa có trường điều kiện, tự tải lại ĐÚNG MỘT LẦN cho mỗi
   * revision — `autoRefreshedFor` chặn vòng lặp tải lại vô hạn nếu backend vẫn trả cùng kết quả.
   */
  const gate =
    view === null ? null : balanceGate(view.balancePaymentEligibility, view.billingRevision);
  const autoRefreshedFor = useRef<number | null>(null);
  const refreshBilling = useEffectEvent(() => {
    if (context !== null) void run(() => load(context.bookingId));
  });
  // The provider is the only realtime owner of proposal in the embedded workspace.
  // Billing consumes its completed read, while financial commands keep their pending guard.
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
  const { restaurant } = useSpaceExtras();
  const isCheckoutActive =
    checkout !== null &&
    (Number.isNaN(Date.parse(checkout.expiresAt)) || Date.parse(checkout.expiresAt) > Date.now());
  const inFlight = attempt !== null && !completed(attempt);
  const blocked = pending || intent !== null || isCheckoutActive || inFlight || needsAttemptStatus;
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
                  identifierEdited.current = true;
                  setBookingId(selectedId);
                  setContext(null);
                  setView(null);
                  setAttempt(null);
                  setAttemptId('');
                  setCheckout(null);
                  setNeedsAttemptStatus(false);
                  setRetry(false);
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
            setAttempt(null);
            setCheckout(null);
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
                identifierEdited.current = true;
                setBookingId(event.target.value);
                setContext(null);
                setView(null);
                setAttempt(null);
                setAttemptId('');
                setCheckout(null);
                setNeedsAttemptStatus(false);
                setRetry(false);
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
          <section className="billing-deposit">
            <h2>{context.contract ? 'Khoản cọc theo hợp đồng' : 'Khoản cọc theo đề xuất'}</h2>
            <strong>{money(context.depositAmountVnd)}</strong>
            <p>
              {context.contract
                ? 'Bằng 30% tổng hợp đồng đã được hai bên duyệt (làm tròn lên). Số tiền thực thu do hệ thống kiểm tra lại khi tạo giao dịch.'
                : 'Đây là số tiền từ đề xuất của nhà hàng. Điều kiện và số tiền thực thu được kiểm tra lại khi tạo giao dịch.'}
            </p>
            {context.accessLevel === 'RESTRICTED' && (
              <p>
                Quyền tư vấn chỉ hiển thị khoản cọc và trạng thái cọc; số dư đầy đủ mở sau khi hồ sơ
                được xác nhận.
              </p>
            )}
            {context.phase === 'DRAFT' || context.phase === 'AWAITING_DEPOSIT' ? (
              isCheckoutActive || inFlight ? (
                <p>Giao dịch đang được xác minh. Kiểm tra trạng thái trước khi tiếp tục.</p>
              ) : (
                <button
                  disabled={
                    blocked || context.timelineRevisionId === null || context.contractRequired
                  }
                  onClick={() => {
                    if (context.timelineRevisionId === null || context.contractRequired) return;
                    if (checkout !== null && !isCheckoutActive) {
                      setCheckout(null);
                      setAttempt(null);
                      setAttemptId('');
                    }
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
                >
                  Đặt cọc qua VNPay
                </button>
              )
            ) : (
              <p>Hồ sơ đã qua bước đặt cọc hoặc không còn nhận cọc.</p>
            )}
            {context.timelineRevisionId === null && (
              <p>Cần có kịch bản được nhà hàng và hai bạn duyệt trước khi đặt cọc.</p>
            )}
            {context.contractRequired && (
              <p>
                Cần hợp đồng được cả hai bên duyệt trước khi đặt cọc.{' '}
                <Link href={`/khong-gian/thoa-thuan/hop-dong?bookingId=${context.bookingId}`}>
                  Mở hợp đồng →
                </Link>
              </p>
            )}
          </section>
          {view !== null && (
            <>
              <BillingSummary view={view} />
              <div className="billing-balance-action">
                <button
                  disabled={blocked || gate === null || !gate.allowed}
                  onClick={() => {
                    // Chặn lần nữa ở đây: nút có thể còn hiện trong lúc trạng thái vừa đổi.
                    if (gate === null || !gate.allowed) return;
                    setIntent({
                      kind: 'balance',
                      // Lấy revision của trang billing hiện tại (hand-off mục 4).
                      body: { expectedBillingRevision: view.billingRevision },
                      amountVnd: view.totals.outstandingVnd,
                    });
                  }}
                >
                  Thanh toán còn lại
                </button>
                {gate !== null && !gate.allowed ? (
                  <div className="billing-gate" role="status">
                    <p>{gate.message}</p>
                    {gate.action === 'refresh' ? (
                      <button
                        type="button"
                        className="billing-secondary"
                        disabled={pending}
                        onClick={() => void run(() => load(context.bookingId))}
                      >
                        Tải lại công nợ
                      </button>
                    ) : null}
                    {gate.action === 'check-payment' && attemptId !== '' ? (
                      <a className="billing-secondary" href="#billing-attempt-status">
                        Kiểm tra giao dịch đang xử lý
                      </a>
                    ) : null}
                    {gate.action === 'contact' && restaurant?.publicPhone ? (
                      <a
                        className="billing-secondary"
                        href={`tel:${restaurant.publicPhone.replace(/[^+\d]/gu, '')}`}
                      >
                        Gọi nhà hàng {restaurant.publicPhone}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <BillingHistory view={view} />
              {view.nextCursor !== null && (
                <button
                  className="billing-secondary"
                  disabled={pending}
                  onClick={() => {
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
                >
                  Tải thêm lịch sử
                </button>
              )}
            </>
          )}
          {intent !== null && (
            <section className="billing-confirm" aria-label="Xác nhận thanh toán">
              <h2>{intent.kind === 'deposit' ? 'Kiểm tra khoản cọc' : 'Kiểm tra khoản còn lại'}</h2>
              {intent.amountVnd === null ? (
                <p>
                  Khôi phục yêu cầu trước. Kiểm tra số tiền của giao dịch qua trạng thái đã xác
                  minh.
                </p>
              ) : (
                <strong>{money(intent.amountVnd)}</strong>
              )}
              <p>
                VNPay mở giao dịch do máy chủ tạo. Số tiền không được nhập hoặc sửa trên trang này.
              </p>
              <button
                disabled={pending}
                onClick={() => {
                  void start();
                }}
              >
                {retry ? 'Thử lại cùng yêu cầu' : 'Xác nhận mở VNPay'}
              </button>
              <button
                className="billing-secondary"
                disabled={pending || retry}
                onClick={() => setIntent(null)}
              >
                Quay lại
              </button>
            </section>
          )}
          {checkout !== null && (
            <CheckoutLinkPanel
              checkout={checkout}
              // Ưu tiên trạng thái vừa kiểm tra (vd. UNKNOWN); chưa kiểm tra thì dùng trạng thái lúc tạo.
              status={
                attempt?.paymentAttemptId === checkout.paymentAttemptId
                  ? attempt.status
                  : checkout.status
              }
              onResetExpired={() => {
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
              }}
            />
          )}
          {/* Trong khung v2: chỉ hiện khi đã có giao dịch (tự nhớ từ URL / lần thanh toán trước),
              không bao giờ yêu cầu người dùng gõ mã giao dịch. */}
          {embedded && attemptId === '' ? null : (
            <section className="billing-panel" id="billing-attempt-status">
              <h2>Trạng thái thanh toán</h2>
              <form
                className="billing-lookup"
                onSubmit={(event) => {
                  event.preventDefault();
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
              >
                {embedded ? (
                  <p className="billing-attempt-note">
                    Giao dịch gần nhất của hai bạn. Bấm để hỏi lại trạng thái mới nhất từ nhà hàng.{' '}
                    VNPay giới hạn mỗi lần kiểm tra cách nhau khoảng 5 phút. Nếu kết quả chưa rõ,
                    hãy chờ rồi kiểm tra lại giao dịch này.
                  </p>
                ) : (
                  <label>
                    Mã giao dịch thanh toán
                    <input
                      required
                      value={attemptId}
                      disabled={pending || intent !== null}
                      readOnly={checkout !== null || (intent !== null && attemptId !== '')}
                      onChange={(event) => setAttemptId(event.target.value)}
                    />
                  </label>
                )}
                <button disabled={pending || intent !== null}>Kiểm tra trạng thái</button>
              </form>
              {attempt !== null && <AttemptStatus attempt={attempt} />}
              {attempt?.status === 'SUCCEEDED' && attempt.applicationStatus === 'SUCCEEDED' ? (
                <Celebrate onceKey={'payment-' + attempt.paymentAttemptId} />
              ) : null}
            </section>
          )}
        </>
      )}
    </div>
  );
}
