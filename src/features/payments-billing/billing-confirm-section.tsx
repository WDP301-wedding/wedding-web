'use client';

import { money } from './billing-display';
import type { CheckoutIntent } from './use-billing-workspace';

export function BillingConfirmSection({
  intent,
  pending,
  retry,
  onConfirm,
  onCancel,
}: {
  intent: CheckoutIntent;
  pending: boolean;
  retry: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="billing-confirm" aria-label="Xác nhận thanh toán">
      <h2>{intent.kind === 'deposit' ? 'Kiểm tra khoản cọc' : 'Kiểm tra khoản còn lại'}</h2>
      {intent.amountVnd === null ? (
        <p>
          Khôi phục yêu cầu trước. Kiểm tra số tiền của giao dịch qua trạng thái đã xác minh.
        </p>
      ) : (
        <strong>{money(intent.amountVnd)}</strong>
      )}
      <p>VNPay mở giao dịch do máy chủ tạo. Số tiền không được nhập hoặc sửa trên trang này.</p>
      <button disabled={pending} onClick={onConfirm}>
        {retry ? 'Thử lại cùng yêu cầu' : 'Xác nhận mở VNPay'}
      </button>
      <button
        className="billing-secondary"
        disabled={pending || retry}
        onClick={onCancel}
      >
        Quay lại
      </button>
    </section>
  );
}
