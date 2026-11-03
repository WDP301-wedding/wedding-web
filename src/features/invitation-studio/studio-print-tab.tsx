'use client';

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
  return (
    <section aria-labelledby="print-heading" className={ix.stackSplit}>
      <div className={ix.stack}>
        <section className={ix.card}>
          <h2 id="print-heading" className={ix.title}>
            Yêu cầu in thiệp
          </h2>
          <p className={ix.hint}>
            Chọn một hoặc nhiều mẫu đã lưu, nhập số lượng riêng cho từng mẫu. Giá chung 5.000đ/thiệp
            theo chuẩn in của nhà hàng.
          </p>
          {!designs.length ? (
            <p className={ix.empty}>Lưu ít nhất một mẫu ở mục Nội dung thiệp trước khi đặt in.</p>
          ) : null}
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
            {pending ? (
              <p role="status" className={ix.hintWarning}>
                Đang có phụ lục in chờ duyệt. Hoàn tất hoặc rút yêu cầu đó trước khi gửi yêu cầu
                mới.
              </p>
            ) : null}
            <button
              type="submit"
              className={ix.btn}
              disabled={isOrdering || writing || !selectedPrintLines.length || pending}
            >
              {isOrdering ? 'Đang xử lý…' : 'Xem bản in và chi phí'}
            </button>
          </form>
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
              onConfirm={studio.handleConfirmPrint}
            />
          ) : null}
        </section>
        <section className={ix.card} aria-labelledby="print-requests-heading">
          <h3 id="print-requests-heading" className={ix.subtitle}>
            Yêu cầu in và phụ lục
          </h3>
          {ordersError ? <p role="alert">{ordersError}</p> : null}
          {printRequests === null ? (
            <p role="status">Đang tải yêu cầu in…</p>
          ) : !printRequests.length ? (
            <p className={ix.empty}>Chưa có yêu cầu in nào.</p>
          ) : (
            <div className={px.orders}>
              {printRequests.map((request) => (
                <article key={request.requestId} className={px.order}>
                  <div className={px.orderHead}>
                    <h4 className={ix.subtitleSm}>Yêu cầu #{request.requestId.slice(0, 8)}</h4>
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
                  <PrintRequestDetails request={request} {...printPreviewContext} />
                  {request.state === 'AWAITING_APPROVAL' && !request.orderId ? (
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
      </div>
      <StudioPrintOrders studio={studio} />
    </section>
  );
}
