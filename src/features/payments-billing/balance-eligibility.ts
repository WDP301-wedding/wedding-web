import type { BalanceBlockReason, BalanceEligibility } from './billing-api';

/**
 * Điều kiện thanh toán phần còn lại (hand-off BE PR #76).
 *
 * Nguyên tắc: nút "Thanh toán còn lại" CHỈ bật khi backend nói `canPay: true`. Frontend không
 * tự suy ra từ `outstandingVnd > 0` hay trạng thái booking (đó chính là nguyên nhân lỗi
 * 409 INVOICE_FINALIZATION_REQUIRED trước đây: còn nợ nhưng nhà hàng chưa chốt hoá đơn cuối).
 */
export type BalanceGateAction = 'refresh' | 'check-payment' | 'contact' | 'wait' | 'none';

export type BalanceGate =
  | Readonly<{ allowed: true; billingRevision: number }>
  | Readonly<{
      allowed: false;
      /** Câu hiển thị cho người dùng (tiếng Việt, không lộ mã kỹ thuật). */
      message: string;
      action: BalanceGateAction;
      reasonCode: BalanceBlockReason | 'UNKNOWN';
    }>;

/** Bảng theo mục 3 của hand-off: mỗi lý do → câu hướng dẫn + hành động gợi ý. */
export const blockedBalanceCopy: Record<
  BalanceBlockReason,
  Readonly<{ message: string; action: BalanceGateAction }>
> = {
  INVOICE_FINALIZATION_REQUIRED: {
    message:
      'Nhà hàng chưa chốt hoá đơn cuối. Bạn có thể thanh toán sau khi nhà hàng hoàn tất quyết toán.',
    action: 'wait',
  },
  PAYMENT_ATTEMPT_ACTIVE: {
    message:
      'Đang có một giao dịch thanh toán chưa hoàn tất. Hãy kiểm tra giao dịch đó trước, không tạo giao dịch mới.',
    action: 'check-payment',
  },
  STALE_BILLING_REVISION: {
    message: 'Công nợ vừa thay đổi. Hãy tải lại để xem số liệu mới nhất trước khi thanh toán.',
    action: 'refresh',
  },
  BILLING_BALANCE_LIMIT_EXCEEDED: {
    message: 'Không còn khoản nào phải thanh toán (bao gồm trường hợp hai bạn đã trả thừa).',
    action: 'none',
  },
  BALANCE_NOT_ELIGIBLE: {
    message:
      'Tiệc chưa ở trạng thái cho phép thanh toán phần còn lại. Hãy liên hệ nhà hàng nếu cần hỗ trợ.',
    action: 'contact',
  },
  FINANCIAL_SOURCE_CONFLICT: {
    message: 'Thông tin thanh toán cần nhà hàng kiểm tra lại. Hãy liên hệ nhà hàng.',
    action: 'contact',
  },
  PAYMENT_PROVIDER_AMOUNT_UNSUPPORTED: {
    message:
      'Số tiền vượt giới hạn thanh toán trực tuyến hiện có. Hãy liên hệ nhà hàng để thanh toán.',
    action: 'contact',
  },
  PAYMENT_PROVIDER_UNAVAILABLE: {
    message: 'Thanh toán trực tuyến tạm thời chưa khả dụng. Hãy liên hệ nhà hàng.',
    action: 'contact',
  },
};

/**
 * Quyết định trạng thái nút thanh toán từ dữ liệu billing.
 *
 * @param pageBillingRevision `data.billingRevision` của trang billing đang hiển thị (có thể là
 *   mốc lịch sử khi xem trang cũ). Nếu khác revision backend dùng để đánh giá → coi như cũ.
 */
export function balanceGate(
  eligibility: BalanceEligibility | null | undefined,
  pageBillingRevision: number,
): BalanceGate {
  // Chưa nhận được điều kiện (đang tải / lỗi / backend cũ): KHÔNG cho thanh toán sớm.
  if (!eligibility)
    return {
      allowed: false,
      message: 'Chưa kiểm tra được điều kiện thanh toán. Hãy tải lại công nợ.',
      action: 'refresh',
      reasonCode: 'UNKNOWN',
    };
  if (eligibility.canPay) {
    if (eligibility.billingRevision !== pageBillingRevision)
      return {
        allowed: false,
        ...blockedBalanceCopy.STALE_BILLING_REVISION,
        reasonCode: 'STALE_BILLING_REVISION',
      };
    return { allowed: true, billingRevision: eligibility.billingRevision };
  }
  return {
    allowed: false,
    ...blockedBalanceCopy[eligibility.reasonCode],
    reasonCode: eligibility.reasonCode,
  };
}
