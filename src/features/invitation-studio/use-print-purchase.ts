'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { browserSession } from '../identity-access/browser-session';
import { describeApiError } from '../../lib/api/api-errors';
import { notify } from '../../design-system/toast';
import {
  loadPrintOfferings,
  loadPrintPdf,
  printRequest,
  purchaseOrderSchema,
  purchaseQuoteSchema,
  type PrintPurchaseQuote,
  type PrintOffering,
  type PurchaseOrder,
} from './print-purchase-api';
import type { DesignView } from './invitation-api';
import type { ConfirmOptions } from '../../design-system/confirm-dialog';
export function usePrintPurchase(
  bookingId: string,
  design: DesignView | undefined,
  enabled: boolean,
  dirty: boolean,
  confirm: (options: ConfirmOptions) => Promise<boolean>,
  onOrdered: (order: PurchaseOrder) => void,
) {
  const [availability, setAvailability] = useState<{
    canOrder: boolean;
    legacy: boolean;
    blockReason: string | null;
  } | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null),
    [reload, setReload] = useState(0);
  const accessLive = useLiveRefresh(
    async (isCurrent) => {
      try {
        const value = await browserSession.authorize((token) =>
          printRequest(
            token,
            `/bookings/${bookingId}/print-orders/purchase-options`,
            z.object({
              canOrder: z.boolean(),
              legacy: z.boolean(),
              blockReason: z.string().nullable(),
            }),
          ),
        );
        if (isCurrent()) setAvailability(value);
      } catch (err: unknown) {
        if (isCurrent()) {
          setAvailability(null);
          setCatalogError(describeApiError(err).message);
        }
      }
    },
    {
      scope: bookingId + ':print-purchase',
      bookingId,
      enabled,
      initial: true,
      types: ['print_order.updated', 'contract.updated', 'billing.updated', 'booking.updated'],
    },
  );
  const [offerings, setOfferings] = useState<PrintOffering[]>([]),
    [offeringId, setOfferingId] = useState(''),
    [quantity, setQuantity] = useState(100);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<{
    signature: string;
    value: PrintPurchaseQuote;
    pdfUrl: string;
  } | null>(null);
  const previewKey = useRef<{ signature: string; key: string } | null>(null),
    consentKey = useRef<{ quoteId: string; key: string } | null>(null),
    inFlight = useRef(false);
  const offering = offerings.find((item) => item.offeringId === offeringId);
  const signature = JSON.stringify([
    design?.designId,
    design?.revisionId,
    offering?.offeringId,
    offering?.sourceRevisionId,
    quantity,
  ]);
  const latest = useRef(signature);
  useEffect(() => {
    latest.current = signature;
  }, [signature]);
  const validQuote = !dirty && quote?.signature === signature ? quote : null;
  useEffect(() => {
    if (!enabled || !availability?.canOrder) return;
    let active = true;
    void browserSession
      .authorize(loadPrintOfferings)
      .then((items) => {
        if (active) {
          setOfferings(items);
          setCatalogError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) setCatalogError(describeApiError(err).message);
      });
    return () => {
      active = false;
    };
  }, [enabled, availability?.canOrder, reload]);
  useEffect(
    () => () => {
      if (quote) URL.revokeObjectURL(quote.pdfUrl);
    },
    [quote],
  );
  async function preview() {
    if (!design || !offering || dirty || !availability?.canOrder || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    if (previewKey.current?.signature !== signature)
      previewKey.current = { signature, key: crypto.randomUUID() };
    const started = signature;
    try {
      const value = await browserSession.authorize((token) =>
        printRequest(
          token,
          `/bookings/${bookingId}/print-orders/price-preview`,
          purchaseQuoteSchema,
          {
            designId: design.designId,
            designRevisionId: design.revisionId,
            offeringId: offering.offeringId,
            sourceRevisionId: offering.sourceRevisionId,
            quantity,
          },
          previewKey.current!.key,
        ),
      );
      const pdf = await browserSession.authorize((token) =>
        loadPrintPdf(token, bookingId, value.document.printableRevisionId),
      );
      if (latest.current !== started) return;
      setQuote({ signature: started, value, pdfUrl: URL.createObjectURL(pdf) });
      previewKey.current = null;
    } catch (err: unknown) {
      setError(describeApiError(err).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    if (!validQuote || inFlight.current) return;
    const value = validQuote.value;
    const agreed = await confirm({
      title: 'Xác nhận đặt in và chi phí',
      description: `${value.document.quantity} thiệp · ${value.document.material} · ${value.document.line.lineTotalVnd.toLocaleString('vi-VN')} đ. Bạn đồng ý với bản in đang xem và chi phí này. Khoản tiền chỉ có hiệu lực sau khi nhà hàng duyệt; không thu thêm tiền cọc.`,
      confirmLabel: 'Đồng ý đặt in và chi phí',
    });
    if (!agreed || latest.current !== signature || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    if (consentKey.current?.quoteId !== value.quoteId)
      consentKey.current = { quoteId: value.quoteId, key: crypto.randomUUID() };
    try {
      const order = await browserSession.authorize((token) =>
        printRequest(
          token,
          `/bookings/${bookingId}/print-orders/confirm-purchase`,
          purchaseOrderSchema,
          { quoteId: value.quoteId, digest: value.digest, consent: true },
          consentKey.current!.key,
        ),
      );
      onOrdered(order);
      setQuote(null);
      previewKey.current = null;
      consentKey.current = null;
      notify.success(
        'Đã xác nhận đặt in và phụ lục. Đang chờ nhà hàng duyệt, bạn không cần duyệt lại ở trang Phụ lục.',
      );
    } catch (err: unknown) {
      setError(describeApiError(err).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function requestCancellation(order: PurchaseOrder) {
    const total = order.currentCommercialRevision?.orderTotalVnd ?? 0;
    if (
      !(await confirm({
        title: 'Yêu cầu hủy trước sản xuất?',
        description: `Bạn đồng ý hủy toàn bộ đơn và giảm ${total.toLocaleString('vi-VN')} đ chi phí in khi nhà hàng xác nhận. Nếu đơn đã sản xuất thì yêu cầu này không còn áp dụng.`,
        confirmLabel: 'Xác nhận yêu cầu hủy',
        tone: 'danger',
      }))
    )
      return;
    try {
      await browserSession.authorize((token) =>
        printRequest(
          token,
          `/bookings/${bookingId}/print-orders/${order.orderId}/cancellation-intents`,
          z.object({ confirmed: z.literal(true), orderId: z.string() }),
          {
            expectedRevision: order.revision,
            reason: 'Khách xác nhận hủy toàn bộ đơn và chi phí trước sản xuất',
          },
          `cancel-purchase:${order.orderId}:${order.revision}`,
        ),
      );
      notify.success('Đã ghi nhận yêu cầu hủy và giảm phí. Chờ nhà hàng xác nhận.');
    } catch (err: unknown) {
      notify.error(describeApiError(err).message);
    }
  }
  return {
    availability,
    retryAvailability: accessLive.refresh,
    offerings,
    offering,
    offeringId,
    setOfferingId,
    quantity,
    setQuantity,
    catalogError,
    retryCatalog: () => setReload((n) => n + 1),
    busy,
    error,
    quote: validQuote,
    preview,
    submit,
    requestCancellation,
  };
}
