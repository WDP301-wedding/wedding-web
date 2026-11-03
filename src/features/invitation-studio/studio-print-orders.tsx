'use client';

import type { InvitationStudioState } from './use-invitation-studio';
import { orderStatusMap } from './invitation-studio-utils';
import { ix } from './studio-classes';
import { px } from './studio-panel-classes';

export function StudioPrintOrders({ studio }: Readonly<{ studio: InvitationStudioState }>) {
  const {
    orders,
    ordersError,
    approvingOrderId,
    cancellingOrderId,
    handleApproveQuote,
    handleCancelOrder,
  } = studio;
  return (
    <section className={ix.card} aria-labelledby="approved-print-orders">
      <h3 id="approved-print-orders" className={ix.subtitle}>
        Đơn in của hai bạn
      </h3>
      <p className={ix.hint}>
        Đơn mới chỉ xuất hiện sau khi phụ lục được cả hai bên duyệt. Chi phí lấy từ phụ lục, không
        thu lại khi sản xuất.
      </p>
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
                    Mẫu #{line.designId.slice(0, 8)}: {line.quantity} thiệp ×{' '}
                    {line.unitPriceVnd.toLocaleString('vi-VN')} đ ={' '}
                    {line.lineTotalVnd.toLocaleString('vi-VN')} đ
                  </p>
                ))}
              </details>
              {/* Historical quotations remain operable without entering the new appendix flow. */}
              <div className={ix.actions}>
                {order.status === 'QUOTED' && order.currentCommercialRevision ? (
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
                {['REQUESTED', 'QUOTED'].includes(order.status) ? (
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
