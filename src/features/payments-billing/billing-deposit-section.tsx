'use client';

import Link from 'next/link';
import type { BillingContext } from './billing-api';
import { money } from './billing-display';

export function BillingDepositSection({
  context,
  blocked,
  isCheckoutActive,
  inFlight,
  onStartDeposit,
}: {
  context: BillingContext;
  blocked: boolean;
  isCheckoutActive: boolean;
  inFlight: boolean;
  onStartDeposit: () => void;
}) {
  return (
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
          Quyền tư vấn chỉ hiển thị khoản cọc và trạng thái cọc; số dư đầy đủ mở sau khi hồ sơ được
          xác nhận.
        </p>
      )}
      {context.phase === 'DRAFT' || context.phase === 'AWAITING_DEPOSIT' ? (
        isCheckoutActive || inFlight ? (
          <p>Giao dịch đang được xác minh. Kiểm tra trạng thái trước khi tiếp tục.</p>
        ) : (
          <button
            disabled={blocked || context.timelineRevisionId === null || context.contractRequired}
            onClick={onStartDeposit}
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
  );
}
