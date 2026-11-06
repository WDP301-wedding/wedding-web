'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ContractPdfViewer } from '../commercial-contract/contract-pdf-viewer';
import type { BillingContext } from './billing-api';
import type { CheckoutIntent } from './billing-workspace.helpers';
import { money } from './billing-display';
import { BillingConfirmSection } from './billing-confirm-section';
import { DepositBreakdown } from './deposit-breakdown';
import { bx } from './billing-classes';
import { isEventPast } from '../couple-workspace/workspace-helpers';
import { formatDate } from '../../lib/format-date';

export function BillingDepositSection({
  context,
  blocked,
  inFlight,
  onStartDeposit,
  intent = null,
  pending = false,
  retry = false,
  onConfirm,
  onCancel,
  hasCheckout,
}: Readonly<{
  context: BillingContext;
  blocked: boolean;
  inFlight: boolean;
  onStartDeposit: () => void;
  intent?: CheckoutIntent | null;
  pending?: boolean;
  retry?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  hasCheckout: boolean;
}>) {
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const terms = context.depositTerms;
  const formatDeadline = (value: string) =>
    new Date(value).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  const confirming = intent?.kind === 'deposit' && onConfirm && onCancel;
  const displayContext = intent?.kind === 'deposit' ? (intent.displayContext ?? context) : context;
  const payablePhase = context.phase === 'DRAFT' || context.phase === 'AWAITING_DEPOSIT';
  const isOverdue = payablePhase && isEventPast(context.depositDetails?.proposal?.eventDate);
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
            {hasCheckout ? null : payablePhase ? (
              inFlight ? (
                <div
                  className="my-2 flex flex-col gap-2.5 rounded-xl border border-amber-300 bg-amber-50/80 p-4"
                  role="status"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                    Đang đối soát với VNPay
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900">
                    Hệ thống đang đối soát kết quả với VNPay. Vui lòng kiểm tra trạng thái ở phần
                    bên dưới để nhận kết quả mới nhất.
                  </p>
                </div>
              ) : isOverdue ? (
                <div
                  className="my-2 flex flex-col gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
                  role="alert"
                >
                  <div className="font-semibold">Hồ sơ đã quá ngày tổ chức dự kiến</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ngày tổ chức dự kiến (
                    {formatDate(context.depositDetails?.proposal?.eventDate ?? '')}) đã qua nên cổng
                    thanh toán đặt cọc trực tuyến không còn nhận giao dịch. Hai bạn vui lòng liên hệ
                    nhà hàng để được hỗ trợ.
                  </p>
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
