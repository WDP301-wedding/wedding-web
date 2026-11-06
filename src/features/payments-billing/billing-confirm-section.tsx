'use client';

import { money } from './billing-display';
import type { CheckoutIntent } from './use-billing-workspace';
import { bx } from './billing-classes';

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
    <Container className={bx.confirm} aria-label="Xác nhận thanh toán">
      <h2>{intent.kind === 'deposit' ? 'Xác nhận đặt cọc' : 'Xác nhận thanh toán số dư'}</h2>
      {intent.amountVnd === null ? (
        <p>Khôi phục yêu cầu trước. Kiểm tra số tiền của giao dịch qua trạng thái đã xác minh.</p>
      ) : (
        <strong>{money(intent.amountVnd)}</strong>
      )}
      {!retry ? (
        <p role="status">Đang chuẩn bị mã QR…</p>
      ) : (
        <div className={bx.confirmActions}>
          <button type="button" className={bx.button} disabled={pending} onClick={onConfirm}>
            {pending
              ? 'Đang tạo giao dịch…'
              : retry
                ? 'Thử lại cùng yêu cầu'
                : 'Tạo giao dịch VNPay'}
          </button>
          <button
            type="button"
            className={bx.buttonOutline}
            disabled={pending || retry}
            onClick={onCancel}
          >
            Quay lại
          </button>
        </div>
      )}
    </Container>
  );
}
