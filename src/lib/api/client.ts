import createClient, { type Client } from 'openapi-fetch';
import { z } from 'zod';

import { readPublicEnv } from '../env';
import type { components, paths } from './generated/schema';

const defaultTimeoutMs = 10_000;
const jsonMediaTypePattern = /^application\/(?:[\w.+-]+\+)?json$/i;

const apiErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    details: z
      .array(
        z.strictObject({
          code: z.string(),
          message: z.string(),
          path: z.string(),
        }),
      )
      .optional(),
    message: z.string().min(1),
    requestId: z.uuid(),
  }),
});

type ApiErrorDetails = components['schemas']['ErrorDetail'];
type ApiFetch = (request: Request) => Promise<Response>;

export type ApiClientErrorKind = 'api' | 'malformed-response' | 'network' | 'aborted' | 'timeout';

type ApiClientErrorOptions = Readonly<{
  kind: ApiClientErrorKind;
  code: string;
  message: string;
  requestId: string;
  status?: number;
  retryAfterSeconds?: number;
  details?: readonly ApiErrorDetails[];
  cause?: unknown;
}>;

export class ApiClientError extends Error {
  readonly kind: ApiClientErrorKind;
  readonly code: string;
  readonly requestId: string;
  readonly status: number | undefined;
  readonly retryAfterSeconds: number | undefined;
  readonly details: readonly ApiErrorDetails[] | undefined;

  constructor(options: ApiClientErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiClientError';
    this.kind = options.kind;
    this.code = options.code;
    this.requestId = options.requestId;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.details = options.details;
  }
}

export type ApiClient = Client<paths>;

export type CreateApiClientOptions = Readonly<{
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: ApiFetch;
  requestId?: () => string;
}>;

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim();
  return contentType !== undefined && jsonMediaTypePattern.test(contentType);
}

function malformedResponse(response: Response, requestId: string, cause?: unknown): ApiClientError {
  return new ApiClientError({
    kind: 'malformed-response',
    code: 'MALFORMED_API_RESPONSE',
    message: 'The API returned a malformed response.',
    requestId,
    status: response.status,
    cause,
  });
}

async function validateResponse(response: Response, sentRequestId: string): Promise<void> {
  const responseRequestId = response.headers.get('x-request-id') ?? sentRequestId;

  if (response.status === 204 || response.status === 205) {
    return;
  }

  if (!isJsonResponse(response)) {
    throw malformedResponse(response, responseRequestId);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(await response.clone().text());
  } catch (error) {
    throw malformedResponse(response, responseRequestId, error);
  }

  if (response.ok) {
    return;
  }

  const parsed = apiErrorResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw malformedResponse(response, responseRequestId, parsed.error);
  }

  const retryAfter = response.headers.get('retry-after');
  const retryAfterSeconds =
    retryAfter !== null && /^\d+$/.test(retryAfter) ? Number(retryAfter) : NaN;
  throw new ApiClientError({
    kind: 'api',
    code: parsed.data.error.code,
    message: parsed.data.error.message,
    requestId: parsed.data.error.requestId,
    status: response.status,
    ...(Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds > 0
      ? { retryAfterSeconds }
      : {}),
    ...(parsed.data.error.details === undefined ? {} : { details: parsed.data.error.details }),
  });
}

/**
 * Gộp các request GET giống hệt nhau đang chờ phản hồi (cùng URL + cùng Authorization).
 *
 * Vì sao: backend hiện mỗi module chỉ có 1 kết nối DB (DB_POOL_MAX=1) nên request xếp hàng tuần
 * tự. Một GET trùng (React StrictMode chạy effect 2 lần khi dev, hai component cùng cần một dữ liệu)
 * không chỉ tốn thêm một lượt mà còn đẩy mọi request phía sau chậm thêm. Chỉ gộp khi request trước
 * CHƯA xong — không phải cache: request mới sau khi xong vẫn đọc dữ liệu mới nhất.
 */
