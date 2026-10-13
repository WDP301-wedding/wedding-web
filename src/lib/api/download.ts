import { readPublicEnv } from '../env';
import { ApiClientError } from './client';

/**
 * Tải file nhị phân riêng tư (PDF hợp đồng, file in…) có kèm Bearer token.
 *
 * Không dùng client openapi-fetch chung vì client đó kiểm tra mọi response phải là JSON
 * (để bắt lỗi hợp đồng API). File PDF là `application/pdf` nên đi đường riêng, nhưng lỗi
 * vẫn được chuẩn hoá thành `ApiClientError` để màn hình xử lý giống mọi lỗi khác.
 */
export async function fetchPrivateFile(path: string, accessToken: string): Promise<Blob> {
  const base = readPublicEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '');
  const requestId = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch(base + path, {
      headers: { Authorization: `Bearer ${accessToken}`, 'x-request-id': requestId },
      cache: 'no-store',
    });
  } catch (cause) {
    throw new ApiClientError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'Không tải được file.',
      requestId,
      cause,
    });
  }
  if (!response.ok) {
    let code = 'FILE_DOWNLOAD_FAILED';
    let serverRequestId = requestId;
    try {
      const body = (await response.json()) as { error?: { code?: string; requestId?: string } };
      code = body.error?.code ?? code;
      serverRequestId = body.error?.requestId ?? serverRequestId;
    } catch {
      // Body không phải JSON: giữ mã lỗi mặc định.
    }
    throw new ApiClientError({
      kind: 'api',
      code,
      message: 'Không tải được file.',
      requestId: serverRequestId,
      status: response.status,
    });
  }
  return response.blob();
}

/** Mở file trong tab mới (trình duyệt tự hiển thị PDF); thu hồi URL tạm sau một phút. */
export function openBlob(blob: Blob, fallbackName: string): void {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener');
  if (opened === null) {
    // Trình duyệt chặn popup: chuyển sang tải xuống.
    const link = document.createElement('a');
    link.href = url;
    link.download = fallbackName;
    link.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
