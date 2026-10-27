'use client';

import type { balanceGate } from './balance-eligibility';
import type { BillingView } from './billing-api';
import { BillingHistory, BillingSummary } from './billing-display';

export function BillingBalanceSection({
  view,
  blocked,
  gate,
  pending,
  attemptId,
  restaurant,
  onStartBalance,
  onRefreshLedger,
  onLoadMoreHistory,
}: {
  view: BillingView;
  blocked: boolean;
  gate: ReturnType<typeof balanceGate> | null;
  pending: boolean;
  attemptId: string;
  restaurant?: { publicPhone?: string | null } | null | undefined;
  onStartBalance: () => void;
  onRefreshLedger: () => void;
  onLoadMoreHistory: () => void;
}) {
  return (
    <>
      <BillingSummary view={view} />
      <div className="billing-balance-action">
        <button
          disabled={blocked || gate === null || !gate.allowed}
          onClick={onStartBalance}
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
                onClick={onRefreshLedger}
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
          onClick={onLoadMoreHistory}
        >
          Tải thêm lịch sử
        </button>
      )}
    </>
  );
}
