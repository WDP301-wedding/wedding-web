import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components, operations } from '../../lib/api/generated/schema';

type BillingResponseData = components['schemas']['BookingBillingResponse']['data'];
/**
 * Điều kiện thanh toán số dư do backend đánh giá (PR #76). Frontend KHÔNG tự suy ra từ số dư
 * hay trạng thái booking — chỉ đọc `canPay` + `reasonCode` + `nextAction`.
 */
export type BalanceEligibility = components['schemas']['BalancePaymentEligibility'];
export type BalanceBlockReason = Extract<BalanceEligibility, { canPay: false }>['reasonCode'];
/**
 * `balancePaymentEligibility: null` = response không có trường này (backend cũ/chưa deploy).
 * Khi đó coi như CHƯA được phép thanh toán, thay vì đoán.
 */
export type BillingView = Omit<BillingResponseData, 'balancePaymentEligibility'> &
  Readonly<{ balancePaymentEligibility: BalanceEligibility | null }>;
export type AttemptView = components['schemas']['BillingAttemptResponse']['data'];
export type CheckoutView = components['schemas']['BillingCheckoutResponse']['data'];
export type DepositBody = components['schemas']['BillingDepositBody'];
export type BalanceBody = components['schemas']['BillingBalanceBody'];
export type BillingPageQuery = operations['getBookingBilling']['parameters']['query'];
export type BillingContext = Readonly<{
  bookingId: string;
  accessLevel: 'RESTRICTED' | 'FULL';
  phase: components['schemas']['BookingProposalResponse']['data']['phase'];
  depositAmountVnd: number;
  timelineRevisionId: string | null;
  /**
   * Hợp đồng FULL_CONTRACT_V1 đã duyệt kép (nếu có). Khi có, khoản cọc là 30% tổng hợp đồng và
   * body đặt cọc PHẢI kèm đúng `contractRevisionId` + `documentDigest` + `timelineRevisionId` của
   * hợp đồng đó, để backend chắc chắn hai bên đang trả tiền cho đúng phiên bản đã duyệt.
   */
  contract: Readonly<{
    revisionId: string;
    documentDigest: string;
    eligibleForDeposit: boolean;
  }> | null;
  /** Booking theo mô hình hợp đồng mới nhưng chưa có hợp đồng được duyệt → chưa thể đặt cọc. */
  contractRequired: boolean;
}>;
export interface CoupleBillingGateway {
  loadContext(this: void, token: string, bookingId: string): Promise<BillingContext>;
  load(
    this: void,
    token: string,
    bookingId: string,
    query?: BillingPageQuery,
  ): Promise<BillingView>;
  loadAttempt(
    this: void,
    token: string,
    bookingId: string,
    attemptId: string,
  ): Promise<AttemptView>;
  startDeposit(
    this: void,
    token: string,
    bookingId: string,
    body: DepositBody,
    key: string,
  ): Promise<CheckoutView>;
  startBalance(
    this: void,
    token: string,
    bookingId: string,
    body: BalanceBody,
    key: string,
  ): Promise<CheckoutView>;
}
function required<T>(data: { readonly data: T } | undefined): T {
  if (data?.data === undefined || data.data === null)
    throw new Error('Không nhận được dữ liệu thanh toán. Giữ nguyên yêu cầu để thử lại.');
  return data.data;
}
function checkout(data: { readonly data: CheckoutView } | undefined): CheckoutView {
  const value = required(data);
  const url = new URL(value.checkoutUrl);
  if (
    url.origin !== 'https://sandbox.vnpayment.vn' ||
    url.pathname !== '/paymentv2/vpcpay.html' ||
    url.username ||
    url.password
  )
    throw new Error('Đường dẫn VNPay không hợp lệ. Giữ nguyên yêu cầu và liên hệ nhà hàng.');
  return value;
}
export function createCoupleBillingGateway(client?: ApiClient): CoupleBillingGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async loadContext(token, bookingId) {
      const [{ data }, contracts] = await Promise.all([
        api().GET('/bookings/{bookingId}/proposal', {
          params: { path: { bookingId } },
          headers: headers(token),
          cache: 'no-store',
        }),
        api()
          .GET('/bookings/{bookingId}/contracts', {
            params: { path: { bookingId } },
            headers: headers(token),
            cache: 'no-store',
          })
          .then((response) => response.data?.data ?? null)
          // Booking theo đề xuất cũ có thể không đọc được hợp đồng: coi như chưa có hợp đồng.
          .catch(() => null),
      ]);
      const value = required(data);
      const revisions = contracts?.revisions ? Array.from(contracts.revisions) : [];
      const current = revisions.find(
        (revision) => revision.revisionId === contracts?.currentRevisionId,
      );
      const approved = current !== undefined && current.state === 'APPROVED' ? current : null;
      return {
        bookingId: value.bookingId,
        accessLevel: value.capabilities.accessLevel,
        phase: value.phase,
        depositAmountVnd: approved?.document.depositAmountVnd ?? value.proposal.depositAmountVnd,
        timelineRevisionId:
          approved?.document.timelineRevisionId ?? value.timeline?.revisionId ?? null,
        contract:
          approved === null
            ? null
            : {
                revisionId: approved.revisionId,
                documentDigest: approved.documentDigest,
                eligibleForDeposit: contracts?.eligibleForDeposit ?? false,
              },
        contractRequired: contracts?.modelVersion === 'FULL_CONTRACT_V1' && approved === null,
      };
    },
    async load(token, bookingId, query = {}) {
      const { data } = await api().GET('/bookings/{bookingId}/billing', {
        params: { path: { bookingId }, query: { limit: 25, ...query } },
        headers: headers(token),
        cache: 'no-store',
      });
      const value = required(data);
      return {
        ...value,
        history: Array.from(value.history),
        balancePaymentEligibility: readEligibility(
          (value as { balancePaymentEligibility?: unknown }).balancePaymentEligibility,
        ),
      };
    },
    async loadAttempt(token, bookingId, attemptId) {
      const { data } = await api().GET('/bookings/{bookingId}/payments/{attemptId}', {
        params: { path: { bookingId, attemptId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data);
    },
    async startDeposit(token, bookingId, body, key) {
      const { data } = await api().POST('/bookings/{bookingId}/payments/deposit', {
        params: { path: { bookingId }, header: { 'Idempotency-Key': key } },
        headers: headers(token),
        body,
        cache: 'no-store',
      });
      return checkout(data);
    },
    async startBalance(token, bookingId, body, key) {
      const { data } = await api().POST('/bookings/{bookingId}/payments/balance', {
        params: { path: { bookingId }, header: { 'Idempotency-Key': key } },
        headers: headers(token),
        body,
        cache: 'no-store',
      });
      return checkout(data);
    },
  };
}

const blockReasons: readonly BalanceBlockReason[] = [
  'BALANCE_NOT_ELIGIBLE',
  'INVOICE_FINALIZATION_REQUIRED',
  'FINANCIAL_SOURCE_CONFLICT',
  'PAYMENT_ATTEMPT_ACTIVE',
  'BILLING_BALANCE_LIMIT_EXCEEDED',
  'PAYMENT_PROVIDER_AMOUNT_UNSUPPORTED',
  'PAYMENT_PROVIDER_UNAVAILABLE',
  'STALE_BILLING_REVISION',
];
const nextActions: readonly Extract<BalanceEligibility, { canPay: false }>['nextAction'][] = [
  'CONTACT_RESTAURANT',
  'WAIT_FOR_FINAL_INVOICE',
  'CHECK_EXISTING_PAYMENT',
  'NONE',
  'REFRESH_BILLING',
];

/**
 * Đọc `balancePaymentEligibility` một cách phòng thủ: thiếu trường hoặc giá trị lạ (backend
 * cũ, mã mới chưa biết) → `null` = chưa cho phép thanh toán. Không bao giờ "đoán" là được trả.
 */
export function readEligibility(raw: unknown): BalanceEligibility | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const revision = value.billingRevision;
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) return null;
  if (value.canPay === true && value.nextAction === 'PAY_BALANCE' && value.reasonCode === null)
    return { canPay: true, reasonCode: null, nextAction: 'PAY_BALANCE', billingRevision: revision };
  const reason = blockReasons.find((code) => code === value.reasonCode);
  const action = nextActions.find((code) => code === value.nextAction);
  if (value.canPay === false && reason && action)
    return { canPay: false, reasonCode: reason, nextAction: action, billingRevision: revision };
  return null;
}
