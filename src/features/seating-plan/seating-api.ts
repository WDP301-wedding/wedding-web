import type { ApiBody, ApiData } from '../../lib/api/types';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';

export type LayoutOptions = ApiData<'/bookings/{bookingId}/seating-layout-options', 'get'>;
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
  async plan(token: string, bookingId: string, planId: string) {
    return unwrap<SeatingPlan>(
      await coupleApi().GET('/bookings/{bookingId}/seating-plans/{planId}', {
        headers: bearer(token),
        params: { path: { bookingId, planId } },
        cache: 'no-store',
      }),
    );
  },
  async create(token: string, key: string, bookingId: string, layoutTemplateVersionId: string, expectedBookingRevision: number) {
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
  async confirm(token: string, key: string, bookingId: string, planId: string, expectedRevision: number, expectedBookingRevision: number) {
    return unwrap<SeatingPlan>(
      await coupleApi().POST('/bookings/{bookingId}/seating-plans/{planId}/confirmation', {
        headers: bearer(token),
        params: { path: { bookingId, planId }, header: idem(key) },
        body: { expectedRevision, expectedBookingRevision },
      }),
    );
  },
};

/** Backend chưa có API liệt kê sơ đồ theo tiệc → lưu ID sơ đồ ở trình duyệt sau khi tạo. */
const planKey = (bookingId: string) => `wedding.seatingPlan.${bookingId}`;
export function readPlanId(bookingId: string): string | null {
  try {
    return localStorage.getItem(planKey(bookingId));
  } catch {
    return null;
  }
}
export function rememberPlanId(bookingId: string, planId: string): void {
  try {
    localStorage.setItem(planKey(bookingId), planId);
  } catch {
    // Không lưu được: người dùng có thể dán lại mã sơ đồ.
  }
}

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
