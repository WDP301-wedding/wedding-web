'use client';

import { useRef, useState } from 'react';
import type {
  InvitationGateway,
  DesignView,
  PrintOrderView,
  ContractedPrintSource,
} from './invitation-api';
import { getOrGenerateKey, invitationErrorMessage } from './invitation-studio-utils';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { browserSession } from '../identity-access/browser-session';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { notify } from '../../design-system/toast';
import type { ConfirmOptions } from '../../design-system/confirm-dialog';

export interface UseInvitationPrintOptions {
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
  currentDesign?: DesignView | undefined;
  initialOrders?: readonly PrintOrderView[] | undefined;
  printVisited: boolean;
  writing: boolean;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export function useInvitationPrint({
  bookingId,
  accessToken,
  gateway,
  currentDesign,
  initialOrders,
  printVisited,
  writing,
  confirm,
}: UseInvitationPrintOptions) {
  const [orders, setOrders] = useState<readonly PrintOrderView[] | null>(initialOrders ?? null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [printQuantity, setPrintQuantity] = useState(100);
  const [isOrdering, setIsOrdering] = useState(false);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const [printSources, setPrintSources] = useState<readonly ContractedPrintSource[]>([]);
  const [printSourcesError, setPrintSourcesError] = useState<FriendlyError | null>(null);
  const [sourcesReady, setSourcesReady] = useState(
    () => gateway.contractedPrintSources === undefined,
  );
  const [printSourceIndex, setPrintSourceIndex] = useState(0);
  const printSourcesLoaded = useRef(false);
  const selectedPrintSource = printSources[printSourceIndex];

  const orderKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const approveKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const cancelKeyRef = useRef<{ signature: string; key: string } | null>(null);

  const handleRequestPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcesReady || printSourcesError) return;
    if (!currentDesign) {
      notify.error('Cần lưu thiết kế trước khi đặt in.');
      return;
    }
    setIsOrdering(true);
    const signature = `${currentDesign.designId}:${printQuantity}:${selectedPrintSource?.offeringId ?? ''}`;
    const key = getOrGenerateKey(orderKeyRef, signature, 'request-print-order');
    try {
      const newOrder = await gateway.requestPrintOrder(
        accessToken,
        bookingId,
        [
          {
            designId: currentDesign.designId,
            quantity: printQuantity,
            ...(selectedPrintSource
              ? {
                  commercialSource: {
                    agreementRevisionId: selectedPrintSource.agreementRevisionId,
                    offeringId: selectedPrintSource.offeringId,
                    sourceRevisionId: selectedPrintSource.sourceRevisionId,
                  },
                }
              : {}),
          },
        ],
        key,
      );
      setOrders([newOrder, ...(orders ?? [])]);
      orderKeyRef.current = null;
      notify.success('Đã gửi yêu cầu in thiệp giấy! Quản lý sẽ sớm báo giá.');
    } catch (err: unknown) {
      notify.error(invitationErrorMessage(err, 'Không thể đặt in.'));
    } finally {
      setIsOrdering(false);
    }
  };

  const handleApproveQuote = async (order: PrintOrderView) => {
    if (!order.currentCommercialRevision || approvingOrderId || cancellingOrderId) return;
    const total = Number(order.currentCommercialRevision.orderTotalVnd).toLocaleString('vi-VN');
    const agreed = await confirm({
      title: 'Duyệt báo giá in thiệp?',
      description: `Hai bạn đồng ý với báo giá ${total} đ. Sau khi duyệt, nhà hàng sẽ tiến hành in theo báo giá này.`,
      confirmLabel: 'Duyệt báo giá',
    });
    if (!agreed) return;
    setApprovingOrderId(order.orderId);
    const signature = `${order.orderId}:${order.currentCommercialRevision.commercialRevisionId}:${order.revision}`;
    const key = getOrGenerateKey(approveKeyRef, signature, 'approve-print-order');
    try {
      const updated = await gateway.approvePrintOrder(
        accessToken,
        bookingId,
        order.orderId,
        order.currentCommercialRevision.commercialRevisionId,
        order.revision,
        key,
      );
      setOrders((orders ?? []).map((o) => (o.orderId === order.orderId ? updated : o)));
      approveKeyRef.current = null;
      notify.success('Đã duyệt báo giá in thiệp thành công! Đơn hàng bắt đầu sản xuất.');
    } catch (err: unknown) {
      notify.error(invitationErrorMessage(err, 'Không thể duyệt báo giá.'));
    } finally {
      setApprovingOrderId(null);
    }
  };

