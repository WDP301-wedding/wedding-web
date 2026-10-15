'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { type WebIdentitySession, type WebSessionSnapshot } from '../identity-access/session';
import { browserSession } from '../identity-access/browser-session';
import { createExperienceGateway } from '../identity-access/experience-api';
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
 * Ghi nhớ giao dịch vừa tạo để trang `/payment-return` (VNPay chuyển về, thường ở tab mới)
 * biết phải kiểm tra giao dịch nào. Chỉ lưu mã booking và mã giao dịch, không lưu dữ liệu nhạy cảm.
 */
export const lastCheckoutKey = 'wedding.lastCheckout';
function rememberCheckout(bookingId: string, attemptId: string) {
  try {
    localStorage.setItem(lastCheckoutKey, JSON.stringify({ bookingId, attemptId }));
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
}: Readonly<{
  session?: WebIdentitySession;
  gateway?: CoupleBillingGateway;
  onBookingChange?: ((bookingId: string) => void) | undefined;
}>) {
  const [snapshot, setSnapshot] = useState<WebSessionSnapshot | null>(null);
  useEffect(() => {
    let active = true;
    void session.restore().then((value) => {
      if (active) setSnapshot(value);
    });
    return () => {
      active = false;
    };
  }, [session]);
  if (snapshot === null)
    return (
      <main className="billing-shell">
        <h1>Đang mở thanh toán…</h1>
        <p role="status">Đang kiểm tra phiên đăng nhập.</p>
      </main>
    );
  if (snapshot.status === 'anonymous')
    return (
      <main className="billing-shell">
        <h1>Cần đăng nhập</h1>
        <p role="alert">Đăng nhập bằng tài khoản được cấp quyền trên hồ sơ đặt tiệc.</p>
        <Link href="/account">Về trang đăng nhập</Link>
      </main>
    );
  return (
    <CoupleBillingWorkspace
      key={snapshot.actor.accountId}
      accountId={snapshot.actor.accountId}
      authorize={(operation) => session.authorize(operation)}
      gateway={gateway}
      onBookingChange={onBookingChange}
    />
  );
}
export function CoupleBillingWorkspace({
  accountId,
  authorize,
  gateway,
  intents: provided,
  onBookingChange,
}: Readonly<{
  accountId: string;
  authorize: Authorize;
  gateway: CoupleBillingGateway;
  intents?: ReturnType<typeof createBillingIntents>;
  onBookingChange?: ((bookingId: string) => void) | undefined;
}>) {
  const [intents] = useState(() => provided ?? createBillingIntents(accountId));
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
    let active = true;
    const expGateway = createExperienceGateway();
    void authorize((token) => expGateway.overview(token))
      .then((overview) => {
        if (!active || !overview?.data) return;
        const mapped = overview.data.map((item) => ({
          bookingId: item.bookingId,
          label: `${item.hallName} · ${item.eventDate} · ${item.shiftCode === 'LUNCH' ? 'Trưa' : 'Tối'}`,
        }));
        setAvailableBookings(mapped);
      })
      .catch(() => {
        // Restricted access or no couple bookings
      });
    return () => {
      active = false;
    };
  }, [authorize]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      if (identifierEdited.current) return;
      setBookingId(params.get('bookingId') ?? '');
      setAttemptId(params.get('attemptId') ?? '');
    });
  }, []);
  const fail = (caught: unknown) => {
    if (denied(caught)) {
      setContext(null);
      setView(null);
      setAttempt(null);
      setCheckout(null);
      setIntent(null);
      setNeedsAttemptStatus(false);
    }
    setError(billingMessage(caught));
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
    }
  };
  const load = async (id: string) => {
    const requestId = id + ':' + Date.now();
    activeRequestIdRef.current = requestId;
    const value = await authorize((token) => gateway.loadContext(token, id));
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
    const restoreAttemptId =
      savedAllowed && saved?.checkoutAttemptId !== undefined
        ? saved.checkoutAttemptId
        : !hideBalanceAttempt &&
            (context?.bookingId === id ||
              new URLSearchParams(window.location.search).get('bookingId') === id)
          ? attemptId.trim()
          : '';
    setNeedsAttemptStatus(restoreAttemptId !== '');
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
    if (saved?.timelineRevisionId !== undefined) {
      setIntent({
        kind: 'deposit',
        body: {
          timelineRevisionId: saved.timelineRevisionId,
          ...(saved.contractRevisionId === undefined
            ? {}
            : { contractRevisionId: saved.contractRevisionId }),
          ...(saved.documentDigest === undefined ? {} : { documentDigest: saved.documentDigest }),
        },
        amountVnd: null,
      });
      setRetry(true);
    } else if (saved?.expectedBillingRevision !== undefined && value.accessLevel === 'FULL') {
      setIntent({
        kind: 'balance',
        body: { expectedBillingRevision: saved.expectedBillingRevision },
        amountVnd: null,
      });
      setRetry(true);
    }
    if (restoreAttemptId !== '') {
      const restored = await authorize((token) => gateway.loadAttempt(token, id, restoreAttemptId));
      if (
        restored.paymentAttemptId !== restoreAttemptId ||
        (value.accessLevel !== 'FULL' && restored.purpose !== 'DEPOSIT')
      )
        throw new Error('Attempt mismatch');
      setAttempt(restored);
      setAttemptId(restoreAttemptId);
      setNeedsAttemptStatus(false);
      if (restored.status === 'SUCCEEDED' || restored.status === 'FAILED') {
        setCheckout(null);
        setIntent(null);
        setRetry(false);
        if (completed(restored)) await intents.completeCheckout(`checkout:${id}`, restoreAttemptId);
      }
    }
  };
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
      window.history.replaceState({}, '', `/billing?${query.toString()}`);
    } catch (caught) {
      fail(caught);
      const unknown = unresolved(caught);
      setRetry(unknown);
      if (!unknown) setIntent(null);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const inFlight = attempt !== null && !completed(attempt);
  const blocked = pending || intent !== null || checkout !== null || inFlight || needsAttemptStatus;
  return (
    <main className="billing-shell billing-couple">
      <header className="billing-header">
        <Link className="billing-wordmark" href="/" aria-label="Hỷ Yến — Trang chủ">
          <BrandMark compact />
        </Link>
        <nav aria-label="Không gian cặp đôi">
          <Link href="/workspace">Đề xuất và kịch bản</Link>
          <Link href="/billing" aria-current="page">
            Thanh toán
          </Link>
        </nav>
      </header>
      <section className="billing-intro">
        <h1>Thanh toán cho ngày trọng đại</h1>
        <p>Xem khoản cọc, số dư và trạng thái đã được nhà hàng xác minh.</p>

        {availableBookings.length > 0 && (
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
                  if (attempt?.status === 'SUCCEEDED' || attempt?.status === 'FAILED')
                    setCheckout(null);
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
              checkout !== null || inFlight ? (
                <p>Giao dịch đang được xác minh. Kiểm tra trạng thái trước khi tiếp tục.</p>
              ) : (
                <button
                  disabled={
                    blocked || context.timelineRevisionId === null || context.contractRequired
                  }
                  onClick={() => {
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
                <Link href={`/contract?bookingId=${context.bookingId}`}>Mở hợp đồng →</Link>
              </p>
            )}
          </section>
          {view !== null && (
            <>
              <BillingSummary view={view} />
              <button
                disabled={blocked || view.billingRevision === 0 || view.totals.outstandingVnd === 0}
                onClick={() =>
                  setIntent({
                    kind: 'balance',
                    body: { expectedBillingRevision: view.billingRevision },
                    amountVnd: view.totals.outstandingVnd,
                  })
                }
              >
                Thanh toán còn lại
              </button>
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
            <section className="billing-panel">
              <h2>Đường dẫn thanh toán đã được tạo</h2>
              <p>
                Mã giao dịch thanh toán: <code>{checkout.paymentAttemptId}</code>
              </p>
              <p>
                Đường dẫn hết hạn lúc {new Date(checkout.expiresAt).toLocaleString('vi-VN')}. Hết
                hạn không chứng minh thanh toán thất bại.
              </p>
              {(attempt?.status ?? checkout.status) === 'CREATED' ||
              (attempt?.status ?? checkout.status) === 'PENDING' ? (
                <a
                  className="billing-primary-link"
                  href={checkout.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tiếp tục trên VNPay
                </a>
              ) : (
                <p>Kiểm tra trạng thái đã xác minh trước khi tiếp tục thanh toán.</p>
              )}
              <p>
                Sau khi quay lại, kiểm tra trạng thái bên dưới. Trang trả về từ VNPay không xác nhận
                đã nhận tiền.
              </p>
            </section>
          )}
          <section className="billing-panel">
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
                  setAttempt(value);
                  setNeedsAttemptStatus(false);
                  if (value.status === 'FAILED' || value.status === 'SUCCEEDED') {
                    setCheckout(null);
                    setIntent(null);
                    setRetry(false);
                    if (completed(value))
                      await intents.completeCheckout(
                        `checkout:${context.bookingId}`,
                        value.paymentAttemptId,
                      );
                  }
                });
              }}
            >
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
              <button disabled={pending || intent !== null}>Kiểm tra trạng thái</button>
            </form>
            {attempt !== null && <AttemptStatus attempt={attempt} />}
            {attempt?.status === 'SUCCEEDED' && attempt.applicationStatus === 'SUCCEEDED' ? (
              <Celebrate onceKey={'payment-' + attempt.paymentAttemptId} />
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}
