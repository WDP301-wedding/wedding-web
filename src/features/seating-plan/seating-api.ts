import type { ApiBody, ApiData } from '../../lib/api/types';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';

type LayoutOptionsResponse = ApiData<'/bookings/{bookingId}/seating-layout-options', 'get'>;
/** Additive preview metadata; older deployed servers can omit it. */
export type LayoutPreviewTable = Pick<
  SeatingTable,
  'layoutTableId' | 'tableLabel' | 'shape' | 'x' | 'y' | 'width' | 'height' | 'rotationDegrees'
> & { seatCapacity: number };
export type LayoutOptions = Omit<LayoutOptionsResponse, 'items'> & {
  items: readonly (LayoutOptionsResponse['items'][number] & {
    description?: string;
    tables?: readonly LayoutPreviewTable[];
  })[];
};
export type SeatingPlan = ApiData<'/bookings/{bookingId}/seating-plans/{planId}', 'get'>;
export type SeatingTable = SeatingPlan['renderSnapshot'][number];

const idem = (key: string) => ({ 'Idempotency-Key': key });

export const seatingApi = {
  async options(token: string, bookingId: string) {
    return unwrap<LayoutOptions>(
      await coupleApi().GET('/bookings/{bookingId}/seating-layout-options', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
  /**
   * Sơ đồ hiện tại của tiệc (`null` khi chưa chọn mẫu). Không cần biết planId → mở trên máy/trình
   * duyệt nào cũng thấy đúng sơ đồ (trước đây planId lưu ở localStorage nên máy khác không thấy).
   * Backend kiểm tra lại số khách/revision của tiệc khi đọc → `currentBookingRevision` luôn mới.
   */
  async current(token: string, bookingId: string) {
    const response = await coupleApi().GET('/bookings/{bookingId}/seating-plans/current', {
      headers: bearer(token),
      params: { path: { bookingId } },
      cache: 'no-store',
    });
    const body = response.data as { readonly data?: SeatingPlan | null } | undefined;
    if (body === undefined || body.data === undefined)
      throw new Error('Máy chủ không trả dữ liệu.');
    return body.data;
  },
  async plan(token: string, bookingId: string, planId: string) {
    return unwrap<SeatingPlan>(
      await coupleApi().GET('/bookings/{bookingId}/seating-plans/{planId}', {
        headers: bearer(token),
        params: { path: { bookingId, planId } },
        cache: 'no-store',
      }),
    );
  },
  async create(
    token: string,
    key: string,
    bookingId: string,
    layoutTemplateVersionId: string,
    expectedBookingRevision: number,
  ) {
    return unwrap<SeatingPlan>(
      await coupleApi().POST('/bookings/{bookingId}/seating-plans', {
        headers: bearer(token),
        params: { path: { bookingId }, header: idem(key) },
        body: { layoutTemplateVersionId, expectedBookingRevision },
      }),
    );
  },
  /** `expectedRevision` của sơ đồ là `revisionNumber` của bản đang xem. */
  async revise(
    token: string,
    key: string,
    bookingId: string,
    planId: string,
    body: ApiBody<'/bookings/{bookingId}/seating-plans/{planId}/revisions', 'post'>,
  ) {
    return unwrap<SeatingPlan>(
      await coupleApi().POST('/bookings/{bookingId}/seating-plans/{planId}/revisions', {
        headers: bearer(token),
        params: { path: { bookingId, planId }, header: idem(key) },
        body,
      }),
    );
  },
  async confirm(
    token: string,
    key: string,
    bookingId: string,
    planId: string,
    expectedRevision: number,
    expectedBookingRevision: number,
  ) {
    return unwrap<SeatingPlan>(
      await coupleApi().POST('/bookings/{bookingId}/seating-plans/{planId}/confirmation', {
        headers: bearer(token),
        params: { path: { bookingId, planId }, header: idem(key) },
        body: { expectedRevision, expectedBookingRevision },
      }),
    );
  },
};

/**
 * Tính khung nhìn SVG bao trọn mọi bàn. Quy ước toạ độ giống file in của backend:
 * (x, y) là góc trên-trái, tâm bàn = (x + width/2, y + height/2), xoay quanh tâm.
 * Dùng nửa đường chéo làm bán kính bao để bàn xoay không bị cắt mép.
 */
export function viewBoxOf(tables: readonly SeatingTable[]): string {
  if (tables.length === 0) return '0 0 100 100';
  const boxes = tables.map((table) => {
    const radius = Math.hypot(table.width, table.height) / 2;
    return { cx: table.x + table.width / 2, cy: table.y + table.height / 2, radius };
  });
  const margin = 20;
  const minX = Math.min(...boxes.map((box) => box.cx - box.radius)) - margin;
  const minY = Math.min(...boxes.map((box) => box.cy - box.radius)) - margin;
  const maxX = Math.max(...boxes.map((box) => box.cx + box.radius)) + margin;
  const maxY = Math.max(...boxes.map((box) => box.cy + box.radius)) + margin;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

export const minZoom = 1;
export const maxZoom = 4;

/**
 * Thu phóng/kéo sơ đồ bằng cách đổi `viewBox` thay vì CSS transform: SVG vẽ lại nét chữ, viền bàn
 * sắc nét ở mọi mức zoom, và toạ độ bấm chuột vẫn khớp bàn.
 * `panX/panY` tính theo đơn vị toạ độ của sơ đồ (không phải pixel màn hình).
 */
export function zoomedViewBox(base: string, zoom: number, panX: number, panY: number): string {
  const [x = 0, y = 0, width = 100, height = 100] = base.split(' ').map(Number);
  const level = Math.min(maxZoom, Math.max(minZoom, zoom));
  const viewWidth = width / level;
  const viewHeight = height / level;
  // Không cho kéo tâm ra ngoài khung sơ đồ gốc.
  const limitX = (width - viewWidth) / 2;
  const limitY = (height - viewHeight) / 2;
  const centerX = x + width / 2 + Math.min(limitX, Math.max(-limitX, panX));
  const centerY = y + height / 2 + Math.min(limitY, Math.max(-limitY, panY));
  return `${centerX - viewWidth / 2} ${centerY - viewHeight / 2} ${viewWidth} ${viewHeight}`;
}
