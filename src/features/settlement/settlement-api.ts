import type { ApiData } from '../../lib/api/types';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';

export type SettlementBilling = ApiData<'/bookings/{bookingId}/billing', 'get'>;
export type SettlementInvoices = ApiData<'/bookings/{bookingId}/final-invoices', 'get'>;

export const settlementApi = {
  async billing(token: string, bookingId: string) {
    return unwrap<SettlementBilling>(
      await coupleApi().GET('/bookings/{bookingId}/billing', {
        headers: bearer(token),
        params: { path: { bookingId }, query: { limit: 1 } },
        cache: 'no-store',
      }),
    );
  },
  async invoices(token: string, bookingId: string) {
    return unwrap<SettlementInvoices>(
      await coupleApi().GET('/bookings/{bookingId}/final-invoices', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
};