  const handleCancelOrder = async (order: PrintOrderView) => {
    if (approvingOrderId || cancellingOrderId) return;
    const agreed = await confirm({
      title: 'Huỷ đơn in thiệp?',
      description:
        'Đơn in thiệp này sẽ bị huỷ và không thể khôi phục. Muốn in lại, bạn cần tạo đơn mới.',
      confirmLabel: 'Huỷ đơn in',
      cancelLabel: 'Giữ đơn',
      tone: 'danger',
    });
    if (!agreed) return;
    setCancellingOrderId(order.orderId);
    const signature = `${order.orderId}:${order.revision}`;
    const key = getOrGenerateKey(cancelKeyRef, signature, 'cancel-print-order');
    try {
      await gateway.cancelPrintOrder(
        accessToken,
        bookingId,
        order.orderId,
        order.revision,
        'Khách hàng yêu cầu hủy đơn in',
        key,
      );
      const reloaded = await gateway.listPrintOrders(accessToken, bookingId);
      setOrders(reloaded);
      cancelKeyRef.current = null;
      notify.success('Đã hủy đơn in thiệp thành công.');
    } catch (err: unknown) {
      notify.error(invitationErrorMessage(err, 'Không thể hủy đơn in.'));
    } finally {
      setCancellingOrderId(null);
    }
  };

  const printLive = useLiveRefresh(
    async (isCurrent) => {
      try {
        const loaded = await browserSession.authorize((token) =>
          gateway.listPrintOrders(token, bookingId),
        );
        if (!isCurrent()) return;
        setOrders(loaded);
        setOrdersError(null);
        const loadSources = gateway.contractedPrintSources;
        if (loadSources) {
          try {
            const sources = await browserSession.authorize((token) =>
              loadSources(token, bookingId),
            );
            if (!isCurrent()) return;
            const previous = printSources[printSourceIndex]?.offeringId;
            setPrintSources(sources);
            setPrintSourcesError(null);
            setSourcesReady(true);
            setPrintSourceIndex(
              Math.max(
                0,
                sources.findIndex((source) => source.offeringId === previous),
              ),
            );
            if (!printSourcesLoaded.current && sources[0]) setPrintQuantity(sources[0].quantity);
            printSourcesLoaded.current = true;
          } catch (error) {
            if (isCurrent()) {
              setSourcesReady(false);
              setPrintSourcesError(describeApiError(error));
            }
          }
        }
      } catch (err) {
        if (isCurrent()) setOrdersError(invitationErrorMessage(err, 'Không thể cập nhật đơn in.'));
      }
    },
    {
      scope: bookingId + ':print',
      bookingId,
      enabled: printVisited,
      blocked: writing,
      invalidateOnBlock: true,
      initial: initialOrders === undefined,
      types: ['print_order.updated', 'contract.updated', 'booking.updated', 'billing.updated'],
    },
  );

  return {
    orders,
    ordersError,
    printQuantity,
    setPrintQuantity,
    isOrdering,
    printSources,
    printSourcesError,
    sourcesReady,
    printSourceIndex,
    setPrintSourceIndex,
    selectedPrintSource,
    handleRequestPrint,
    approvingOrderId,
    cancellingOrderId,
    handleApproveQuote,
    handleCancelOrder,
    printLive,
  };
}
