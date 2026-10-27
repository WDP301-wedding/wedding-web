import { readPublicEnv } from '../env';
import { ApiClientError, defaultTimeoutMs } from './client';

/** Private binary reads use the same bounded deadline and typed errors as JSON requests. */
export async function fetchPrivateFile(path: string, accessToken: string): Promise<Blob> {
  const base = readPublicEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '');
  const requestId = crypto.randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), defaultTimeoutMs);
  try {
    const response = await fetch(base + path, {
      headers: { Authorization: `Bearer ${accessToken}`, 'x-request-id': requestId },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      let code = 'FILE_DOWNLOAD_FAILED';
      let serverRequestId = response.headers.get('x-request-id') ?? requestId;
      try {
        const body = (await response.json()) as { error?: { code?: string; requestId?: string } };
        if (typeof body.error?.code === 'string') code = body.error.code;
        if (typeof body.error?.requestId === 'string') serverRequestId = body.error.requestId;
      } catch {
        /* Non-JSON errors still retain their HTTP status and request ID. */
      }
      throw new ApiClientError({
        kind: 'api',
        code,
        message: 'Không tải được file.',
        requestId: serverRequestId,
        status: response.status,
      });
    }
    return await response.blob();
  } catch (cause) {
    if (cause instanceof ApiClientError) throw cause;
    throw new ApiClientError({
      kind: controller.signal.aborted ? 'timeout' : 'network',
      code: controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
      message: controller.signal.aborted
        ? 'Máy chủ phản hồi quá lâu khi tải file.'
        : 'Không tải được file.',
      requestId,
      cause,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Open a PDF, or fall back to downloading when a popup is blocked. */
export function openBlob(blob: Blob, fallbackName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const opened = window.open(url, '_blank', 'noopener');
    if (opened === null) {
      const link = document.createElement('a');
      link.href = url;
      link.download = fallbackName;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
