import { describeApiError } from '../../lib/api/api-errors';
import { createExperienceGateway } from '../identity-access/experience-api';
import { formatDate } from '../couple-workspace/workspace-helpers';

export type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
export type BookingChoice = Readonly<{ bookingId: string; label: string }>;
export type ListBookings = (authorize: Authorize) => Promise<readonly BookingChoice[]>;

export const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;

export const listCoupleBookings: ListBookings = async (authorize) => {
  const overview = await authorize((token) => createExperienceGateway().overview(token));
  return overview.data.map((item) => ({
    bookingId: item.bookingId,
    label: `${item.hallName} · ${formatDate(item.eventDate)} · ${
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
  return describeApiError(caught).message;
}
