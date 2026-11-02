import { z } from 'zod';
import type { ContractList } from './contract-api';
export const selectionLineSchema = z.object({
  category: z.enum(['MENU', 'SERVICE', 'PRINT']),
  sourceId: z.string().uuid(),
  sourceRevisionId: z.string().uuid(),
  quantity: z.number().int().positive(),
  name: z.string(),
  description: z.string(),
  unit: z.string(),
  unitPriceVnd: z.number().int().nonnegative(),
  lineTotalVnd: z.number().int().nonnegative(),
});
export const customerSelectionSchema = z.object({
  revisionId: z.string().uuid().nullable(),
  revisionNumber: z.number().int().nonnegative(),
  status: z.enum(['NOT_STARTED', 'DRAFT', 'SUBMITTED']),
  lines: z.array(selectionLineSchema).min(1).max(50),
  totalVnd: z.number().int().nonnegative(),
  submittedAt: z.string().nullable(),
});
export const selectionResultSchema = z.object({
  bookingRevision: z.number().int().positive(),
  selection: customerSelectionSchema,
});
export type CustomerSelection = NonNullable<ContractList['customerSelection']>;
export type SelectionResult = Readonly<{
  bookingRevision: number;
  selection: CustomerSelection;
}>;

export const selectionBlockReasonSchema = z.enum([
  'NOT_CUSTOMER',
  'BOOKING_CLOSED',
  'BOOKING_NOT_EDITABLE',
  'CUSTOMER_SELECTION_SUBMITTED',
  'CONTRACT_DRAFT_EXISTS',
  'CONTRACT_APPROVED',
  'DEPOSIT_SETTLED',
  'DEPOSIT_IN_PROGRESS',
  'PAYMENT_OUTCOME_UNKNOWN',
  'LEGACY_COMMERCIAL_CONVERSION_BLOCKED',
  'FINANCIAL_REVIEW_REQUIRED',
]);
export const selectionAccessSchema = z.object({
  canEdit: z.boolean(),
  blockReason: selectionBlockReasonSchema.nullable(),
  nextAction: z.enum([
    'EDIT_SELECTIONS',
    'WAIT_FOR_RESTAURANT',
    'VIEW_CONTRACT',
    'VIEW_PAYMENTS',
    'VIEW_APPENDICES',
    'CONTACT_RESTAURANT',
    'VIEW_BOOKING',
  ]),
});
export type SelectionAccess = z.infer<typeof selectionAccessSchema>;

export const selectionRecoveryActions: Record<
  NonNullable<SelectionAccess['blockReason']>,
  SelectionAccess['nextAction']
> = {
  NOT_CUSTOMER: 'VIEW_CONTRACT',
  BOOKING_CLOSED: 'VIEW_BOOKING',
  BOOKING_NOT_EDITABLE: 'CONTACT_RESTAURANT',
  CUSTOMER_SELECTION_SUBMITTED: 'WAIT_FOR_RESTAURANT',
  CONTRACT_DRAFT_EXISTS: 'VIEW_CONTRACT',
  CONTRACT_APPROVED: 'VIEW_CONTRACT',
  DEPOSIT_SETTLED: 'VIEW_PAYMENTS',
  DEPOSIT_IN_PROGRESS: 'VIEW_PAYMENTS',
  PAYMENT_OUTCOME_UNKNOWN: 'VIEW_PAYMENTS',
  LEGACY_COMMERCIAL_CONVERSION_BLOCKED: 'CONTACT_RESTAURANT',
  FINANCIAL_REVIEW_REQUIRED: 'CONTACT_RESTAURANT',
};
