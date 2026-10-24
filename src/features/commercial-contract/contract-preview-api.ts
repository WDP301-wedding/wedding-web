import type { ApiClient } from '../../lib/api/client';
import type { Client } from 'openapi-fetch';
import { coupleApi, bearer, unwrap } from '../couple-workspace/use-couple-workspace';
import type { ApiBody } from '../../lib/api/types';
import type { ContractRevision } from './contract-api';
export type ContractPreview = Readonly<{
  bookingRevision: number;
  document: ContractRevision['document'];
}>;
type PreviewPath = {
  '/bookings/{bookingId}/contracts/preview': {
    post: {
      parameters: { path: { bookingId: string } };
      requestBody: {
        content: { 'application/json': ApiBody<'/bookings/{bookingId}/contracts', 'post'> };
      };
      responses: { 200: { content: { 'application/json': { data: ContractPreview } } } };
    };
  };
};
/** Uses the shared authenticated transport, timeout and error middleware. */
export async function previewContract(
  token: string,
  bookingId: string,
  body: ApiBody<'/bookings/{bookingId}/contracts', 'post'>,
) {
  return unwrap<ContractPreview>(
    await (coupleApi() as ApiClient & Client<PreviewPath>).POST(
      '/bookings/{bookingId}/contracts/preview',
      {
        headers: bearer(token),
        params: { path: { bookingId } },
        body,
      },
    ),
  );
}
