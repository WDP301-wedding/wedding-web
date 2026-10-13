'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { createApiClient, type ApiClient } from '../../lib/api/client';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import type { ApiData } from '../../lib/api/types';
import { browserSession } from '../identity-access/browser-session';

export type Proposal = ApiData<'/bookings/{bookingId}/proposal', 'get'>;
export type BookingSummary = ApiData<'/couple/bookings', 'get'>[number];

/**
 * Trạng thái của một trang trong không gian Couple. Dùng "discriminated union" để component
 * chỉ truy cập `proposal` khi chắc chắn đã có dữ liệu (TypeScript tự thu hẹp kiểu theo `status`).
 */
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
 *
 * Vì sao cần tham số kiểu T: openapi-fetch bọc kết quả trong mapped type `Readable<T>`, làm mảng
 * bị suy thành "object có key số" (mất `.map`, `.filter`). Dữ liệu chạy thật vẫn là mảng JSON bình
 * thường, nên ta khai báo lại đúng kiểu sinh từ OpenAPI qua `ApiData<path, method>`.
 */
export function unwrap<T>(response: { readonly data?: unknown }): T {
  const body = response.data as { readonly data?: T } | undefined;
  if (body?.data === undefined) throw new Error('Máy chủ không trả dữ liệu.');
  return body.data;
}

/**
 * Hook nạp ngữ cảnh tiệc cho mọi trang Couple.
 *
 * Luồng: khôi phục phiên (cookie refresh) → đọc `bookingId` trên URL → gọi
 * `GET /bookings/{id}/proposal` để biết `phase`, quyền `RESTRICTED/FULL` và `revision` hiện tại.
 * Nếu URL chưa có bookingId thì liệt kê tiệc của Couple; có đúng 1 tiệc thì tự chọn.
 * Quyền luôn lấy từ backend, UI không tự suy đoán.
 */
export function useCoupleWorkspace() {
  const searchParams = useSearchParams();
  const urlBookingId = searchParams.get('bookingId');
  const [state, setState] = useState<WorkspaceState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const snapshot = await browserSession.restore();
      if (!active) return;
      if (snapshot.status === 'anonymous') {
        setState({ status: 'anonymous' });
        return;
      }
      let bookingId = urlBookingId;
      if (!bookingId) {
        const bookings = await browserSession.authorize((token) =>
          coupleApi()
            .GET('/couple/bookings', {
              headers: bearer(token),
              params: { query: { client: 'WEB', limit: 50 } },
            })
            .then((response) => unwrap<readonly BookingSummary[]>(response)),
        );
        if (!active) return;
        if (bookings.length !== 1) {
          setState({ status: 'choose-booking', bookings });
          return;
        }
        bookingId = bookings[0]!.bookingId;
        const url = new URL(window.location.href);
        url.searchParams.set('bookingId', bookingId);
        window.history.replaceState({}, '', url.toString());
      }
      const id = bookingId;
      const proposal = await browserSession.authorize((token) =>
        coupleApi()
          .GET('/bookings/{bookingId}/proposal', {
            headers: bearer(token),
            params: { path: { bookingId: id } },
            cache: 'no-store',
          })
          .then((response) => unwrap<Proposal>(response)),
      );
      if (active) setState({ status: 'ready', proposal });
    };
    load().catch((error: unknown) => {
      if (!active) return;
      if (browserSession.snapshot().status === 'anonymous') setState({ status: 'anonymous' });
      else setState({ status: 'error', error: describeApiError(error) });
    });
    return () => {
      active = false;
    };
  }, [urlBookingId, reloadKey]);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  return { state, reload, bookingId: state.status === 'ready' ? state.proposal.bookingId : urlBookingId };
}

/**
 * Chạy một lệnh ghi (POST/PATCH/DELETE) với trạng thái pending/thông báo/lỗi.
 *
 * - Mỗi lần gọi `run` tạo MỘT Idempotency-Key cho đúng ý định đó. Nếu mất mạng, `authorize`
 *   chạy lại cùng closure nên vẫn dùng cùng key → backend trả lại kết quả cũ thay vì tạo trùng.
 * - `busy` (useRef) chặn bấm 2 lần liên tiếp trước khi React kịp render nút disabled.
 */
export function useCommand() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);

  const run = useCallback(
    async <T,>(
      operation: (token: string, idempotencyKey: string) => Promise<T>,
      success?: string,
      overrides?: Record<string, string>,
    ): Promise<T | undefined> => {
      if (busy.current) return undefined;
      busy.current = true;
      setPending(true);
      setError(null);
      setNotice(null);
      const key = crypto.randomUUID();
      try {
        const result = await browserSession.authorize((token) => operation(token, key));
        if (success) setNotice(success);
        return result;
      } catch (caught) {
        setError(describeApiError(caught, overrides));
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

export const shiftLabel = (code: 'LUNCH' | 'DINNER') => (code === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối');

export const formatVnd = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

/** Hiển thị thời điểm UTC theo giờ Việt Nam. */
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });

/** `eventDate` là ngày địa phương (YYYY-MM-DD): KHÔNG đổi múi giờ, chỉ định dạng lại. */
export const formatEventDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};
