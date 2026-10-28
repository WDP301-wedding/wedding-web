'use client';

import { money } from './billing-display';
import type { CheckoutIntent } from './use-billing-workspace';

export function BillingConfirmSection({
  intent,
  embedded = false,
  pending,
  retry,
  onConfirm,
  onCancel,
}: {
  intent: CheckoutIntent;
  embedded?: boolean;
  pending: boolean;
  retry: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const Container = embedded ? 'div' : 'section';
  return (
    <Container className="billing-confirm" aria-label="Xác nhận thanh toán">
      <h2>{intent.kind === 'deposit' ? 'Xác nhận đặt cọc' : 'Xác nhận thanh toán số dư'}</h2>
      {intent.amountVnd === null ? (
        <p>Khôi phục yêu cầu trước. Kiểm tra số tiền của giao dịch qua trạng thái đã xác minh.</p>
      ) : (
        <strong>{money(intent.amountVnd)}</strong>
      )}
      <p>
        Sau khi tạo giao dịch, chọn “Tiếp tục trên VNPay” để thanh toán trong tab hiện tại. Kết quả
        sẽ được xác minh khi bạn quay về.
      </p>
      <div className="billing-confirm-actions">
        <button type="button" disabled={pending} onClick={onConfirm}>
          {pending ? 'Đang tạo giao dịch…' : retry ? 'Thử lại cùng yêu cầu' : 'Tạo giao dịch VNPay'}
        </button>
        <button
          type="button"
          className="billing-secondary"
          disabled={pending || retry}
          onClick={onCancel}
        >
          Quay lại
        </button>
      </div>
    </Container>
  );
}
