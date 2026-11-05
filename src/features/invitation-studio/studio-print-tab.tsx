'use client';

import { useState } from 'react';
import Link from 'next/link';
import { routes, withBooking } from '../../routes';
import type { InvitationStudioState } from './use-invitation-studio';
import { PrintQuoteReview } from './print-quote-review';
import { PrintRequestDetails } from './print-request-details';
import { StudioPrintOrders } from './studio-print-orders';
import { ix } from './studio-classes';
import { px } from './studio-panel-classes';

export type StudioPrintTabProps = Readonly<{ studio: InvitationStudioState }>;

const requestStates: Record<string, string> = {
  DRAFT: 'Phụ lục đang soạn',
  AWAITING_APPROVAL: 'Chờ nhà hàng duyệt phụ lục',
  APPROVED: 'Phụ lục đã có hiệu lực',
  SUPERSEDED: 'Đã rút hoặc thay thế',
};

export function StudioPrintTab({ studio }: StudioPrintTabProps) {
  const {
    designs,
    printSelections,
    setPrintSelection,
    selectedPrintLines,
    printQuote,
    printRequests,
    printError,
    isOrdering,
    writing,
    printPreviewContext,
    ordersError,
  } = studio;
  const pending =
    printRequests?.some(
      (request) => request.state === 'DRAFT' || request.state === 'AWAITING_APPROVAL',
    ) ?? false;
  const [selectedMode, setSelectedMode] = useState<'create' | 'track' | null>(null);
  const mode = studio.locked ? 'track' : (selectedMode ?? (pending ? 'track' : 'create'));
  const linkedIds = new Set(
    printRequests?.flatMap((request) => (request.orderId ? [request.orderId] : [])),
  );
  return (
    <section className={ix.stack} aria-label="Đặt in thiệp">
      {!studio.locked && (
        <div className={ix.actions} role="group" aria-label="Thao tác in thiệp">
          <button
            type="button"
            aria-pressed={mode === 'create'}
            className={mode === 'create' ? ix.btnSmall : ix.btnSmallOutline}
            disabled={isOrdering || writing}
            onClick={() => setSelectedMode('create')}
          >
            Tạo yêu cầu in
          </button>
          <button
            type="button"
            aria-pressed={mode === 'track'}
            className={mode === 'track' ? ix.btnSmall : ix.btnSmallOutline}
            disabled={isOrdering || writing}
            onClick={() => setSelectedMode('track')}
          >
            Theo dõi in{pending ? ' · Chờ duyệt' : ''}
          </button>
        </div>
      )}
      {ordersError && (
        <div className={ix.calloutWarning} role="alert">
          <p>{ordersError}</p>
          <button
            type="button"
            className={ix.btnSmallOutline}
            disabled={writing}
            onClick={() => void studio.printLive.refresh()}
          >
            Tải lại thông tin in
          </button>
        </div>
      )}
      {mode === 'create' && (
        <section className={ix.card}>
          <h2 id="print-heading" className={ix.title}>
            Yêu cầu in thiệp
          </h2>
          <p className={ix.hint}>
            Chọn mẫu đã lưu và số lượng. Hệ thống sẽ tính chi phí và tạo bản in để bạn kiểm tra.
          </p>
          {!designs.length ? (
            <div className={ix.actions}>
              <p className={ix.hint}>Lưu ít nhất một mẫu trong Thiết kế trước khi đặt in.</p>
              <button
                type="button"
                className={ix.btnSmallOutline}
                onClick={() => studio.selectTab('design')}
              >
                Về thiết kế
              </button>
            </div>
          ) : null}
          {!printQuote && designs.length > 0 && (
            <form
              className={ix.form}
              onSubmit={(event) => {
                event.preventDefault();
                void studio.handlePreviewPrint();
              }}
            >
              <fieldset disabled={isOrdering || writing} className={ix.stack}>
                <legend className={ix.label}>Các mẫu cần in (tối đa 20 mẫu)</legend>
                {designs.map((design) => {
                  const selected = printSelections[design.designId] !== undefined;
                  return (
                    <div key={design.designId} className={px.order}>
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!selected && selectedPrintLines.length >= 20}
                          onChange={(event) =>
                            setPrintSelection(design.designId, event.target.checked ? 100 : null)
                          }
                        />
                        {design.title}
                      </label>
                      <p className={ix.meta}>Bản lưu {design.revisionNumber}</p>
                      {selected ? (
                        <div>
                          <label htmlFor={'quantity-' + design.designId} className={ix.label}>
                            Số lượng {design.title}
                          </label>
                          <input
                            id={'quantity-' + design.designId}
                            type="number"
                            required
                            min={1}
                            max={10000}
                            step={1}
                            value={printSelections[design.designId]}
                            className={ix.input}
                            onChange={(event) =>
                              setPrintSelection(design.designId, Number(event.target.value))
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </fieldset>
              {studio.unsavedSelection && (
                <p role="status" className={ix.hintWarning}>
                  Mẫu đang chỉnh có thay đổi chưa lưu. Quay lại Thiết kế để lưu trước khi lấy báo
                  giá.
                </p>
              )}
              {printRequests === null && (
                <p role="status" className={ix.hint}>
                  {ordersError
                    ? 'Cần tải lại thông tin in để tiếp tục.'
                    : 'Đang kiểm tra yêu cầu in hiện có…'}
                </p>
              )}
              {pending ? (
                <p role="status" className={ix.hintWarning}>
                  Đang có phụ lục in chờ duyệt. Hoàn tất hoặc rút yêu cầu đó trước khi gửi yêu cầu
                  mới.
                </p>
              ) : null}
              <button
                type="submit"
                className={ix.btn}
                disabled={
                  isOrdering ||
                  writing ||
                  !selectedPrintLines.length ||
                  pending ||
                  studio.unsavedSelection ||
                  printRequests === null
                }
              >
                {isOrdering ? 'Đang xử lý…' : 'Xem bản in và chi phí'}
              </button>
            </form>
          )}
          {printError ? (
            <p role="alert" className={ix.hintWarning}>
              {printError}
            </p>
          ) : null}
          {printQuote ? (
            <PrintQuoteReview
              key={printQuote.quoteId}
              quote={printQuote}
              {...printPreviewContext}
              busy={isOrdering || writing}
              onBack={studio.dismissPrintQuote}
              onConfirm={async () => {
                if (await studio.handleConfirmPrint()) setSelectedMode('track');
              }}
            />
          ) : null}
        </section>
      )}
      {mode === 'track' && (
        <section className={ix.card} aria-labelledby="print-requests-heading">
          <h3 id="print-requests-heading" className={ix.subtitle}>
            Yêu cầu in và phụ lục
          </h3>
          {printError ? <p role="alert">{printError}</p> : null}
          {printRequests === null ? (
            <p role="status">Đang tải yêu cầu in…</p>
          ) : !printRequests.length ? (
            <p className={ix.empty}>Chưa có yêu cầu in nào.</p>
          ) : (
            <div className={px.orders}>
              {printRequests.map((request) => (
                <article key={request.requestId} className={px.order}>
                  <div className={px.orderHead}>
                    <h4 className={ix.subtitleSm}>
                      {request.document.lines.map((line) => line.title).join(', ')}
                    </h4>
                    <span className={request.state === 'APPROVED' ? ix.chipSuccess : ix.chipMuted}>
                      {requestStates[request.state]}
                    </span>
                  </div>
                  <p className={px.orderBrief}>
                    {request.document.lines.length} mẫu trong xác nhận ban đầu
                    <strong>{request.document.totalVnd.toLocaleString('vi-VN')} đ</strong>
                  </p>
                  {request.state === 'AWAITING_APPROVAL' && !request.orderId ? (
                    <p className={ix.meta}>
                      Bạn đã đồng ý nội dung và chi phí. Chưa tạo đơn in; chờ nhà hàng duyệt phụ
                      lục.
                    </p>
                  ) : null}
                  <Link href={withBooking(routes.addendum, studio.bookingId)} className={ix.link}>
                    Xem phụ lục
                  </Link>
                  <PrintRequestDetails request={request} {...printPreviewContext} />
                  {request.orderId && (
                    <StudioPrintOrders studio={studio} onlyOrderId={request.orderId} />
                  )}
                  {!studio.locked && request.state === 'AWAITING_APPROVAL' && !request.orderId ? (
                    <button
                      type="button"
                      className={ix.btnDanger}
                      disabled={isOrdering || writing}
                      onClick={() => void studio.handleWithdrawPrint(request)}
                    >
                      Rút yêu cầu in
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {mode === 'track' &&
        (studio.orders === null ||
          studio.orders.some((order) => !linkedIds.has(order.orderId))) && (
          <StudioPrintOrders studio={studio} excludeOrderIds={linkedIds} />
        )}
    </section>
  );
}
