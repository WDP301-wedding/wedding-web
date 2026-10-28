'use client';

import React from 'react';
import { InlineError } from '../../design-system/inline-error';
import { orderStatusMap } from './invitation-studio-utils';
import type { InvitationStudioState } from './use-invitation-studio';

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
    <section aria-labelledby="print-heading" className="studio-stack">
      <div className="studio-card">
        <h2 id="print-heading" className="studio-title">
          Đặt In Thiệp Giấy Truyền Thống
        </h2>
        <div className="studio-print-spec-banner">
          <div className="studio-print-spec-icon">✉</div>
          <div className="studio-print-spec-text">
            <strong>Quy cách in ấn tiêu chuẩn:</strong> Giấy mỹ thuật Art Paper cao cấp 300gsm,
            phong bì ép nhũ vàng sang trọng, in 2 mặt sắc nét, kèm thiệp báo hỷ & thiệp mời tiệc.
          </div>
        </div>
        <InlineError error={printSourcesError} onRetry={() => void printLive.refresh()} />
        {!sourcesReady && !printSourcesError ? (
          <p role="status">Đang tải lựa chọn in theo hợp đồng…</p>
        ) : null}
        <form
          onSubmit={(e) => {
            void handleRequestPrint(e);
          }}
          className="studio-form studio-narrow"
        >
          {printSources.length > 0 ? (
            <div>
              <label htmlFor="print-source" className="studio-label">
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
                className="studio-input"
              >
                {printSources.map((source, index) => (
                  <option key={source.offeringId} value={index}>
                    {source.name} · {source.quantity} bản trong hợp đồng
                  </option>
                ))}
              </select>
              <p className="studio-meta">
                Số bản trong hợp đồng đã được tính tiền, nhà hàng không thu lại. Muốn in thêm
                hoặc đổi mẫu, hãy tạo phụ lục hợp đồng.
              </p>
            </div>
          ) : null}
          <div>
            <div className="studio-quantity-head">
              <label htmlFor="print-quantity" className="studio-label">
                Số Lượng Bản In (1 - 10.000 bản)
              </label>
              <div className="studio-quantity-presets" aria-label="Gợi ý số lượng bản in nhanh">
                {[50, 100, 150, 200, 300, 500].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`studio-qty-chip ${printQuantity === num ? 'is-active' : ''}`}
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
              className="studio-input"
            />
          </div>
          <button
            type="submit"
            disabled={isOrdering || !sourcesReady || printSourcesError !== null}
            className="studio-btn"
          >
            {isOrdering ? 'Đang gửi...' : 'Gửi Yêu Cầu Báo Giá In'}
          </button>
        </form>
      </div>

      {/* Orders List */}
      <div className="studio-card">
        <h3 className="studio-subtitle">Lịch Sử & Trạng Thái Đơn In</h3>
        {orders === null ? (
          ordersError ? (
            <p role="alert">{ordersError}</p>
          ) : (
            <p className="studio-empty" role="status">
              Đang tải đơn in…
            </p>
          )
        ) : orders.length === 0 ? (
          <p className="studio-empty">Chưa có đơn in thiệp nào.</p>
        ) : (
          <div className="studio-orders">
            {orders.map((order) => (
              <div key={order.orderId} className="studio-order">
                <div className="studio-order-head">
                  <span className="studio-order-id">Đơn hàng #{order.orderId.slice(0, 8)}</span>
                  <span className={`hy-chip ${orderStatusMap[order.status]?.className ?? ''}`}>
                    {orderStatusMap[order.status]?.label ?? order.status}
                  </span>
                </div>

                {/* Production Stepper */}
                <div className="studio-order-stepper" aria-label="Tiến trình sản xuất đơn in">
                  {[
                    { key: 'REQUESTED', label: '1. Gửi yêu cầu' },
                    { key: 'QUOTED', label: '2. Đã báo giá' },
                    { key: 'APPROVED', label: '3. Đã duyệt in' },
                    { key: 'IN_PRODUCTION', label: '4. Đang in ấn' },
                    { key: 'HANDED_OVER', label: '5. Bàn giao' },
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
                    const stepIdx = idx <= 3 ? idx : 4;
                    const isPast = currentIdx >= stepIdx;
                    const isCurrent =
                      order.status === step.key ||
                      (step.key === 'HANDED_OVER' &&
                        (order.status === 'READY_FOR_HANDOVER' ||
                          order.status === 'HANDED_OVER'));
                    return (
                      <div
                        key={step.key}
                        className={`studio-step-item ${isPast ? 'is-done' : ''} ${isCurrent ? 'is-active' : ''}`}
                      >
                        <span className="studio-step-dot" />
                        <span className="studio-step-label">{step.label}</span>
                      </div>
                    );
                  })}
                </div>

                {order.currentCommercialRevision && (
                  <div className="studio-order-summary">
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
                      <p className="studio-meta">
                        Số lượng: {order.lines[0].quantity} bản (Ước tính ~
                        {Math.round(
                          Number(order.currentCommercialRevision.orderTotalVnd) /
                            order.lines[0].quantity,
                        ).toLocaleString('vi-VN')}{' '}
                        đ/bản)
                      </p>
                    ) : null}
                    <p className="studio-meta">
                      Hạn báo giá:{' '}
                      {new Date(order.currentCommercialRevision.expiresAt).toLocaleDateString(
                        'vi-VN',
                      )}
                    </p>
                  </div>
                )}

                <div className="studio-actions">
                  {order.status === 'QUOTED' && order.currentCommercialRevision && (
                    <button
                      type="button"
                      disabled={
                        approvingOrderId === order.orderId ||
                        cancellingOrderId === order.orderId
                      }
                      onClick={() => {
                        void handleApproveQuote(order);
                      }}
                      className="studio-btn"
                    >
                      {approvingOrderId === order.orderId ? 'Đang duyệt...' : 'Duyệt Báo Giá'}
                    </button>
                  )}
                  {(order.status === 'REQUESTED' || order.status === 'QUOTED') && (
                    <button
                      type="button"
                      disabled={
                        approvingOrderId === order.orderId ||
                        cancellingOrderId === order.orderId
                      }
                      onClick={() => {
                        void handleCancelOrder(order);
                      }}
                      className="studio-btn is-danger-outline"
                    >
                      {cancellingOrderId === order.orderId ? 'Đang hủy...' : 'Hủy Đơn'}
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
