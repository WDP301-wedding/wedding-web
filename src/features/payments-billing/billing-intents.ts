import { z } from 'zod';
import { ApiClientError } from '../../lib/api/client';

export interface IntentStorage {
  read(this: void, key: string): Promise<string | null>;
  write(this: void, key: string, value: string): Promise<void>;
  remove(this: void, key: string): Promise<void>;
}
const metadataSchema = z.strictObject({
  expectedBillingRevision: z.number().int().positive().optional(),
  timelineRevisionId: z.uuid().optional(),
  // Đặt cọc theo hợp đồng FULL_CONTRACT_V1: lưu lại để thử lại đúng cùng một yêu cầu.
  contractRevisionId: z.uuid().optional(),
  documentDigest: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
const recordSchema = z.strictObject({
  key: z.uuid(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  metadata: metadataSchema.default({}),
  checkoutAttemptId: z.uuid().optional(),
});
const browserStorage: IntentStorage = {
  read: (key) => Promise.resolve(sessionStorage.getItem(key)),
  write: (key, value) => {
    sessionStorage.setItem(key, value);
    return Promise.resolve();
  },
  remove: (key) => {
    sessionStorage.removeItem(key);
    return Promise.resolve();
  },
};
async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Keep the original server revision for recovery, never tokens or receipt text.
export function createBillingIntents(
  accountId: string,
  storage: IntentStorage = browserStorage,
  hash: (value: string) => Promise<string> = digest,
) {
  const busy = new Set<string>();
  const slotFor = async (scope: string) =>
    `wedding.billing.${await hash(JSON.stringify([accountId, scope]))}`;
  return {
    async pending(scope: string) {
      const saved = await storage.read(await slotFor(scope));
      if (saved === null) return null;
      const record = recordSchema.parse(JSON.parse(saved) as unknown);
      return {
        ...record.metadata,
        ...(record.checkoutAttemptId === undefined
          ? {}
          : { checkoutAttemptId: record.checkoutAttemptId }),
      };
    },
    async completeCheckout(scope: string, attemptId: string) {
      const slot = await slotFor(scope);
      const saved = await storage.read(slot);
      if (
        saved !== null &&
        recordSchema.parse(JSON.parse(saved) as unknown).checkoutAttemptId === attemptId
      )
        await storage.remove(slot);
    },
    // Server discovery can recover a committed checkout whose POST response was lost.
    // Keep its original key/body until this recovered attempt is verified terminal.
    async rememberAttempt(scope: string, attemptId: string) {
      const slot = await slotFor(scope);
      const saved = await storage.read(slot);
      if (saved === null) return;
      const record = recordSchema.parse(JSON.parse(saved) as unknown);
      if (record.checkoutAttemptId !== attemptId)
        await storage.write(slot, JSON.stringify({ ...record, checkoutAttemptId: attemptId }));
    },
    async run<T>(
      scope: string,
      body: object,
      operation: (key: string, stableBody: object) => Promise<T>,
      retainCheckout = false,
    ): Promise<T> {
      if (busy.has(scope)) throw new Error('Yêu cầu này đang được xử lý.');
      busy.add(scope);
      try {
        const slot = await slotFor(scope);
        const saved = await storage.read(slot);
        const previous = saved === null ? null : recordSchema.parse(JSON.parse(saved) as unknown);
        const payload = body as Record<string, unknown>;
        const metadata =
          previous?.metadata ??
          metadataSchema.parse({
            ...(payload.expectedBillingRevision === undefined
              ? {}
              : { expectedBillingRevision: payload.expectedBillingRevision }),
            ...(payload.timelineRevisionId === undefined
              ? {}
              : { timelineRevisionId: payload.timelineRevisionId }),
            ...(payload.contractRevisionId === undefined
              ? {}
              : { contractRevisionId: payload.contractRevisionId }),
            ...(payload.documentDigest === undefined
              ? {}
              : { documentDigest: payload.documentDigest }),
          });
        const stableBody = { ...body, ...metadata };
        const fingerprint = await hash(JSON.stringify(stableBody, Object.keys(stableBody).sort()));
        const record = previous ?? { key: crypto.randomUUID(), hash: fingerprint, metadata };
        if (record.hash !== fingerprint)
          throw new Error(
            'Yêu cầu trước chưa rõ kết quả. Hãy giữ nguyên nội dung và thử lại để kiểm tra kết quả.',
          );
        await storage.write(slot, JSON.stringify(record));
        try {
          const result = await operation(record.key, stableBody);
          if (retainCheckout) {
            const checkout = z.object({ paymentAttemptId: z.uuid() }).parse(result);
            await storage.write(
              slot,
              JSON.stringify({ ...record, checkoutAttemptId: checkout.paymentAttemptId }),
            );
          } else await storage.remove(slot);
          return result;
        } catch (error) {
          if (
            error instanceof ApiClientError &&
            error.kind === 'api' &&
            error.status !== undefined &&
            error.status >= 400 &&
            error.status < 500 &&
            ![401, 403, 404, 429].includes(error.status) &&
            error.code !== 'REQUEST_IN_PROGRESS' &&
            previous?.checkoutAttemptId === undefined
          )
            await storage.remove(slot);
          throw error;
        }
      } finally {
        busy.delete(scope);
      }
    },
  };
}
