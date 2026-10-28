'use client';

import Link from 'next/link';
import type { BillingContext } from './billing-api';
import type { CheckoutIntent } from './billing-workspace.helpers';
import { money } from './billing-display';
import { BillingConfirmSection } from './billing-confirm-section';
import { DepositBreakdown } from './deposit-breakdown';
import styles from './deposit.module.css';

export function BillingDepositSection({
  context,
  blocked,
  isCheckoutActive,
  inFlight,
  onStartDeposit,
  intent = null,
  pending = false,
  retry = false,
  onConfirm,
  onCancel,
}: Readonly<{
  context: BillingContext;
  blocked: boolean;
  isCheckoutActive: boolean;
  inFlight: boolean;
  onStartDeposit: () => void;
  intent?: CheckoutIntent | null;
  pending?: boolean;
  retry?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}>) {
  const confirming = intent?.kind === 'deposit' && onConfirm && onCancel;
  const displayContext = intent?.kind === 'deposit' ? (intent.displayContext ?? context) : context;
  const payablePhase = context.phase === 'DRAFT' || context.phase === 'AWAITING_DEPOSIT';
  return (
    <section
      className={`billing-deposit ${styles.workspace}`}
      aria-label="Chi tiết đặt cọc tiệc cưới"
    >
      <DepositBreakdown context={displayContext} />
      <div className={styles.payment}>
        {confirming ? (
          <BillingConfirmSection
            embedded
            intent={intent}
            pending={pending}
            retry={retry}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        ) : (
          <>
            <h2>
              {!payablePhase
                ? 'Khoản đặt cọc của tiệc'
                : context.contractRequired
                  ? 'Khoản đặt cọc dự kiến'
                  : 'Đặt cọc tiệc cưới'}
            </h2>
            <p className={styles.amount}>{money(context.depositAmountVnd)}</p>
            <p className={styles.note}>
              {context.contract
                ? 'Số tiền theo hợp đồng đã được hai bên duyệt.'
                : 'Số tiền theo đề xuất của nhà hàng. Điều kiện và số tiền được kiểm tra lại khi tạo giao dịch.'}
            </p>
            {payablePhase ? (
              isCheckoutActive || inFlight ? (
                <p role="status">
                  Giao dịch đang được xác minh. Kiểm tra trạng thái trước khi tiếp tục.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={
                    blocked || context.timelineRevisionId === null || context.contractRequired
                  }
                  onClick={onStartDeposit}
                >
                  Tiếp tục thanh toán
                </button>
              )
            ) : (
              <p>Hồ sơ đã qua bước đặt cọc hoặc không còn nhận cọc.</p>
            )}
          </>
        )}
        {context.timelineRevisionId === null && (
          <p className={styles.note}>
            Cần có kịch bản được nhà hàng và hai bạn duyệt trước khi đặt cọc.
          </p>
        )}
        {context.contractRequired && (
          <p className={styles.note}>Cần hợp đồng được cả hai bên duyệt trước khi đặt cọc.</p>
        )}
        <Link href={`/khong-gian/thoa-thuan/hop-dong?bookingId=${context.bookingId}`}>
          Xem hợp đồng và thỏa thuận
        </Link>
        <p className={styles.note}>
          Khoản cọc được ghi nhận chung cho tiệc và khấu trừ vào tổng số tiền phải thanh toán; không
          phải khoản thu thêm cho từng hạng mục.
        </p>
        <details className={styles.conditions}>
          <summary>Hạn thanh toán và điều kiện hoàn/hủy cọc</summary>
          <p>
            Trang này chưa có dữ liệu về thời hạn giữ sảnh và điều kiện hoàn/hủy cọc. Hãy đối chiếu
            thỏa thuận và xác nhận với nhà hàng trước khi thanh toán; không mặc định khoản cọc được
            hoàn.
          </p>
        </details>
      </div>
    </section>
  );
}
