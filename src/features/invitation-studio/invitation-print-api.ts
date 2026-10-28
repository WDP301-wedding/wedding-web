import type { ApiClient } from '../../lib/api/client';
import type {
  ContractedPrintSource,
  PrintOrderView,
  PrintRequestLine,
} from './invitation-api-types';

export function createInvitationPrintMethods(
  api: () => ApiClient,
  headers: (token: string) => { Authorization: string },
  intent: (scope: string, callerKey?: string) => string,
  required: <T>(value: T | undefined) => T,
) {
  return {
    async listPrintOrders(
      accessToken: string,
      bookingId: string,
    ): Promise<readonly PrintOrderView[]> {
      const { data, error } = await api().GET('/bookings/{bookingId}/print-orders', {
        headers: headers(accessToken),
        params: { path: { bookingId } },
      });
      if (error !== undefined)
        throw new Error('Không thể tải danh sách đơn in thiệp.', { cause: error });
      return required(data).data.items as unknown as readonly PrintOrderView[];
    },

    async getPrintOrder(
      accessToken: string,
      bookingId: string,
      orderId: string,
    ): Promise<PrintOrderView> {
      const { data, error } = await api().GET('/bookings/{bookingId}/print-orders/{orderId}', {
        headers: headers(accessToken),
        params: { path: { bookingId, orderId } },
      });
      if (error !== undefined)
        throw new Error('Không thể tải chi tiết đơn in thiệp.', { cause: error });
      return required(data).data as unknown as PrintOrderView;
    },

    async requestPrintOrder(
      accessToken: string,
      bookingId: string,
      lines: readonly PrintRequestLine[],
      idempotencyKey?: string,
    ): Promise<PrintOrderView> {
      const { data, error } = await api().POST('/bookings/{bookingId}/print-orders', {
        headers: headers(accessToken),
        params: {
          path: { bookingId },
          header: { 'Idempotency-Key': intent('request-print-order', idempotencyKey) },
        },
        body: { lines: lines.map((line) => ({ ...line })) },
      });
      if (error !== undefined) throw new Error('Không thể gửi yêu cầu in thiệp.', { cause: error });
      return required(data).data as unknown as PrintOrderView;
    },

    async contractedPrintSources(
      accessToken: string,
      bookingId: string,
    ): Promise<readonly ContractedPrintSource[]> {
      const [appendices, contracts] = await Promise.all([
        api().GET('/bookings/{bookingId}/contract-appendices', {
          headers: headers(accessToken),
          params: { path: { bookingId } },
        }),
        api().GET('/bookings/{bookingId}/contracts', {
          headers: headers(accessToken),
          params: { path: { bookingId } },
        }),
      ]);
      type Line = {
        category: string;
        sourceId: string;
        sourceRevisionId: string;
        name: string;
        quantity: number;
      };
      const appendixData = appendices.data?.data as
        | {
            effectiveRevisionId: string;
            revisions: readonly { revisionId: string; document: { afterLines: readonly Line[] } }[];
          }
        | undefined;
      const contractData = contracts.data?.data as
        | { revisions: readonly { revisionId: string; document: { lines: readonly Line[] } }[] }
        | undefined;
      if (!appendixData) return [];
      const effective = appendixData.effectiveRevisionId;
      const lines =
        appendixData.revisions.find((revision) => revision.revisionId === effective)?.document
          .afterLines ??
        contractData?.revisions.find((revision) => revision.revisionId === effective)?.document
          .lines ??
        [];
      return lines
        .filter((line) => line.category === 'PRINT')
        .map((line) => ({
          agreementRevisionId: effective,
          offeringId: line.sourceId,
          sourceRevisionId: line.sourceRevisionId,
          name: line.name,
          quantity: line.quantity,
        }));
    },

    async approvePrintOrder(
      accessToken: string,
      bookingId: string,
      orderId: string,
      commercialRevisionId: string,
      expectedRevision: number,
      idempotencyKey?: string,
    ): Promise<PrintOrderView> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/print-orders/{orderId}/approval',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, orderId },
            header: { 'Idempotency-Key': intent('approve-print-order', idempotencyKey) },
          },
          body: { commercialRevisionId, expectedRevision },
        },
      );
      if (error !== undefined)
        throw new Error('Không thể phê duyệt báo giá in thiệp.', { cause: error });
      return required(data).data as unknown as PrintOrderView;
    },

    async cancelPrintOrder(
      accessToken: string,
      bookingId: string,
      orderId: string,
      expectedRevision: number,
      reason: string,
      idempotencyKey?: string,
    ): Promise<void> {
      const { error } = await api().POST(
        '/bookings/{bookingId}/print-orders/{orderId}/cancellation',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, orderId },
            header: { 'Idempotency-Key': intent('cancel-print-order', idempotencyKey) },
          },
          body: { expectedRevision, reason },
        },
      );
      if (error !== undefined) throw new Error('Không thể hủy đơn in thiệp.', { cause: error });
    },
  };
}

