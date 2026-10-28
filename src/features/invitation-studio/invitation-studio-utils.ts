import { z } from 'zod';
import { ApiClientError } from '../../lib/api/client';
import { readPublicEnv } from '../../lib/env';

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
  if (err instanceof ApiClientError) {
    const meta = ` (Mã: ${err.code}${err.status ? `, HTTP ${err.status}` : ''}${err.requestId ? `, RequestId: ${err.requestId.slice(0, 8)}` : ''})`;
    if (err.code === 'INVITATION_DESIGN_STALE')
      return `Bản thiết kế thiệp đã có phiên bản mới hơn trên máy chủ. Vui lòng làm mới trang để nhận bản mới nhất.${meta}`;
    if (err.code === 'INVITATION_PUBLICATION_STALE')
      return `Phiên bản xuất bản thiệp không đồng bộ với máy chủ. Vui lòng thử lại hoặc tải lại trang.${meta}`;
    if (err.code === 'PRINT_ORDER_STATE_INVALID')
      return `Trạng thái đơn in hiện tại không cho phép thực hiện thao tác này.${meta}`;
    if (err.code === 'PRINT_QUOTE_EXPIRED')
      return `Báo giá in thiệp đã hết hạn (quá 7 ngày). Vui lòng gửi yêu cầu báo giá mới.${meta}`;
    if (err.code === 'PRINT_QUOTE_STALE')
      return `Báo giá đã thay đổi hoặc không còn hiệu lực. Vui lòng làm mới đơn hàng.${meta}`;
    if (err.code === 'PRINT_CANCELLATION_NOT_ALLOWED')
      return `Đơn in đang trong quá trình sản xuất hoặc đã hoàn tất, không thể hủy.${meta}`;
    if (err.code === 'PRINTABLE_TIMELINE_NOT_EFFECTIVE')
      return `Kịch bản tiệc chưa có hiệu lực hoặc chưa được cả hai bên phê duyệt, chưa thể xuất bản thiệp.${meta}`;
    if (err.code === 'PRINTABLE_SEATING_REQUIRES_REVIEW')
      return `Sơ đồ sắp bàn cần được rà soát trước khi xuất bản thiệp.${meta}`;
    if (err.code === 'MEDIA_QUOTA_EXCEEDED')
      return `Đã vượt quá hạn ngạch hình ảnh cho phép (tối đa 100 ảnh hoặc 1 GiB mỗi tiệc).${meta}`;
    if (err.code === 'MEDIA_CUTOFF_REACHED')
      return `Đã hết hạn tải ảnh lên cho tiệc cưới (hạn chót khóa trước giờ tiệc 72 giờ).${meta}`;
    if (err.code === 'MEDIA_REVISION_STALE')
      return `Tệp hình ảnh không đồng bộ phiên bản với máy chủ. Vui lòng thử lại.${meta}`;
    if (err.code === 'IDEMPOTENCY_KEY_REUSED')
      return `Khóa thao tác đã được sử dụng cho một yêu cầu khác. Vui lòng làm mới trang.${meta}`;
    if (err.code === 'IDEMPOTENCY_KEY_REQUIRED')
      return `Yêu cầu cần có mã nhận diện thao tác idempotency.${meta}`;
    if (err.code === 'REQUEST_IN_PROGRESS')
      return `Một yêu cầu tương tự đang được xử lý trên máy chủ. Vui lòng chờ trong giây lát.${meta}`;
    if (err.code === 'RATE_LIMIT_EXCEEDED')
      return `Thao tác quá nhanh. Vui lòng đợi ${err.retryAfterSeconds ?? 'vài'} giây rồi thử lại.${meta}`;
    if (err.code === 'REQUEST_TIMEOUT')
      return `Yêu cầu máy chủ đã quá thời gian chờ (10 giây). Vui lòng kiểm tra lại đường truyền internet.${meta}`;
    if (err.code === 'NETWORK_ERROR')
      return `Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền internet.${meta}`;
    if (err.code === 'VALIDATION_ERROR')
      return `Dữ liệu gửi lên không đúng định dạng quy định. Vui lòng kiểm tra lại.${meta}`;
    if (err.status === 401 || err.code === 'AUTHENTICATION_REQUIRED')
      return `Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.${meta}`;
    if (err.status === 403)
      return `Bạn không có quyền thực hiện thao tác này trên hồ sơ tiệc cưới.${meta}`;
    if (err.status === 404) return `Không tìm thấy tài nguyên yêu cầu trên máy chủ.${meta}`;
    if (err.message) return `${err.message}${meta}`;
  }
  return err instanceof Error ? err.message : fallback;
}

export function getApiBaseUrl(): string {
  try {
    return readPublicEnv().NEXT_PUBLIC_API_BASE_URL;
  } catch {
    return 'http://localhost:3000';
  }
}

export const orderStatusMap: Record<string, { label: string; className: string }> = {
  REQUESTED: { label: 'Chờ báo giá', className: 'is-warning' },
  QUOTED: { label: 'Đã có báo giá', className: 'is-info' },
  APPROVED: { label: 'Đã duyệt in', className: 'is-success' },
  IN_PRODUCTION: { label: 'Đang in ấn', className: 'is-info' },
  READY_FOR_HANDOVER: { label: 'Sẵn sàng bàn giao', className: 'is-success' },
  HANDED_OVER: { label: 'Đã bàn giao', className: 'is-success' },
  CANCELLED: { label: 'Đã hủy', className: '' },
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
