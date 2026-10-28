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

export function errorMessage(caught: unknown): string {
  if (caught instanceof ApiClientError) {
    if (caught.code === 'BOOKING_ACCESS_DENIED') {
      return 'Bạn không có quyền truy cập tiệc cưới này.';
    }
    if (caught.code === 'TIMELINE_ORDER_INVALID') {
      return 'Thứ tự các mốc thời gian không hợp lệ. Vui lòng kiểm tra lại.';
    }
    if (caught.code === 'TIMELINE_TIME_OUT_OF_RANGE') {
      return 'Giờ diễn ra mốc thời gian phải nằm trong khung giờ của tiệc.';
    }
    return caught.message;
  }
  return caught instanceof Error ? caught.message : 'Đã có lỗi xảy ra.';
}
