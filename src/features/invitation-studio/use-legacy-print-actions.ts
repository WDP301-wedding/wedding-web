'use client';

import { useRef, useState } from 'react';
import type { InvitationGateway, PrintOrderView } from './invitation-api';
import type { ConfirmOptions } from '../../design-system/confirm-dialog';
import { notify } from '../../design-system/toast';
import { getOrGenerateKey, invitationErrorMessage } from './invitation-studio-utils';

/** Compatibility actions for historical quotations only; appendix orders never use them. */
export function useLegacyPrintActions({
  accessToken,
  bookingId,
  gateway,
  orders,
  setOrders,
  confirm,
}: {
  accessToken: string;
  bookingId: string;
  gateway: InvitationGateway;
  orders: readonly PrintOrderView[] | null;
  setOrders: React.Dispatch<React.SetStateAction<readonly PrintOrderView[] | null>>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}) {
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const approveKey = useRef<{ signature: string; key: string } | null>(null);
  const cancelKey = useRef<{ signature: string; key: string } | null>(null);
  async function handleApproveQuote(order: PrintOrderView) {
    if (
      !order.currentCommercialRevision ||
      approvingOrderId ||
      cancellingOrderId ||
      order.status !== 'QUOTED'
    )
      return;
    const agreed = await confirm({
      title: 'Duyệt báo giá in thiệp?',
      description: `Đồng ý báo giá lịch sử ${order.currentCommercialRevision.orderTotalVnd.toLocaleString('vi-VN')} đ.`,
      confirmLabel: 'Duyệt báo giá',
    });
    if (!agreed) return;
    setApprovingOrderId(order.orderId);
    try {
      const updated = await gateway.approvePrintOrder(
        accessToken,
        bookingId,
        order.orderId,
        order.currentCommercialRevision.commercialRevisionId,
        order.revision,
        getOrGenerateKey(approveKey, `${order.orderId}:${order.revision}`, 'approve-print-order'),
      );
      setOrders((orders ?? []).map((item) => (item.orderId === order.orderId ? updated : item)));
      approveKey.current = null;
      notify.success('Đã duyệt báo giá in thiệp thành công! Đơn hàng bắt đầu sản xuất.');
    } catch (error) {
      notify.error(invitationErrorMessage(error, 'Không thể duyệt báo giá.'));
    } finally {
      setApprovingOrderId(null);
    }
  }
  async function handleCancelOrder(order: PrintOrderView) {
    if (approvingOrderId || cancellingOrderId || !['REQUESTED', 'QUOTED'].includes(order.status))
      return;
    const agreed = await confirm({
      title: 'Huỷ đơn in thiệp?',
      description: 'Đơn in thiệp lịch sử này sẽ bị huỷ.',
      confirmLabel: 'Huỷ đơn in',
      tone: 'danger',
    });
    if (!agreed) return;
    setCancellingOrderId(order.orderId);
    try {
      await gateway.cancelPrintOrder(
        accessToken,
        bookingId,
        order.orderId,
        order.revision,
        'Khách hàng yêu cầu hủy đơn in',
        getOrGenerateKey(cancelKey, `${order.orderId}:${order.revision}`, 'cancel-print-order'),
      );
      setOrders(await gateway.listPrintOrders(accessToken, bookingId));
      cancelKey.current = null;
      notify.success('Đã hủy đơn in thiệp thành công.');
    } catch (error) {
      notify.error(invitationErrorMessage(error, 'Không thể hủy đơn in.'));
    } finally {
      setCancellingOrderId(null);
    }
  }
  return { approvingOrderId, cancellingOrderId, handleApproveQuote, handleCancelOrder };
}
