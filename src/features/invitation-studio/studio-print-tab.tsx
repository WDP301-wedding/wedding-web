'use client';

import React from 'react';
import { PrintPurchaseForm } from './print-purchase-form';
import { InlineError } from '../../design-system/inline-error';
import { orderStatusMap } from './invitation-studio-utils';
import type { InvitationStudioState } from './use-invitation-studio';
import { px } from './studio-panel-classes';
import { ix } from './studio-classes';

export type StudioPrintTabProps = Readonly<{
  studio: InvitationStudioState;
}>;

export function StudioPrintTab({ studio }: StudioPrintTabProps) {
  const {
    printSourcesError,
    printLive,
    sourcesReady,
    handleRequestPrint,
    printSources,
    printSourceIndex,
    setPrintSourceIndex,
    printQuantity,
    setPrintQuantity,
    isOrdering,
    orders,
    ordersError,
    approvingOrderId,
    cancellingOrderId,
    handleApproveQuote,
    handleCancelOrder,
  } = studio;

  return (
    <section aria-label="Đặt in thiệp và theo dõi đơn" className={ix.stackSplit}>
      <div className={ix.form}>
        <PrintPurchaseForm studio={studio} />
        {(printSources.length > 0 || studio.purchase.availability?.legacy) &&
        studio.purchase.availability?.blockReason !== 'BOOKING_CLOSED' ? (
          <div className={ix.card}>
            <h2 id="print-heading" className={ix.title}>
              {studio.purchase.availability?.legacy
                ? 'Yêu cầu in theo báo giá'
                : 'In phần đã có trong hợp đồng cũ'}
            </h2>
            <p className={ix.hint}>
              {studio.purchase.availability?.legacy
                ? 'Chọn số lượng và gửi yêu cầu để nhà hàng báo giá. Bạn xem và duyệt báo giá trước khi in.'
                : 'Chọn phần in đã có trong hợp đồng và số lượng còn được in. Không thu lại khoản đã ghi nhận.'}
            </p>
            <InlineError error={printSourcesError} onRetry={() => void printLive.refresh()} />
            {!sourcesReady && !printSourcesError ? (
              <p role="status">Đang tải lựa chọn in theo hợp đồng…</p>
            ) : null}
            <form
              onSubmit={(e) => {
                void handleRequestPrint(e);
              }}
              className={ix.form}
            >
              {printSources.length > 0 ? (
                <div>
                  <label htmlFor="print-source" className={ix.label}>
                    Mẫu in theo hợp đồng
                  </label>
                  <select
                    id="print-source"
                    value={printSourceIndex}
                    onChange={(e) => {
                      const index = Number(e.target.value);
                      setPrintSourceIndex(index);
                      setPrintQuantity(printSources[index]?.quantity ?? printQuantity);
                    }}
                    className={ix.input}
                  >
                    {printSources.map((source, index) => (
                      <option key={source.offeringId} value={index}>
                        {source.name} · {source.quantity} bản còn được in theo hợp đồng
                      </option>
                    ))}
                  </select>
                  <p className={ix.meta}>
                    Số bản còn được in theo hợp đồng đã được tính tiền, nhà hàng không thu lại. Muốn
                    in thêm hoặc đổi mẫu, hãy tạo phụ lục hợp đồng.
                  </p>
                </div>
              ) : null}
              <div>
                <div className={px.quantityHead}>
                  <label htmlFor="print-quantity" className={ix.label}>
                    Số lượng (1–10.000 bản)
                  </label>
                  <div className={px.quantityPresets} aria-label="Gợi ý số lượng bản in nhanh">
                    {[50, 100, 150, 200, 300, 500].map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={px.chipButton}
                        data-active={printQuantity === num}
                        onClick={() => setPrintQuantity(num)}
                      >
                        {num} bản
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  id="print-quantity"
                  type="number"
                  min={1}
                  max={10000}
                  value={printQuantity}
                  onChange={(e) => setPrintQuantity(Number(e.target.value))}
                  required
                  className={ix.input}
                />
              </div>
              <button
                type="submit"
                disabled={isOrdering || !sourcesReady || printSourcesError !== null}
                className={ix.btn}
              >
                {isOrdering ? 'Đang gửi...' : 'Gửi yêu cầu in'}
              </button>
            </form>
          </div>
        ) : null}
      </div>
      {/* Orders List */}
      <div className={ix.card}>
        <h3 className={ix.subtitle}>Đơn in của hai bạn</h3>
        {orders === null ? (
          ordersError ? (
            <p role="alert">{ordersError}</p>
          ) : (
            <p className={ix.empty} role="status">
              Đang tải đơn in…
            </p>
          )
        ) : orders.length === 0 ? (
          <p className={ix.empty}>Chưa có đơn in thiệp nào.</p>
        ) : (
          <div className={px.orders}>
            {orders.map((order) => (
              <div key={order.orderId} className={px.order}>
                <div className={px.orderHead}>
                  <span className={px.orderId}>Đơn hàng #{order.orderId.slice(0, 8)}</span>
                  <span className={orderStatusMap[order.status]?.className ?? ix.chip}>
                    {order.purchase && order.status === 'REQUESTED'
                      ? 'Chờ nhà hàng duyệt đơn và phụ lục'
                      : (orderStatusMap[order.status]?.label ?? order.status)}
                  </span>
                </div>

                <p className={px.orderBrief}>
                  <span>{order.lines.reduce((total, line) => total + line.quantity, 0)} bản</span>
                  <strong>
                    {order.currentCommercialRevision
                      ? Number(order.currentCommercialRevision.orderTotalVnd).toLocaleString(
                          'vi-VN',
                        ) + ' đ'
                      : 'Chưa có báo giá'}
                  </strong>
                </p>
                <details className={ix.disclosure} open={order.status === 'QUOTED'}>
                  <summary>Tiến trình và chi tiết báo giá</summary>
                  {/* Production Stepper */}
                  <div className={px.orderStepper} aria-label="Tiến trình sản xuất đơn in">
                    {[
                      { key: 'REQUESTED', label: '1. Gửi yêu cầu' },
                      { key: 'QUOTED', label: '2. Đã báo giá' },
                      { key: 'APPROVED', label: '3. Đã duyệt in' },
                      { key: 'IN_PRODUCTION', label: '4. Đang in ấn' },
                      { key: 'READY_FOR_HANDOVER', label: '5. Sẵn sàng bàn giao' },
                      { key: 'HANDED_OVER', label: '6. Đã bàn giao' },
                    ].map((step, idx) => {
                      const orderSteps = [
                        'REQUESTED',
                        'QUOTED',
                        'APPROVED',
                        'IN_PRODUCTION',
                        'READY_FOR_HANDOVER',
                        'HANDED_OVER',
                      ];
                      const currentIdx = orderSteps.indexOf(order.status);
                      const stepIdx = idx;
                      const isPast = currentIdx >= stepIdx;
                      const isCurrent = order.status === step.key;
                      return (
                        <div
                          key={step.key}
                          className={px.orderStep}
                          data-state={isCurrent ? 'current' : isPast ? 'done' : 'todo'}
                        >
                          <span className={px.orderStepBar} aria-hidden="true" />
                          <span>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {order.currentCommercialRevision && (
                    <div className={px.orderSummary}>
                      <p>
                        Tổng tiền:{' '}
                        <strong>
                          {Number(order.currentCommercialRevision.orderTotalVnd).toLocaleString(
                            'vi-VN',
                          )}{' '}
                          VND
                        </strong>
                      </p>
                      {order.lines?.[0]?.quantity ? (
                        <p className={ix.meta}>
                          Số lượng: {order.lines[0].quantity} bản (Ước tính ~
                          {Math.round(
                            Number(order.currentCommercialRevision.orderTotalVnd) /
                              order.lines[0].quantity,
                          ).toLocaleString('vi-VN')}{' '}
                          đ/bản)
                        </p>
                      ) : null}
                      <p className={ix.meta}>
                        Hạn báo giá:{' '}
                        {new Date(order.currentCommercialRevision.expiresAt).toLocaleDateString(
                          'vi-VN',
                        )}
                      </p>
                    </div>
                  )}
                </details>
                {order.purchase ? (
                  <p className={ix.meta}>
                    {order.purchase.cancellationRequested
                      ? 'Đã yêu cầu hủy và giảm phí, đang chờ nhà hàng xác nhận. '
                      : ''}
                    Bạn đã xác nhận chi phí · {order.purchase.material}. Phụ lục được xử lý cùng đơn
                    in, không cần duyệt lại.{' '}
                    {order.status === 'CANCELLED'
                      ? 'Đơn đã hủy; xem phụ lục điều chỉnh nếu đã phát sinh phí.'
                      : ''}
                  </p>
                ) : null}
                <div className={ix.actions}>
                  {order.purchase &&
                  order.status === 'APPROVED' &&
                  !order.purchase.cancellationRequested ? (
                    <button
                      type="button"
                      className={ix.btnDanger}
                      onClick={() => void studio.purchase.requestCancellation(order)}
                    >
                      Yêu cầu hủy và giảm phí trước sản xuất
                    </button>
                  ) : null}

                  {!order.purchase &&
                    order.status === 'QUOTED' &&
                    order.currentCommercialRevision && (
                      <button
                        type="button"
                        disabled={
                          approvingOrderId === order.orderId || cancellingOrderId === order.orderId
                        }
                        onClick={() => {
                          void handleApproveQuote(order);
                        }}
                        className={ix.btn}
                      >
                        {approvingOrderId === order.orderId ? 'Đang duyệt...' : 'Duyệt báo giá'}
                      </button>
                    )}
                  {(order.status === 'REQUESTED' || order.status === 'QUOTED') && (
                    <button
                      type="button"
                      disabled={
                        approvingOrderId === order.orderId || cancellingOrderId === order.orderId
                      }
                      onClick={() => {
                        void handleCancelOrder(order);
                      }}
                      className={ix.btnDanger}
                    >
                      {cancellingOrderId === order.orderId ? 'Đang hủy...' : 'Hủy đơn'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
