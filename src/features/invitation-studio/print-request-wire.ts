import { z } from 'zod';

const printLine = z.object({
  category: z.enum(['PRINT', 'MENU', 'SERVICE']),
  sourceId: z.string(),
  sourceRevisionId: z.string(),
  name: z.string(),
  description: z.string(),
  unit: z.string(),
  quantity: z.int().positive(),
  unitPriceVnd: z.int().nonnegative(),
  lineTotalVnd: z.int().nonnegative(),
});
const document = z.object({
  predecessorRevisionId: z.string(),
  totalVnd: z.int().nonnegative(),
  lines: z.array(
    z.object({
      designId: z.string(),
      designRevisionId: z.string(),
      title: z.string(),
      quantity: z.int().positive(),
      printableRevisionId: z.string(),
      contentDigest: z.string(),
      line: printLine,
    }),
  ),
});
export const printQuoteWire = z.object({
  quoteId: z.string(),
  digest: z.string(),
  expiresAt: z.string(),
  document,
});
export const printRequestWire = z.object({
  requestId: z.string(),
  bookingId: z.string(),
  bookingRevision: z.int().positive(),
  appendixRevisionId: z.string(),
  state: z.enum(['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'SUPERSEDED']),
  orderId: z.string().nullable(),
  document,
});
export const printRequestsWire = z.object({ items: z.array(printRequestWire) });
