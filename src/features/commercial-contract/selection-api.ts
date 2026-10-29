import type { Client } from 'openapi-fetch';
import type { ApiClient } from '../../lib/api/client';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';
import type { ContractLineInput } from './contract-api';
import { selectionResultSchema, type SelectionResult } from './selection-wire';
export type SelectionDraft = { expectedRevision: number; lines: readonly ContractLineInput[] };
type Body = SelectionDraft | { expectedRevision: number; selectionRevisionId: string };
type Operation = {
  post: {
    parameters: { path: { bookingId: string } };
    requestBody: { content: { 'application/json': Body } };
    responses: { 200: { content: { 'application/json': { data: SelectionResult } } } };
  };
};
type SelectionPaths = {
  '/bookings/{bookingId}/contract-selections/preview': Operation;
  '/bookings/{bookingId}/contract-selections/drafts': Operation;
  '/bookings/{bookingId}/contract-selections/submissions': Operation;
};
async function post(
  token: string,
  bookingId: string,
  path: keyof SelectionPaths,
  body: Body,
  key?: string,
  signal?: AbortSignal,
) {
  const result = await (coupleApi() as ApiClient & Client<SelectionPaths>).POST(path, {
    headers: { ...bearer(token), ...(key ? { 'Idempotency-Key': key } : {}) },
    params: { path: { bookingId } },
    body,
    ...(signal ? { signal } : {}),
  });
  return selectionResultSchema.parse(unwrap<SelectionResult>(result));
}
export const selectionApi = {
  preview: (token: string, bookingId: string, body: SelectionDraft, signal?: AbortSignal) =>
    post(
      token,
      bookingId,
      '/bookings/{bookingId}/contract-selections/preview',
      body,
      undefined,
      signal,
    ),
  save: (token: string, key: string, bookingId: string, body: SelectionDraft) =>
    post(token, bookingId, '/bookings/{bookingId}/contract-selections/drafts', body, key),
  submit: (
    token: string,
    key: string,
    bookingId: string,
    expectedRevision: number,
    selectionRevisionId: string,
  ) =>
    post(
      token,
      bookingId,
      '/bookings/{bookingId}/contract-selections/submissions',
      { expectedRevision, selectionRevisionId },
      key,
    ),
};
