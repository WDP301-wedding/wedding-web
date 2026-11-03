'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  InvitationGateway,
  DesignView,
  PrintOrderView,
  PrintRequestQuote,
  PrintRequestView,
} from './invitation-api';
import { getOrGenerateKey, invitationErrorMessage } from './invitation-studio-utils';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { browserSession } from '../identity-access/browser-session';
import { notify } from '../../design-system/toast';
import type { ConfirmOptions } from '../../design-system/confirm-dialog';
import { useLegacyPrintActions } from './use-legacy-print-actions';

export interface UseInvitationPrintOptions {
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
  designs: readonly DesignView[];
  editingDesign?: Readonly<{ designId: string; dirty: boolean }>;
  initialOrders?: readonly PrintOrderView[] | undefined;
  printVisited: boolean;
  writing: boolean;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export function useInvitationPrint({
  bookingId,
  accessToken,
  gateway,
  designs,
  editingDesign,
  initialOrders,
  printVisited,
  writing,
  confirm,
}: UseInvitationPrintOptions) {
  const [orders, setOrders] = useState<readonly PrintOrderView[] | null>(initialOrders ?? null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [printRequests, setPrintRequests] = useState<readonly PrintRequestView[] | null>(null);
  const [printSelections, setSelections] = useState<Readonly<Record<string, number>>>({});
  const [quoteState, setQuote] = useState<{ quote: PrintRequestQuote; signature: string } | null>(
    null,
  );
  const [printError, setPrintError] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const commandBusy = useRef(false);
  const previewEpoch = useRef(0);
  const previewKey = useRef<{ signature: string; key: string } | null>(null);
  const confirmKey = useRef<{ signature: string; key: string } | null>(null);
  const withdrawKey = useRef<{ signature: string; key: string } | null>(null);
  const selectedPrintLines = designs
    .filter((design) => printSelections[design.designId] !== undefined)
    .map((design) => ({
      designId: design.designId,
      designRevisionId: design.revisionId,
      quantity: printSelections[design.designId]!,
    }))
    .sort((a, b) => a.designId.localeCompare(b.designId));
  const signature = JSON.stringify(selectedPrintLines);
  const unsavedSelection = Boolean(
    editingDesign?.dirty &&
    selectedPrintLines.some((line) => line.designId === editingDesign.designId),
  );
  const currentSignature = useRef(signature);
  useEffect(() => {
    currentSignature.current = signature;
  }, [signature]);
  useEffect(
    () => () => {
      previewEpoch.current++;
    },
    [],
  );
  const printQuote =
    !unsavedSelection && quoteState?.signature === signature ? quoteState.quote : null;

  function setPrintSelection(designId: string, quantity: number | null) {
    previewEpoch.current++;
    setQuote(null);
    setPrintError(null);
    setSelections((previous) => {
      const next = { ...previous };
      if (quantity === null) delete next[designId];
      else next[designId] = quantity;
      return next;
    });
  }

  async function handlePreviewPrint() {
    if (commandBusy.current || writing) return;
    if (unsavedSelection) {
      setPrintError(
        'Mẫu đang chỉnh sửa chưa được lưu. Hãy lưu ở mục Nội dung thiệp rồi xem lại bản in.',
      );
      return;
    }
    if (
      !selectedPrintLines.length ||
      selectedPrintLines.length > 20 ||
      selectedPrintLines.some(
        (line) => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000,
      )
    ) {
      setPrintError('Chọn từ 1–20 mẫu đã lưu, mỗi mẫu từ 1–10.000 thiệp.');
      return;
    }
    commandBusy.current = true;
    setIsOrdering(true);
    setQuote(null);
    setPrintError(null);
    const epoch = ++previewEpoch.current;
    const key = getOrGenerateKey(previewKey, signature, 'preview-print-request');
    try {
      const quote = await gateway.previewPrintRequest(
        accessToken,
        bookingId,
        selectedPrintLines,
        key,
      );
      if (previewEpoch.current === epoch && currentSignature.current === signature) {
        setQuote({ quote, signature });
        previewKey.current = null;
      }
    } catch (error) {
      if (previewEpoch.current === epoch)
        setPrintError(invitationErrorMessage(error, 'Không thể xem trước chi phí in.'));
    } finally {
      commandBusy.current = false;
      setIsOrdering(false);
    }
  }

  async function handleConfirmPrint() {
    if (!printQuote || commandBusy.current || writing) return;
    if (Date.parse(printQuote.expiresAt) <= Date.now()) {
      setQuote(null);
      setPrintError('Bản xem trước đã hết hạn. Vui lòng xem lại nội dung và chi phí.');
      return;
    }
    commandBusy.current = true;
    setIsOrdering(true);
    const epoch = previewEpoch.current;
    try {
      const agreed = await confirm({
        title: 'Xác nhận đặt in và chi phí',
        description:
          'Bạn đồng ý với ' +
          printQuote.document.lines.length +
          ' mẫu in và tổng chi phí ' +
          printQuote.document.totalVnd.toLocaleString('vi-VN') +
          ' đ vừa hiển thị. Phụ lục ghi nhận sự đồng ý này; đơn in chỉ được tạo sau khi nhà hàng duyệt cùng phiên bản.',
        confirmLabel: 'Xác nhận đặt in và chi phí',
      });
      if (!agreed || previewEpoch.current !== epoch || currentSignature.current !== signature)
        return;
      const key = getOrGenerateKey(
        confirmKey,
        printQuote.quoteId + ':' + printQuote.digest,
        'confirm-print-request',
      );
      const request = await gateway.confirmPrintRequest(
        accessToken,
        bookingId,
        { quoteId: printQuote.quoteId, digest: printQuote.digest, consent: true },
        key,
      );
      setPrintRequests((previous) => [
        request,
        ...(previous ?? []).filter((item) => item.requestId !== request.requestId),
      ]);
      confirmKey.current = null;
      setQuote(null);
      setSelections({});
      setPrintError(null);
      notify.success('Đã xác nhận chi phí trên phụ lục. Chờ nhà hàng duyệt để tạo đơn in.');
    } catch (error) {
      setPrintError(invitationErrorMessage(error, 'Không thể xác nhận yêu cầu in.'));
    } finally {
      commandBusy.current = false;
      setIsOrdering(false);
    }
  }

  async function handleWithdrawPrint(request: PrintRequestView) {
    if (commandBusy.current || writing || request.state !== 'AWAITING_APPROVAL') return;
    commandBusy.current = true;
    setIsOrdering(true);
    try {
      const agreed = await confirm({
        title: 'Rút yêu cầu in?',
        description:
          'Phụ lục chờ duyệt sẽ được rút cùng yêu cầu in. Bạn có thể chọn lại mẫu và số lượng sau đó.',
        confirmLabel: 'Rút yêu cầu in',
        tone: 'danger',
      });
      if (!agreed) return;
      const key = getOrGenerateKey(
        withdrawKey,
        request.requestId + ':' + request.bookingRevision,
        'withdraw-print-request',
      );
      const updated = await gateway.withdrawPrintRequest(
        accessToken,
        bookingId,
        request.requestId,
        request.bookingRevision,
        key,
      );
      setPrintRequests((previous) =>
        (previous ?? []).map((item) => (item.requestId === request.requestId ? updated : item)),
      );
      withdrawKey.current = null;
      notify.success('Đã rút yêu cầu in và phụ lục chờ duyệt.');
    } catch (error) {
      setPrintError(invitationErrorMessage(error, 'Không thể rút yêu cầu in.'));
    } finally {
      commandBusy.current = false;
      setIsOrdering(false);
    }
  }

  const printLive = useLiveRefresh(
    async (isCurrent) => {
      try {
        const [loaded, requests] = await browserSession.authorize((token) =>
          Promise.all([
            gateway.listPrintOrders(token, bookingId),
            gateway.listPrintRequests(token, bookingId),
          ]),
        );
        if (!isCurrent()) return;
        setOrders(loaded);
        setPrintRequests(requests);
        setOrdersError(null);
      } catch (error) {
        if (isCurrent())
          setOrdersError(invitationErrorMessage(error, 'Không thể cập nhật yêu cầu và đơn in.'));
      }
    },
    {
      scope: bookingId + ':print',
      bookingId,
      enabled: printVisited,
      blocked: writing || isOrdering,
      invalidateOnBlock: true,
      initial: true,
      types: ['print_order.updated', 'contract.updated', 'booking.updated', 'billing.updated'],
    },
  );

  const legacy = useLegacyPrintActions({
    accessToken,
    bookingId,
    gateway,
    orders,
    setOrders,
    confirm,
  });
  return {
    orders,
    ordersError,
    printRequests,
    printSelections,
    selectedPrintLines,
    setPrintSelection,
    printQuote,
    printError,
    isOrdering,
    handlePreviewPrint,
    handleConfirmPrint,
    handleWithdrawPrint,
    printLive,
    printPreviewContext: { bookingId, accessToken, gateway },
    ...legacy,
  };
}
