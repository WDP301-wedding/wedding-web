import type { ApiClient } from '../../lib/api/client';
import { fetchPrivateFile } from '../../lib/api/download';
import { printQuoteWire, printRequestWire, printRequestsWire } from './print-request-wire';
import type {
  PrintRequestInputLine,
  PrintRequestQuote,
  PrintRequestView,
} from './invitation-print-request-types';

export function createInvitationPrintRequestMethods(
  api: () => ApiClient,
  headers: (token: string) => { Authorization: string },
  required: <T>(value: T | undefined) => T,
) {
  return {
    async previewPrintRequest(
      accessToken: string,
      bookingId: string,
      lines: readonly PrintRequestInputLine[],
      idempotencyKey: string,
    ): Promise<PrintRequestQuote> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/print-requests/price-preview',
        {
          headers: headers(accessToken),
          params: { path: { bookingId }, header: { 'Idempotency-Key': idempotencyKey } },
          body: { lines },
        },
      );
      if (error !== undefined)
        throw new Error('Không thể lấy bản xem trước và chi phí in.', { cause: error });
      return printQuoteWire.parse(required(data).data);
    },
    async confirmPrintRequest(
      accessToken: string,
      bookingId: string,
      consent: { quoteId: string; digest: string; consent: true },
      idempotencyKey: string,
    ): Promise<PrintRequestView> {
      const { data, error } = await api().POST('/bookings/{bookingId}/print-requests/confirm', {
        headers: headers(accessToken),
        params: { path: { bookingId }, header: { 'Idempotency-Key': idempotencyKey } },
        body: consent,
      });
      if (error !== undefined)
        throw new Error('Không thể xác nhận yêu cầu in và phụ lục.', { cause: error });
      return printRequestWire.parse(required(data).data);
    },
    async listPrintRequests(
      accessToken: string,
      bookingId: string,
    ): Promise<readonly PrintRequestView[]> {
      const { data, error } = await api().GET('/bookings/{bookingId}/print-requests', {
        headers: headers(accessToken),
        params: { path: { bookingId } },
      });
      if (error !== undefined)
        throw new Error('Không thể tải yêu cầu in và phụ lục.', { cause: error });
      return printRequestsWire.parse(required(data).data).items;
    },
    async withdrawPrintRequest(
      accessToken: string,
      bookingId: string,
      requestId: string,
      expectedRevision: number,
      idempotencyKey: string,
    ): Promise<PrintRequestView> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/print-requests/{requestId}/withdraw',
        {
          headers: headers(accessToken),
          params: { path: { bookingId, requestId }, header: { 'Idempotency-Key': idempotencyKey } },
          body: { expectedRevision },
        },
      );
      if (error !== undefined) throw new Error('Không thể rút yêu cầu in.', { cause: error });
      return printRequestWire.parse(required(data).data);
    },
    async getPrintableFile(
      accessToken: string,
      bookingId: string,
      printableRevisionId: string,
    ): Promise<Blob> {
      const blob = await fetchPrivateFile(
        `/bookings/${encodeURIComponent(bookingId)}/printable-revisions/${encodeURIComponent(printableRevisionId)}/file`,
        accessToken,
      );
      if (!blob.type.includes('application/pdf'))
        throw new Error('Bản in trả về không đúng định dạng PDF.');
      return blob;
    },
  };
}
