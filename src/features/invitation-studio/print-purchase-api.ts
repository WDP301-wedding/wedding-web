import { z } from 'zod';
import { readPublicEnv } from '../../lib/env';
import { ApiClientError } from '../../lib/api/client';

export const seatingSchema = z.array(
  z.object({
    tableLabel: z.string(),
    shape: z.enum(['ROUND', 'RECTANGLE']),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotationDegrees: z.number(),
    guestGroupName: z.string().nullable(),
    color: z
      .string()
      .regex(/^#[A-F0-9]{6}$/i)
      .nullable(),
  }),
);
export type InvitationSeating = readonly Readonly<z.infer<typeof seatingSchema>[number]>[];
const offeringSchema = z.object({
  offeringId: z.uuid(),
  sourceRevisionId: z.uuid(),
  name: z.string(),
  material: z.string(),
  printType: z.string(),
  templateVersionId: z.uuid(),
  unitPriceVnd: z.number().int().nonnegative(),
  active: z.boolean(),
});
export type PrintOffering = z.infer<typeof offeringSchema>;
export const purchaseQuoteSchema = z.object({
  quoteId: z.uuid(),
  digest: z.string(),
  expiresAt: z.string(),
  document: z.object({
    designId: z.uuid(),
    designRevisionId: z.uuid(),
    offeringId: z.uuid(),
    sourceRevisionId: z.uuid(),
    quantity: z.number().int(),
    printableRevisionId: z.uuid(),
    contentDigest: z.string(),
    material: z.string(),
    printType: z.string(),
    line: z.object({
      name: z.string(),
      unitPriceVnd: z.number().int(),
      lineTotalVnd: z.number().int(),
    }),
  }),
});
export type PrintPurchaseQuote = z.infer<typeof purchaseQuoteSchema>;
const purchaseMetadata = z.object({
  cancellationRequested: z.boolean().optional(),
  appendixRevisionId: z.uuid(),
  quoteId: z.uuid(),
  material: z.string(),
  printType: z.string(),
  cancellationAppendixRevisionId: z.uuid().nullable(),
});
const quotedLine = z.object({
  lineId: z.uuid(),
  designId: z.uuid(),
  quantity: z.number().int(),
  unitPriceVnd: z.number().int(),
  lineTotalVnd: z.number().int(),
  designRevisionId: z.uuid().optional(),
});
const commercial = z.object({
  commercialRevisionId: z.uuid(),
  revisionNumber: z.number().int(),
  lines: z.array(quotedLine),
  orderTotalVnd: z.number().int(),
  estimatedHandoverAt: z.string().nullable(),
  expiresAt: z.string(),
  createdAt: z.string(),
});
const source = z.object({
  agreementRevisionId: z.uuid(),
  offeringId: z.uuid(),
  sourceRevisionId: z.uuid(),
  templateVersionId: z.uuid(),
  material: z.string(),
  printType: z.string(),
  unitPriceVnd: z.number().int(),
});
export const purchaseOrderSchema = z.object({
  orderId: z.uuid(),
  bookingId: z.uuid(),
  status: z.enum([
    'REQUESTED',
    'QUOTED',
    'APPROVED',
    'IN_PRODUCTION',
    'READY_FOR_HANDOVER',
    'HANDED_OVER',
    'CANCELLED',
  ]),
  revision: z.number().int(),
  lines: z.array(
    z.object({
      lineId: z.uuid(),
      designId: z.uuid(),
      quantity: z.number().int(),
      printableRevisionId: z.uuid().nullable(),
      commercialSource: source.optional(),
    }),
  ),
  currentCommercialRevisionId: z.uuid().nullable(),
  currentCommercialRevision: commercial.nullable(),
  pendingReplacementProposal: commercial.nullable(),
  receivableChargeId: z.uuid().nullable(),
  readyAt: z.string().nullable(),
  handedOverAt: z.string().nullable(),
  evidenceReference: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  purchase: purchaseMetadata.optional(),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;
export async function printRequest<T>(
  token: string,
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  key?: string,
): Promise<T> {
  const response = await fetch(readPublicEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '') + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }) })
      .parse(payload).error;
    throw new ApiClientError({ kind: 'api', status: response.status, ...error });
  }
  return z.object({ data: schema }).parse(payload).data;
}
export async function loadPrintOfferings(token: string): Promise<PrintOffering[]> {
  const items: PrintOffering[] = [],
    seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const page: { items: PrintOffering[]; nextCursor: string | null } = await printRequest(
      token,
      '/catalog/print-offerings?limit=100' +
        (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
      z.object({ items: z.array(offeringSchema), nextCursor: z.string().nullable() }),
    );
    items.push(...page.items.filter((item) => item.active));
    cursor = page.nextCursor;
    if (cursor && seen.has(cursor))
      throw new Error('Danh mục in trả về trang lặp. Vui lòng tải lại.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return items;
}
export async function loadPrintPdf(
  token: string,
  bookingId: string,
  printableId: string,
): Promise<Blob> {
  const response = await fetch(
    readPublicEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '') +
      `/bookings/${encodeURIComponent(bookingId)}/printable-revisions/${encodeURIComponent(printableId)}/file`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf'))
    throw new Error('Không thể dựng bản in. Hãy kiểm tra thiệp và sơ đồ trước khi xác nhận.');
  return response.blob();
}
