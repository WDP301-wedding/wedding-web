import { z } from 'zod';
import { describeApiError } from '../../lib/api/api-errors';
import { ApiClientError } from '../../lib/api/client';
import { readPublicEnv } from '../../lib/env';
import { ix } from './studio-classes';

export const publicationSnapshotSchema = z.object({
  publicationRevision: z.number().int().nonnegative(),
  published: z.boolean(),
  publicSlug: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
  publishedRevisionId: z.string().uuid().nullable(),
  designRevisionId: z.string().uuid().nullable(),
});

export function invitationErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.cause instanceof ApiClientError) err = err.cause;
  const parsed = describeApiError(err);
  if (err instanceof ApiClientError)
    return parsed.message + (parsed.requestId ? ' (Mã hỗ trợ: ' + parsed.requestId + ')' : '');
  return err instanceof Error ? parsed.message : fallback;
}

export function getApiBaseUrl(): string {
  try {
    return readPublicEnv().NEXT_PUBLIC_API_BASE_URL;
  } catch {
    return 'http://localhost:3000';
  }
}

export const orderStatusMap: Record<string, { label: string; className: string }> = {
  REQUESTED: { label: 'Chờ báo giá', className: ix.chipWarning },
  QUOTED: { label: 'Đã có báo giá', className: ix.chipInfo },
  APPROVED: { label: 'Đã duyệt in', className: ix.chipSuccess },
  IN_PRODUCTION: { label: 'Đang in ấn', className: ix.chipInfo },
  READY_FOR_HANDOVER: { label: 'Sẵn sàng bàn giao', className: ix.chipSuccess },
  HANDED_OVER: { label: 'Đã bàn giao', className: ix.chipSuccess },
  CANCELLED: { label: 'Đã hủy', className: ix.chipMuted },
};

export function getOrGenerateKey(
  ref: React.MutableRefObject<{ signature: string; key: string } | null>,
  signature: string,
  scope: string,
): string {
  if (ref.current && ref.current.signature === signature) {
    return ref.current.key;
  }
  const newKey = `${scope}:${crypto.randomUUID()}`;
  ref.current = { signature, key: newKey };
  return newKey;
}