function coalesceGets(send: ApiFetch, createRequestId: () => string): ApiFetch {
  type Shared = { response: Promise<Response>; controller: AbortController; waiters: number };
  const inFlight = new Map<string, Shared>();
  return async (request) => {
    if (request.method !== 'GET' || request.signal.aborted) return send(request);
    const key = `${request.url}\n${request.headers.get('authorization') ?? ''}`;
    let shared = inFlight.get(key);
    if (shared === undefined) {
      // Request dùng chung có AbortController riêng: một người gọi huỷ (rời trang) thì những người
      // còn chờ vẫn nhận kết quả; chỉ khi KHÔNG còn ai chờ mới huỷ hẳn request.
      const controller = new AbortController();
      const headers = new Headers(request.headers);
      if (!headers.has('x-request-id')) headers.set('x-request-id', createRequestId());
      const entry: Shared = {
        controller,
        waiters: 0,
        response: send(new Request(request, { headers, signal: controller.signal })),
      };
      entry.response
        .finally(() => {
          if (inFlight.get(key) === entry) inFlight.delete(key);
        })
        .catch(() => undefined);
      inFlight.set(key, entry);
      shared = entry;
    }
    const entry = shared;
    entry.waiters += 1;
    try {
      const response = await new Promise<Response>((resolve, reject) => {
        const onAbort = () => {
          entry.waiters -= 1;
          if (entry.waiters === 0) {
            inFlight.delete(key);
            entry.controller.abort(request.signal.reason);
          }
          reject(
            new ApiClientError({
              kind: 'aborted',
              code: 'REQUEST_ABORTED',
              message: 'The API request was aborted.',
              requestId: request.headers.get('x-request-id') ?? createRequestId(),
              cause: request.signal.reason,
            }),
          );
        };
        request.signal.addEventListener('abort', onAbort, { once: true });
        entry.response.then(
          (value) => {
            request.signal.removeEventListener('abort', onAbort);
            resolve(value);
          },
          (error: unknown) => {
            request.signal.removeEventListener('abort', onAbort);
            // Lớp bên dưới luôn ném ApiClientError (là Error); bọc lại phòng trường hợp khác.
            reject(error instanceof Error ? error : new Error(String(error)));
          },
        );
      });
      // Mỗi người gọi đọc body của bản sao riêng (body của Response chỉ đọc được một lần).
      return response.clone();
    } finally {
      if (!request.signal.aborted) entry.waiters -= 1;
    }
  };
}

function createFetchWithPolicy(
  fetchImplementation: ApiFetch,
  timeoutMs: number,
  createRequestId: () => string,
): ApiFetch {
  return async (request) => {
    const headers = new Headers(request.headers);
    const sentRequestId = headers.get('x-request-id') ?? createRequestId();
    headers.set('x-request-id', sentRequestId);

    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => controller.abort(request.signal.reason);

    if (request.signal.aborted) {
      abortFromCaller();
    } else {
      request.signal.addEventListener('abort', abortFromCaller, { once: true });
    }

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImplementation(
        new Request(request, { headers, signal: controller.signal }),
      );
      await validateResponse(response, sentRequestId);
      return response;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      if (timedOut) {
        throw new ApiClientError({
          kind: 'timeout',
          code: 'REQUEST_TIMEOUT',
          message: `The API request timed out after ${timeoutMs} ms.`,
          requestId: sentRequestId,
          cause: error,
        });
      }

      if (request.signal.aborted) {
        throw new ApiClientError({
          kind: 'aborted',
          code: 'REQUEST_ABORTED',
          message: 'The API request was aborted.',
          requestId: sentRequestId,
          cause: error,
        });
      }

      throw new ApiClientError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'The API request failed before a response was received.',
        requestId: sentRequestId,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      request.signal.removeEventListener('abort', abortFromCaller);
    }
  };
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;

  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('API timeout must be a positive safe integer in milliseconds.');
  }

  const createRequestId = options.requestId ?? (() => crypto.randomUUID());
  return createClient<paths>({
    baseUrl: options.baseUrl ?? readPublicEnv().NEXT_PUBLIC_API_BASE_URL,
    fetch: coalesceGets(
      createFetchWithPolicy(
        options.fetch ?? ((request) => globalThis.fetch(request)),
        timeoutMs,
        createRequestId,
      ),
      createRequestId,
    ),
  });
}
