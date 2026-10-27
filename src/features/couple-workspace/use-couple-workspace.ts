'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { createApiClient, type ApiClient } from '../../lib/api/client';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import type { ApiData } from '../../lib/api/types';
import { browserSession } from '../identity-access/browser-session';
import { notify } from '../../design-system/toast';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { useRefreshQueue } from '../realtime/refresh-queue';

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

export type CoupleWorkspace = Readonly<{
  state: WorkspaceState;
  reload: () => void;
  refresh?: () => Promise<void>;
  bookingId: string | null;
  /** Danh sách tiệc của cặp đôi (rỗng khi chưa tải hoặc chưa đăng nhập). */
  bookings: readonly BookingSummary[];
}>;

/**
 * Context của "lớp cache dùng chung" cho /khong-gian.
 *
 * Vì sao cần: trước đây mỗi trang Couple tự gọi lại restore phiên + danh sách tiệc + proposal.
 * Layout `/khong-gian` được Next.js GIỮ NGUYÊN khi chuyển giữa các trang con, nên đặt Provider ở
 * layout thì dữ liệu chỉ tải một lần và các trang con đọc lại từ context (không gọi API lặp lại).
 * Ngoài /khong-gian (test, trang cũ) context là null → hook tự tải như trước.
 */
export const CoupleWorkspaceContext = createContext<CoupleWorkspace | null>(null);

/**
 * Hook nạp ngữ cảnh tiệc cho mọi trang Couple.
 *
 * Luồng: khôi phục phiên (cookie refresh) → lấy danh sách tiệc → chọn `bookingId` (URL hoặc
 * tiệc mặc định) → gọi `GET /bookings/{id}/proposal` để biết `phase`, quyền `RESTRICTED/FULL`
 * và `revision` hiện tại. Quyền luôn lấy từ backend, UI không tự suy đoán.
 */
export function useCoupleWorkspace(): CoupleWorkspace {
  const shared = useContext(CoupleWorkspaceContext);
  // Hook phải được gọi ở mọi lần render (quy tắc của React), nên luôn gọi loader
  // nhưng tắt việc tải khi đã có dữ liệu dùng chung từ Provider.
  const own = useWorkspaceLoader(shared === null);
  return shared ?? own;
}

/** Bộ tải dữ liệu thật; Provider và hook (khi không có Provider) đều dùng hàm này. */
export function useWorkspaceLoader(enabled = true): CoupleWorkspace {
  const searchParams = useSearchParams();
  const urlBookingId = searchParams.get('bookingId');
  const [state, setState] = useState<WorkspaceState>({ status: 'loading' });
  const [bookings, setBookings] = useState<readonly BookingSummary[]>([]);
  const requestSequence = useRef(0);
  const normalizedSelection = useRef<string | null>(null);
  const refresh = useRefreshQueue(async () => {
    if (!enabled) return;
    const sequence = ++requestSequence.current;
    try {
      const snapshot = await browserSession.restore();
      if (sequence !== requestSequence.current) return;
      if (snapshot.status === 'anonymous') {
        setBookings([]);
        setState({ status: 'anonymous' });
        return;
      }
      const list = await browserSession.authorize((token) =>
        coupleApi()
          .GET('/couple/bookings', {
            headers: bearer(token),
            params: { query: { client: 'WEB', limit: 50 } },
          })
          .then((response) => unwrap<readonly BookingSummary[]>(response)),
      );
      if (sequence !== requestSequence.current) return;
      setBookings(list);
      const id = urlBookingId ?? pickDefaultBooking(list)?.bookingId;
      if (!id) {
        setState({ status: 'choose-booking', bookings: list });
        return;
      }
      const proposal = await browserSession.authorize((token) =>
        coupleApi()
          .GET('/bookings/{bookingId}/proposal', {
            headers: bearer(token),
            params: { path: { bookingId: id } },
            cache: 'no-store',
          })
          .then((response) => unwrap<Proposal>(response)),
      );
      if (sequence !== requestSequence.current) return;
      setState({ status: 'ready', proposal });
      if (!urlBookingId) {
        normalizedSelection.current = id;
        const url = new URL(window.location.href);
        url.searchParams.set('bookingId', id);
        window.history.replaceState(window.history.state, '', url.toString());
      }
    } catch (error: unknown) {
      if (sequence !== requestSequence.current) return;
      if (browserSession.snapshot().status === 'anonymous') {
        setBookings([]);
        setState({ status: 'anonymous' });
      } else setState({ status: 'error', error: describeApiError(error) });
    }
  }, urlBookingId ?? 'default');

  const invalidateRead = useCallback(() => {
    requestSequence.current++;
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const normalized = normalizedSelection.current;
    normalizedSelection.current = null;
    if (!urlBookingId || normalized !== urlBookingId) void refresh.run();
    return invalidateRead;
  }, [enabled, urlBookingId, refresh, invalidateRead]);

  const reload = useCallback(() => {
    void refresh.refresh();
  }, [refresh]);
  const activeBookingId = state.status === 'ready' ? state.proposal.bookingId : urlBookingId;
  useRealtimeSubscription({
    bookingId: activeBookingId ?? undefined,
    enabled,
    onEvent: (event) => {
      const matches =
        event.type === 'booking.updated' ||
        !event.scope.bookingId ||
        event.scope.bookingId === activeBookingId ||
        bookings.some((booking) => booking.bookingId === event.scope.bookingId);
      // Guest, seating, print and notification readers own their own data. They do not change proposal.
      if (
        matches &&
        [
          'booking.updated',
          'proposal.updated',
          'timeline.updated',
          'contract.updated',
          'deposit.received',
          'billing.updated',
        ].includes(event.type)
      ) {
        refresh.schedule();
      }
    },
    onResync: refresh.schedule,
  });

  return {
    state,
    reload,
    refresh: refresh.refresh,
    bookings,
    bookingId: state.status === 'ready' ? state.proposal.bookingId : urlBookingId,
  };
}

/**
 * Chạy một lệnh ghi (POST/PATCH/DELETE) với trạng thái pending/thông báo/lỗi.
 *
 * - Mỗi lần gọi `run` tạo MỘT Idempotency-Key cho đúng ý định đó. Nếu mất mạng, `authorize`
 *   chạy lại cùng closure nên vẫn dùng cùng key → backend trả lại kết quả cũ thay vì tạo trùng.
 * - `busy` (useRef) chặn bấm 2 lần liên tiếp trước khi React kịp render nút disabled.
 * - Kết quả thành công/lỗi hiện bằng toast (sonner). `notice`/`error` vẫn được trả về cho trang
 *   nào cần phản ứng theo kết quả (vd. sơ đồ tự tải lại khi gặp lỗi revision cũ).
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
      /** Gọi khi lỗi — cho trang phản ứng theo mã lỗi (vd. tự tải lại khi revision đã cũ). */
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
        // Toast thay cho khối thông báo inline: không đẩy layout, luôn kèm mã hỗ trợ.
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

/**
 * Đọc một ô văn bản từ FormData. `FormData.get` trả về `string | File | null`, nên ép kiểu bằng
 * `String(...)` có thể ra "[object File]". Hàm này chỉ nhận chuỗi và đã cắt khoảng trắng.
 */
export function formText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}
