'use client';

import type { balanceGate } from './balance-eligibility';
import type { BillingView } from './billing-api';
import { BillingHistory, BillingSummary } from './billing-display';
import { bx } from './billing-classes';

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
    <section className={bx.balanceCard} aria-label="Trung tâm thanh toán tiệc cưới">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold dark:bg-emerald-950 dark:text-emerald-300">
            ✓
          </span>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Tổng hợp thanh toán tiệc cưới
          </h2>
        </div>
      </div>

      <BillingSummary view={view} />

      <div className={bx.balanceGateNotice}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 flex-1 text-xs">
            <span className="text-amber-600 dark:text-amber-400 font-bold text-sm select-none">
              ℹ️
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground">Quyết toán số dư tiệc cưới</span>
              <p className="text-muted-foreground leading-relaxed">
                {gate !== null && !gate.allowed
                  ? gate.message
                  : 'Khoản thanh toán số dư sẽ được thanh toán sau khi nhà hàng hoàn tất quyết toán.'}
              </p>
            </div>
          </div>
          <button
            className={bx.button}
            disabled={blocked || gate === null || !gate.allowed}
            onClick={onStartBalance}
          >
            Thanh toán còn lại
          </button>
        </div>
        {gate !== null &&
        !gate.allowed &&
        (gate.action === 'refresh' ||
          (gate.action === 'check-payment' && attemptId !== '') ||
          (gate.action === 'contact' && restaurant?.publicPhone)) ? (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            {gate.action === 'refresh' ? (
              <button
                type="button"
                className={bx.buttonOutline}
                disabled={pending}
                onClick={onRefreshLedger}
              >
                Tải lại công nợ
              </button>
            ) : null}
            {gate.action === 'check-payment' && attemptId !== '' ? (
              <a className={bx.buttonOutline} href="#billing-attempt-status">
                Kiểm tra giao dịch đang xử lý
              </a>
            ) : null}
            {gate.action === 'contact' && restaurant?.publicPhone ? (
              <a
                className={bx.buttonOutline}
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
        <button className={bx.buttonOutline} disabled={pending} onClick={onLoadMoreHistory}>
          Tải thêm lịch sử
        </button>
      )}
    </section>
  );
}
