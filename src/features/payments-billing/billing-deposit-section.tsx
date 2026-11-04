'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ContractPdfViewer } from '../commercial-contract/contract-pdf-viewer';
import type { BillingContext, CheckoutView } from './billing-api';
import type { CheckoutIntent } from './billing-workspace.helpers';
import { money } from './billing-display';
import { BillingConfirmSection } from './billing-confirm-section';
import { DepositBreakdown } from './deposit-breakdown';
import { useCountdown, useExpired } from './checkout-link';
import { cn } from 'cn';
import { bx } from './billing-classes';

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
  checkout = null,
  onCheckStatus,
  onResetExpired,
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
  checkout?: CheckoutView | null;
  onCheckStatus?: () => void;
  onResetExpired?: () => void;
}>) {
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const terms = context.depositTerms;
  const isDepositActive = isCheckoutActive && checkout !== null;
  const isDepositExpired = useExpired(checkout?.expiresAt);
  const countdown = useCountdown(checkout?.expiresAt);

  const formatDeadline = (value: string) =>
    new Date(value).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  const confirming = intent?.kind === 'deposit' && onConfirm && onCancel;
  const displayContext = intent?.kind === 'deposit' ? (intent.displayContext ?? context) : context;
  const payablePhase = context.phase === 'DRAFT' || context.phase === 'AWAITING_DEPOSIT';
  return (
    <section className={bx.depositWorkspace} aria-label="Chi tiết đặt cọc tiệc cưới">
      <DepositBreakdown context={displayContext} />
      <div className={bx.payment}>
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
            <p className={bx.amount}>{money(context.depositAmountVnd)}</p>
            <p className={bx.note}>
              {context.contract
                ? 'Số tiền theo hợp đồng đã được hai bên duyệt.'
                : 'Số tiền theo đề xuất của nhà hàng. Điều kiện và số tiền được kiểm tra lại khi tạo giao dịch.'}
            </p>
            {payablePhase ? (
              isDepositActive ? (
                <div
                  className="my-2 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
                  role="region"
                  aria-label="Phiên thanh toán đang mở"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Giao dịch VNPay đang mở
                      </span>
                    </div>
                    {countdown ? (
                      <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                        còn {countdown}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Mã GD: <code className="font-mono font-semibold text-foreground">{checkout.paymentAttemptId}</code>
                    <br />
                    Hiệu lực đến: <strong>{formatDeadline(checkout.expiresAt)}</strong>
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <a
                      className={cn(bx.button, 'w-full text-center no-underline inline-flex items-center justify-center')}
                      href={checkout.checkoutUrl}
                      target="_self"
                      rel="noopener noreferrer"
                    >
                      Tiếp tục trên VNPay
                    </a>

                    <div className="grid grid-cols-2 gap-2">
                      {onCheckStatus && (
                        <button
                          type="button"
                          className={cn(bx.buttonOutline, 'w-full py-2 text-xs')}
                          disabled={pending}
                          onClick={onCheckStatus}
                        >
                          {pending ? 'Đang kiểm tra…' : 'Kiểm tra kết quả'}
                        </button>
                      )}
                      {onResetExpired && (
                        <button
                          type="button"
                          className={cn(bx.buttonOutline, 'w-full py-2 text-xs text-muted-foreground hover:text-foreground')}
                          disabled={pending}
                          onClick={onResetExpired}
                        >
                          Tạo phiên mới
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : isDepositExpired && checkout ? (
                <div
                  className="my-2 flex flex-col gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-4"
                  role="status"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Phiên thanh toán đã hết hạn
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Đường dẫn đã hết hiệu lực lúc {formatDeadline(checkout.expiresAt)}. Nếu đã trả tiền, hãy bấm “Kiểm tra kết quả”. Nếu chưa thanh toán, bạn có thể tạo phiên mới.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {onCheckStatus && (
                      <button
                        type="button"
                        className={cn(bx.buttonOutline, 'flex-1 py-2 text-xs')}
                        disabled={pending}
                        onClick={onCheckStatus}
                      >
                        {pending ? 'Đang kiểm tra…' : 'Kiểm tra kết quả'}
                      </button>
                    )}
                    {onResetExpired && (
                      <button
                        type="button"
                        className={cn(bx.button, 'flex-1 py-2 text-xs')}
                        disabled={pending}
                        onClick={onResetExpired}
                      >
                        Tạo phiên mới
                      </button>
                    )}
                  </div>
                </div>
              ) : inFlight ? (
                <div
                  className="my-2 flex flex-col gap-2.5 rounded-xl border border-amber-300 bg-amber-50/80 p-4"
                  role="status"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                    Đang đối soát với VNPay
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900">
                    Hệ thống đang kiểm tra kết quả giao dịch. Vui lòng bấm kiểm tra trạng thái để nhận kết quả mới nhất.
                  </p>
                  {onCheckStatus && (
                    <button
                      type="button"
                      className={cn(bx.buttonOutline, 'self-start bg-white py-2 text-xs hover:bg-amber-50')}
                      disabled={pending}
                      onClick={onCheckStatus}
                    >
                      {pending ? 'Đang kiểm tra…' : 'Kiểm tra trạng thái'}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  className={bx.button}
                  type="button"
                  disabled={
                    blocked || context.timelineRevisionId === null || context.contractRequired
                  }
                  onClick={onStartDeposit}
                >
                  {pending ? 'Đang kết nối cổng VNPay…' : 'Tiếp tục thanh toán'}
                </button>
              )
            ) : (
              <p>Hồ sơ đã qua bước đặt cọc hoặc không còn nhận cọc.</p>
            )}
          </>
        )}
        {context.timelineRevisionId === null && (
          <p className={bx.note}>
            Cần có kịch bản được nhà hàng và hai bạn duyệt trước khi đặt cọc.
          </p>
        )}
        {context.contractRequired && (
          <p className={bx.note}>Cần hợp đồng được cả hai bên duyệt trước khi đặt cọc.</p>
        )}
        {context.contract ? (
          <button
            type="button"
            className="self-start text-left font-semibold text-primary underline-offset-4 hover:underline"
            onClick={() => setViewingPdf(context.contract?.revisionId ?? null)}
          >
            Xem hợp đồng và thỏa thuận
          </button>
        ) : (
          <Link href={`/khong-gian/thoa-thuan/hop-dong?bookingId=${context.bookingId}`}>
            Xem hợp đồng và thỏa thuận
          </Link>
        )}
        {context.contract && viewingPdf === context.contract.revisionId ? (
          <ContractPdfViewer
            key={context.bookingId + ':' + context.contract.revisionId}
            bookingId={context.bookingId}
            revisionId={context.contract.revisionId}
            revisionNumber={context.depositDetails?.approvedContract?.revisionNumber}
            onClose={() => setViewingPdf(null)}
          />
        ) : null}
        <p className={bx.note}>
          Khoản cọc được ghi nhận chung cho tiệc và khấu trừ vào tổng số tiền phải thanh toán; không
          phải khoản thu thêm cho từng hạng mục.
        </p>
        <details className={bx.conditions}>
          <summary>Hạn thanh toán và điều kiện hoàn/hủy cọc</summary>
          {terms ? (
            <div className="flex flex-col gap-3 pt-3 text-sm">
              <dl className="grid gap-2">
                <div>
                  <dt className="font-semibold">Thời hạn giữ sảnh</dt>
                  <dd>
                    {terms.holdExpiresAt
                      ? formatDeadline(terms.holdExpiresAt) + ' (giờ Việt Nam)'
                      : context.phase === 'CONFIRMED' || context.phase === 'COMPLETED'
                        ? 'Tiệc đã được xác nhận; không còn chờ đặt cọc để giữ sảnh.'
                        : 'Chưa có thời hạn giữ sảnh đang hiệu lực. Hệ thống kiểm tra lại tình trạng sảnh khi tạo giao dịch.'}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Mốc đóng hủy tiệc</dt>
                  <dd>{formatDeadline(terms.cancellationClosesAt)} (giờ Việt Nam)</dd>
                </div>
              </dl>
              {terms.paymentPending ? (
                <p>
                  Đang có giao dịch cọc được xác minh. Không tạo giao dịch mới hoặc hủy khi kết quả
                  chưa rõ.
                </p>
              ) : null}
              <p>
                Thời hạn giữ sảnh không phải thời hạn của giao dịch VNPay. Thời hạn giao dịch được
                hiển thị khi mở thanh toán; hết hạn giữ sảnh cần kiểm tra lại với nhà hàng.
              </p>
              <p>{terms.cancellationNotice}</p>
              <p>{terms.refundNotice}</p>
            </div>
          ) : (
            <p className="pt-3">
              Chưa nhận được điều kiện cọc từ máy chủ. Vui lòng làm mới hồ sơ hoặc liên hệ nhà hàng
              để xác nhận trước khi thanh toán; không mặc định được hoàn cọc.
            </p>
          )}
        </details>
      </div>
    </section>
  );
}
