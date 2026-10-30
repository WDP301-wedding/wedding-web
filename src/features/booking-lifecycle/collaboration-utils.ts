import { ApiClientError } from '../../lib/api/client';
import { createExperienceGateway } from '../identity-access/experience-api';

export type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
export type BookingChoice = Readonly<{ bookingId: string; label: string }>;
export type ListBookings = (authorize: Authorize) => Promise<readonly BookingChoice[]>;

export const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;

export const listCoupleBookings: ListBookings = async (authorize) => {
  const overview = await authorize((token) => createExperienceGateway().overview(token));
  return overview.data.map((item) => ({
    bookingId: item.bookingId,
    label: `${item.hallName} · ${item.eventDate.split('-').reverse().join('/')} · ${
      item.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'
    }`,
  }));
};

export const phaseLabels: Record<string, string> = {
  DRAFT: 'Đang trao đổi',
  AWAITING_DEPOSIT: 'Đã thống nhất kịch bản',
  CONFIRMED: 'Đã xác nhận tiệc',
  COMPLETED: 'Tiệc đã hoàn tất',
  CANCELLED: 'Đã hủy',
};

function isRawOrEnglishMessage(str: string): boolean {
  const trimmed = str.trim();
  return (
    /^[A-Z0-9_-]+$/.test(trimmed) ||
    /^Request failed with status code \d+$/i.test(trimmed) ||
    trimmed === 'Network Error' ||
    trimmed === 'Request failed' ||
    trimmed.toLowerCase().includes('forbidden') ||
    trimmed.toLowerCase().includes('unauthorized')
  );
}

export function errorMessage(caught: unknown): string {
  if (caught instanceof ApiClientError) {
    if (caught.code === 'FORBIDDEN' || caught.status === 403) {
      return 'Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập.';
    }
    if (caught.code === 'BOOKING_NOT_FOUND' || caught.status === 404) {
      return 'Không tìm thấy hồ sơ tiệc cưới.';
    }
    if (caught.code === 'BOOKING_ACCESS_DENIED') {
      return 'Bạn không có quyền truy cập tiệc cưới này.';
    }
    if (caught.code === 'SESSION_EXPIRED' || caught.status === 401) {
      return 'Phiên làm việc đã hết hạn. Yêu cầu chưa hoàn tất.';
    }
    if (
      caught.code === 'TIMELINE_REVISION_SUPERSEDED' ||
      caught.code === 'STALE_BOOKING_REVISION' ||
      caught.code?.includes('STALE')
    ) {
      return 'Đề xuất vừa được cập nhật bởi phiên khác. Vui lòng tải lại trang.';
    }
    if (caught.code === 'DEPOSIT_INTENT_ACTIVE') {
      return 'Đang có giao dịch tiền cọc đang xử lý. Vui lòng thử lại sau.';
    }
    if (caught.code === 'TIMELINE_APPROVAL_REQUIRES_ITEM') {
      return 'Hãy thêm và lưu ít nhất một mốc trước khi phê duyệt.';
    }
    if (caught.code === 'TIMELINE_ITEM_COUNT_INVALID') {
      return 'Kịch bản chỉ hỗ trợ tối đa 100 mốc thời gian.';
    }
    if (caught.code === 'TIMELINE_ITEM_TEXT_INVALID') {
      return 'Nội dung mốc thời gian phải từ 1–120 ký tự.';
    }
    if (
      caught.code === 'TIMELINE_ITEM_TIME_INVALID' ||
      caught.code === 'TIMELINE_TIME_OUT_OF_RANGE'
    ) {
      return 'Giờ bắt đầu mỗi mốc phải từ 17:00 đến trước 22:00 theo khung giờ của tiệc.';
    }
    if (caught.code === 'TIMELINE_ORDER_INVALID') {
      return 'Thứ tự các mốc thời gian không hợp lệ. Vui lòng kiểm tra lại.';
    }
    if (caught.code === 'UNKNOWN' || (caught.status && caught.status >= 500)) {
      return 'Yêu cầu chưa hoàn tất. Vui lòng thử lại sau.';
    }
    if (caught.message && !isRawOrEnglishMessage(caught.message)) {
      return caught.message;
    }
    return 'Yêu cầu chưa hoàn tất. Vui lòng thử lại sau.';
  }
  return caught instanceof Error
    ? 'Không thể đồng bộ hồ sơ. Vui lòng kiểm tra kết nối mạng và thử lại.'
    : 'Đã có lỗi xảy ra.';
}
