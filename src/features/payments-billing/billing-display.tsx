import { blockedBalanceCopy } from './balance-eligibility';
import { ApiClientError } from '../../lib/api/client';
import { formatDateTime } from '../couple-workspace/workspace-helpers';
import type { AttemptView, BillingView } from './billing-api';
import { bx } from './billing-classes';

export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export function unresolved(error: unknown): boolean {
  return (
    !(error instanceof ApiClientError) ||
    error.kind !== 'api' ||
    (error.status ?? 500) >= 500 ||
    error.status === 429 ||
    error.code === 'REQUEST_IN_PROGRESS'
  );
}
export function denied(error: unknown): boolean {
  return error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0);
}
export function billingMessage(error: unknown): string {
  if (denied(error))
    return 'Phiên đăng nhập hoặc quyền xem hồ sơ không còn hợp lệ. Hãy đăng nhập và kiểm tra quyền truy cập.';
  if (!(error instanceof ApiClientError))
    return 'Chưa hoàn tất yêu cầu. Kiểm tra kết nối và giữ nguyên nội dung để thử lại; nếu lịch sử đã thay đổi, hãy tải lại.';
  const messages: Record<string, string> = {
    PAYMENT_QUERY_COOLDOWN:
      'VNPay giới hạn kiểm tra mỗi giao dịch một lần trong 5 phút. Hãy đợi rồi kiểm tra lại.',
    // Lý do chặn thanh toán số dư (POST /payments/balance có thể trả 409 dù GET trước đó cho phép).
    ...Object.fromEntries(
      Object.entries(blockedBalanceCopy).map(([code, copy]) => [code, copy.message]),
    ),
    STALE_BILLING_REVISION: 'Số dư đã thay đổi. Hãy làm mới và kiểm tra lại trước khi xác nhận.',
    BILLING_REFUND_LIMIT_EXCEEDED: 'Khoản hoàn vượt hạn mức đã duyệt hoặc số tiền còn được hoàn.',
    BILLING_REFUND_NOT_APPROVED: 'Chưa có quyết định hoàn tiền hợp lệ cho khoản thanh toán này.',
    DEPOSIT_NOT_ELIGIBLE:
      'Thời hạn giữ sảnh (15 phút) đã hết hoặc hợp đồng/kịch bản cần cả hai bên phê duyệt. Vui lòng liên hệ nhà hàng để gia hạn giữ sảnh trước khi mở thanh toán.',
    PAYMENT_OUTCOME_UNKNOWN:
      'Giao dịch chưa rõ kết quả. Hãy kiểm tra trạng thái, không tạo lần thanh toán mới.',
    REQUEST_IN_PROGRESS: 'Yêu cầu đang được xử lý. Hãy đợi rồi thử lại cùng nội dung.',
    IDEMPOTENCY_KEY_REUSED: 'Nội dung khác với yêu cầu trước. Hãy kiểm tra lại chứng từ.',
  };
  return (
    messages[error.code] ??
    (unresolved(error)
      ? 'Chưa rõ kết quả. Giữ nguyên nội dung để thử lại và kiểm tra kết quả.'
      : 'Yêu cầu bị từ chối. Kiểm tra dữ liệu, số dư và quyết định được duyệt trước khi tiếp tục.')
  );
}
const totalLabels: Record<keyof BillingView['totals'], string> = {
  acceptedChargesVnd: 'Tổng tiền phải thanh toán',
  paidVnd: 'Đã thanh toán',
  refundedVnd: 'Đã hoàn tiền',
  netPaidVnd: 'Đã thanh toán sau hoàn tiền',
  outstandingVnd: 'Còn phải thanh toán',
  creditVnd: 'Tiền thanh toán thừa',
};
const kinds = {
  CHARGE: 'Khoản phải thu',
  PAYMENT: 'Thanh toán',
  REFUND: 'Hoàn tiền',
  CREDIT_ADJUSTMENT: 'Điều chỉnh giảm',
};
// Mọi sourceType mà sổ cái có thể trả về (theo OpenAPI). Dùng Record để TypeScript báo lỗi
// ngay khi backend thêm loại nguồn mới mà UI chưa có nhãn.
const sources: Record<BillingView['history'][number]['sourceType'], string> = {
  BASE_BOOKING: 'Tiệc cưới (đề xuất cũ)',
  CONTRACT: 'Hợp đồng',
  CONTRACT_APPENDIX: 'Phụ lục hợp đồng',
  INCIDENTAL_FINALIZATION: 'Chi phí phát sinh',
  INVOICE_ADJUSTMENT: 'Điều chỉnh hoá đơn',
  PRINT_ORDER: 'Đơn in',
  PAYMENT_ATTEMPT: 'Khoản thanh toán',
  PRINT_CREDIT: 'Điều chỉnh đơn in',
  MANUAL_REFUND: 'Hoàn theo chứng từ',
};
export function BillingSummary({ view }: Readonly<{ view: BillingView }>) {
  const percentPaid = Math.max(
    0,
    Math.min(
      100,
      view.totals.acceptedChargesVnd > 0
        ? Math.round((view.totals.netPaidVnd / view.totals.acceptedChargesVnd) * 100)
        : 0,
    ),
  );

  const hasAdjustments = view.totals.refundedVnd > 0 || view.totals.creditVnd > 0;
  const displayKeys: (keyof BillingView['totals'])[] = hasAdjustments
    ? [
        'acceptedChargesVnd',
        'paidVnd',
        'refundedVnd',
        'netPaidVnd',
        'outstandingVnd',
        'creditVnd',
      ]
    : ['acceptedChargesVnd', 'paidVnd', 'outstandingVnd'];

  return (
    <section aria-label="Tổng hợp tiền đặt tiệc" className={bx.summary}>
      <div className="flex flex-col gap-1.5 pb-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Tiến độ thanh toán tiệc cưới</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
            {percentPaid}% Đã thanh toán
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-emerald-600 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${percentPaid}%` }}
          />
        </div>
      </div>
      <dl>
        {displayKeys.map((key) => {
          const value = view.totals[key];
          const isPaid = key === 'paidVnd' || key === 'netPaidVnd';
          const isOutstanding = key === 'outstandingVnd';
          return (
            <div
              key={key}
              className={
                isPaid
                  ? '!border-emerald-500/30 !bg-emerald-50/40 dark:!bg-emerald-950/20'
                  : isOutstanding
                    ? '!border-primary/25 !bg-primary/5'
                    : ''
              }
            >
              <dt className="flex items-center justify-between">
                <span>{totalLabels[key]}</span>
                {isPaid && value > 0 && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-2xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Đã nhận
                  </span>
                )}
              </dt>
              <dd className={isPaid ? 'text-emerald-700 dark:text-emerald-300' : ''}>
                {money(value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
export function BillingHistory({ view }: Readonly<{ view: BillingView }>) {
  return (
    <div className="flex flex-col gap-2.5 pt-3 border-t border-border/60">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Lịch sử giao dịch</h3>
        <span className="text-2xs font-medium text-muted-foreground">
          {view.history.length} mục đã ghi nhận
        </span>
      </div>
      {view.history.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Chưa có giao dịch</p>
      ) : (
        <div className={bx.tableScroll} tabIndex={0} role="region" aria-label="Chi tiết giao dịch">
          <table>
            <caption>Chi tiết giao dịch</caption>
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Loại / nguồn</th>
                <th>Số tiền</th>
                <th>Mã tham chiếu</th>
              </tr>
            </thead>
            <tbody>
              {view.history.map((entry) => (
                <tr key={entry.ledgerEntryId}>
                  <td className="whitespace-nowrap font-medium text-foreground">
                    {formatDateTime(entry.occurredAt)}
                  </td>
                  <td>
                    <span className="font-semibold">{kinds[entry.kind]}</span>
                    <small className="text-muted-foreground">{sources[entry.sourceType]}</small>
                  </td>
                  <td className="tabular-nums font-semibold text-foreground">
                    {money(entry.amountVnd)}
                  </td>
                  <td>
                    <code
                      className="max-w-[140px] truncate block font-mono text-2xs text-muted-foreground"
                      title={entry.ledgerEntryId}
                    >
                      {entry.ledgerEntryId.length > 16
                        ? `#${entry.ledgerEntryId.slice(0, 8)}…`
                        : entry.ledgerEntryId}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export function AttemptStatus({ attempt }: Readonly<{ attempt: AttemptView }>) {
  const labels = {
    CREATED: 'Đã tạo · chờ thanh toán',
    PENDING: 'Đang chờ xác minh',
    FAILED: 'Thanh toán không thành công',
    UNKNOWN: 'Chưa rõ kết quả · đang kiểm tra',
    SUCCEEDED: 'Đã xác minh nhận tiền',
  };
  const isSucceeded = attempt.status === 'SUCCEEDED';
  const isFailed = attempt.status === 'FAILED';
  const isPending = attempt.status === 'PENDING' || attempt.status === 'UNKNOWN';

  return (
    <section
      className={`${bx.attempt} ${
        isSucceeded
          ? '!border-emerald-500/25 !bg-emerald-50/50 dark:!bg-emerald-950/20'
          : isFailed
            ? '!border-destructive/30 !bg-destructive/5'
            : isPending
              ? '!border-amber-500/25 !bg-amber-50/40 dark:!bg-amber-950/20'
              : ''
      }`}
      aria-label="Trạng thái thanh toán"
    >
      <h3
        className={`flex items-center gap-1.5 font-bold ${
          isSucceeded
            ? 'text-emerald-800 dark:text-emerald-300'
            : isFailed
              ? 'text-destructive'
              : isPending
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-foreground'
        }`}
      >
        {isSucceeded && <span>✓</span>}
        {labels[attempt.status]}
      </h3>
      <p className="font-medium text-foreground">
        {attempt.purpose === 'DEPOSIT' ? 'Đặt cọc' : 'Thanh toán còn lại'} ·{' '}
        {money(attempt.amountVnd)}
      </p>
      <p className="text-muted-foreground">
        Mã giao dịch thanh toán:{' '}
        <code className="text-2xs font-mono">{attempt.paymentAttemptId}</code>
      </p>
      {attempt.status === 'SUCCEEDED' && (
        <p className="text-emerald-700 dark:text-emerald-400 font-medium">
          {attempt.applicationStatus === 'SUCCEEDED'
            ? 'Đã hoàn tất cập nhật hồ sơ.'
            : 'Tiền đã được xác minh; hồ sơ đang chờ cập nhật.'}
        </p>
      )}
      {attempt.status !== 'FAILED' && attempt.status !== 'SUCCEEDED' && (
        <p className="text-muted-foreground">
          Không tạo lần thanh toán khác khi chưa xác minh kết quả. Hết hạn đường dẫn không chứng
          minh thanh toán thất bại.
        </p>
      )}
    </section>
  );
}
