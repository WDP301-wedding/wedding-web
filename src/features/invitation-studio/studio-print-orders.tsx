'use client';

import type { InvitationStudioState } from './use-invitation-studio';
import { orderStatusMap } from './invitation-studio-utils';
import { ix } from './studio-classes';
import { px } from './studio-panel-classes';

export function StudioPrintOrders({
  studio,
  onlyOrderId,
  excludeOrderIds,
}: Readonly<{
  studio: InvitationStudioState;
  onlyOrderId?: string;
  excludeOrderIds?: ReadonlySet<string>;
}>) {
  const {
    orders: allOrders,
    ordersError,
    approvingOrderId,
    cancellingOrderId,
    handleApproveQuote,
    handleCancelOrder,
  } = studio;
  const orders =
    allOrders?.filter((order) =>
      onlyOrderId ? order.orderId === onlyOrderId : !excludeOrderIds?.has(order.orderId),
    ) ?? null;
  if (onlyOrderId && !orders?.length) return null;
  return (
    <section
      className={onlyOrderId ? ix.stack : ix.card}
      aria-label={onlyOrderId ? 'Đơn in liên kết' : 'Đơn in của hai bạn'}
    >
      {!onlyOrderId && <h3 className={ix.subtitle}>Các đơn in khác</h3>}
      {orders === null ? (
        ordersError ? (
          <p role="alert">{ordersError}</p>
        ) : (
          <p role="status">Đang tải đơn in…</p>
        )
      ) : orders.length === 0 ? (
        <p className={ix.empty}>Chưa có đơn in thiệp nào.</p>
      ) : (
        <div className={px.orders}>
          {orders.map((order) => (
            <article key={order.orderId} className={px.order}>
              <div className={px.orderHead}>
                <span className={px.orderId}>Đơn hàng #{order.orderId.slice(0, 8)}</span>
                <span className={orderStatusMap[order.status]?.className ?? ix.chip}>
                  {orderStatusMap[order.status]?.label ?? order.status}
                </span>
              </div>
              <p className={px.orderBrief}>
                {order.lines.reduce((sum, line) => sum + line.quantity, 0)} thiệp ·{' '}
                {order.lines.length} mẫu
                <strong>
                  {order.currentCommercialRevision
                    ? order.currentCommercialRevision.orderTotalVnd.toLocaleString('vi-VN') + ' đ'
                    : 'Chưa có báo giá'}
                </strong>
              </p>
              <details className={ix.disclosure}>
                <summary>Chi tiết số lượng và chi phí</summary>
                {order.currentCommercialRevision?.lines.map((line) => (
                  <p key={line.lineId}>
                    {studio.designs.find((design) => design.designId === line.designId)?.title ??
                      'Mẫu thiệp'}
                    : {line.quantity} thiệp × {line.unitPriceVnd.toLocaleString('vi-VN')} đ ={' '}
                    {line.lineTotalVnd.toLocaleString('vi-VN')} đ
                  </p>
                ))}
              </details>
              {/* Historical quotations remain operable without entering the new appendix flow. */}
              <div className={ix.actions}>
                {!studio.locked && order.status === 'QUOTED' && order.currentCommercialRevision ? (
                  <button
                    type="button"
                    className={ix.btn}
                    disabled={
                      approvingOrderId === order.orderId || cancellingOrderId === order.orderId
                    }
                    onClick={() => void handleApproveQuote(order)}
                  >
                    {approvingOrderId === order.orderId ? 'Đang duyệt...' : 'Duyệt báo giá'}
                  </button>
                ) : null}
                {!studio.locked && ['REQUESTED', 'QUOTED'].includes(order.status) ? (
                  <button
                    type="button"
                    className={ix.btnDanger}
                    disabled={
                      approvingOrderId === order.orderId || cancellingOrderId === order.orderId
                    }
                    onClick={() => void handleCancelOrder(order)}
                  >
                    {cancellingOrderId === order.orderId ? 'Đang hủy...' : 'Hủy đơn'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
