import { ApiClientError } from '../../lib/api/client';
import type { ImageJobView } from './invitation-api';

/** Backend chỉ yêu cầu hỏi trạng thái khi job còn QUEUED/RUNNING. */
export function isActiveJob(job: ImageJobView): boolean {
  return job.status === 'QUEUED' || job.status === 'RUNNING';
}

/** Mặc định của backend (retryAfterSeconds = 3) — dùng khi phản hồi không ghi rõ. */
const defaultPollMs = 3_000;
const maxBackoffMs = 30_000;
/**
 * Hàng đợi tạo ảnh chạy tuần tự cho toàn hệ thống nên job có thể chờ lâu. Quá mốc này thì dừng hỏi
 * và để người dùng bấm "Kiểm tra lại" (job vẫn chạy ở backend, tải lại trang cũng theo dõi tiếp).
 */
export const defaultMaxWaitMs = 5 * 60_000;

/** Lỗi tạm thời: thử lại với nhịp giãn dần. Lỗi khác (401/403/404…) dừng hẳn và báo người dùng. */
function isTransient(error: unknown): error is ApiClientError {
  if (!(error instanceof ApiClientError)) return false;
  if (error.kind === 'network' || error.kind === 'timeout') return true;
  return (
    error.status === 429 || error.status === 502 || error.status === 503 || error.status === 504
  );
}

function backoffMs(error: ApiClientError, failures: number): number {
  const exponential = Math.min(defaultPollMs * 2 ** failures, maxBackoffMs);
  return Math.max(exponential, (error.retryAfterSeconds ?? 0) * 1000);
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason as Error);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason as Error);
      },
      { once: true },
    );
  });
}

export type PollOptions = Readonly<{
  signal: AbortSignal;
  /** Gọi mỗi khi có trạng thái mới (để giao diện đổi QUEUED → RUNNING). */
  onUpdate?: (job: ImageJobView) => void;
  maxWaitMs?: number;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
}>;

/**
 * Hỏi trạng thái job cho tới khi xong (SUCCEEDED / FAILED / RECOVERY_REQUIRED).
 *
 * - Theo nhịp `retryAfterSeconds` của backend; lỗi mạng/429/503 thì giãn nhịp (tôn trọng Retry-After).
 * - `settled: false` khi quá `maxWaitMs`: job vẫn chạy ở backend, chỉ là frontend ngừng hỏi.
 * - Hủy bằng `signal` (rời trang): promise bị reject với lý do hủy.
 */
export async function waitForImageJob(
  job: ImageJobView,
  load: () => Promise<ImageJobView>,
  { signal, onUpdate, maxWaitMs = defaultMaxWaitMs, wait = sleep, now = Date.now }: PollOptions,
): Promise<{ job: ImageJobView; settled: boolean }> {
  const startedAt = now();
  let current = job;
  let delay = (current.retryAfterSeconds ?? 3) * 1000;
  let failures = 0;
  while (isActiveJob(current)) {
    if (now() - startedAt >= maxWaitMs) return { job: current, settled: false };
    await wait(delay, signal);
    try {
      current = await load();
      failures = 0;
      delay = (current.retryAfterSeconds ?? 3) * 1000;
      onUpdate?.(current);
    } catch (error) {
      if (!isTransient(error)) throw error;
      failures += 1;
      delay = backoffMs(error, failures);
    }
  }
  return { job: current, settled: true };
}
