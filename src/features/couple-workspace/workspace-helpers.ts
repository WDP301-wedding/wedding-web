'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createApiClient, type ApiClient } from '../../lib/api/client';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import type { ApiData } from '../../lib/api/types';
import { browserSession } from '../identity-access/browser-session';
import { notify } from '../../design-system/toast';

export type Proposal = ApiData<'/bookings/{bookingId}/proposal', 'get'>;
export type BookingSummary = ApiData<'/couple/bookings', 'get'>[number] & {
  readonly revision?: number;
  readonly eventType?: 'WEDDING' | 'ENGAGEMENT' | 'RECEPTION' | 'ANNIVERSARY' | 'OTHER';
  readonly alias?: string | null;
  readonly brideName?: string | null;
  readonly groomName?: string | null;
  readonly totalVnd?: number;
  readonly depositPaidVnd?: number;
};

export type WorkspaceState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'choose-booking'; bookings: readonly BookingSummary[] }
  | { status: 'error'; error: FriendlyError }
  | { status: 'ready'; proposal: Proposal };

let sharedClient: ApiClient | null = null;
/** Một client dùng chung cho mọi trang (giữ middleware, tránh tạo lại mỗi lần render). */
export function coupleApi(): ApiClient {
  return (sharedClient ??= createApiClient());
}
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/**
 * Lấy `data` từ response `{ data: ... }` và gán kiểu theo OpenAPI.
 */
export function unwrap<T>(response: { readonly data?: unknown }): T {
  const body = response.data as { readonly data?: T } | undefined;
  if (body?.data === undefined) throw new Error('Máy chủ không trả dữ liệu.');
  return body.data;
}

/**
 * Chọn tiệc mặc định khi URL chưa có `bookingId`: ưu tiên tiệc còn hiệu lực có ngày gần nhất
 * (chưa huỷ/chưa hoàn tất), nếu không có thì lấy tiệc đầu tiên. Không bắt người dùng nhập mã.
 */
export function pickDefaultBooking(
  bookings: readonly BookingSummary[],
): BookingSummary | undefined {
  const active = bookings
    .filter((booking) => booking.phase !== 'CANCELLED' && booking.phase !== 'COMPLETED')
    .toSorted((left, right) => left.eventDate.localeCompare(right.eventDate));
  return active[0] ?? bookings[0];
}

export function bookingPhaseLabel(phase: string): string {
  switch (phase) {
    case 'CONFIRMED':
      return 'Đã đặt cọc';
    case 'AWAITING_DEPOSIT':
      return 'Chờ đặt cọc';
    case 'DRAFT':
      return 'Đang dự thảo';
    case 'COMPLETED':
      return 'Đã hoàn tất';
    case 'CANCELLED':
      return 'Đã huỷ';
    default:
      return phase;
  }
}

export function eventTypeLabel(type?: string): string {
  switch (type) {
    case 'ENGAGEMENT':
      return 'Lễ ăn hỏi';
    case 'RECEPTION':
      return 'Tiệc báo hỷ';
    case 'ANNIVERSARY':
      return 'Kỷ niệm';
    case 'OTHER':
      return 'Sự kiện khác';
    case 'WEDDING':
    default:
      return 'Tiệc cưới';
  }
}

export function bookingDisplayName(booking: {
  alias?: string | null;
  eventType?: string;
  hallName: string;
  brideName?: string | null;
  groomName?: string | null;
}): string {
  if (booking.alias?.trim()) return booking.alias.trim();
  if (booking.brideName && booking.groomName) {
    const type = eventTypeLabel(booking.eventType);
    return `${type} · ${booking.brideName} & ${booking.groomName}`;
  }
  if (booking.eventType && booking.eventType !== 'WEDDING') {
    return `${eventTypeLabel(booking.eventType)} · ${booking.hallName}`;
  }
  return booking.hallName;
}

/**
 * Chạy một lệnh ghi (POST/PATCH/DELETE) với trạng thái pending/thông báo/lỗi.
 */
export function useCommand({
  errorPresentation = 'toast',
}: Readonly<{ errorPresentation?: 'toast' | 'inline' }> = {}) {
  const presentation = useRef(errorPresentation);
  useEffect(() => {
    presentation.current = errorPresentation;
  }, [errorPresentation]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);

  const run = useCallback(
    async <T>(
      operation: (token: string, idempotencyKey: string) => Promise<T>,
      success?: string,
      overrides?: Record<string, string>,
      onError?: (error: FriendlyError) => void,
    ): Promise<T | undefined> => {
      if (busy.current) return undefined;
      busy.current = true;
      setPending(true);
      setError(null);
      setNotice(null);
      const key = crypto.randomUUID();
      try {
        const result = await browserSession.authorize((token) => operation(token, key));
        if (success) {
          setNotice(success);
          notify.success(success);
        }
        return result;
      } catch (caught) {
        const friendly = describeApiError(caught, overrides);
        setError(friendly);
        if (presentation.current === 'toast') notify.error(friendly.message, friendly.requestId);
        onError?.(friendly);
        return undefined;
      } finally {
        busy.current = false;
        setPending(false);
      }
    },
    [],
  );

  return { run, pending, error, notice, setError, setNotice };
}

/** Đọc dữ liệu (GET) có kèm token; lỗi được ném ra để trang tự hiển thị. */
export function authorizedRead<T>(operation: (token: string) => Promise<T>): Promise<T> {
  return browserSession.authorize(operation);
}

export const shiftLabel = (code: 'LUNCH' | 'DINNER') =>
  code === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối';

export const formatVnd = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

/** Hiển thị thời điểm UTC theo giờ Việt Nam. */
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  });

/** `eventDate` là ngày địa phương (YYYY-MM-DD): KHÔNG đổi múi giờ, chỉ định dạng lại. */
export const formatEventDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

export function formText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

