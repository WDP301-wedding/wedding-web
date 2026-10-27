'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import { describeApiError } from '../../lib/api/api-errors';
import { isActiveJob, waitForImageJob } from './image-job-poller';
import type { ImageAspectRatio, ImageJobView, InvitationGateway } from './invitation-api';

export type SucceededImageJob = Extract<ImageJobView, { status: 'SUCCEEDED' }>;

/** Câu báo lỗi khi gửi/khôi phục job (mã lỗi theo tài liệu backend invitation-image-jobs). */
export function imageJobErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.kind === 'network' || error.kind === 'timeout')
      return 'Chưa kết nối được máy chủ. Bấm lại để thử — yêu cầu sẽ không bị tạo trùng.';
    if (error.code === 'AI_IMAGE_PROVIDER_DISABLED')
      return 'Tính năng tạo ảnh AI đang tạm tắt. Vui lòng thử lại sau.';
    if (error.code === 'MEDIA_CUTOFF_REACHED')
      return 'Đã quá hạn chỉnh sửa hình ảnh cho tiệc này nên không thể tạo ảnh mới.';
    if (error.code === 'AI_JOB_RECOVERY_UNAVAILABLE')
      return 'Không thể khôi phục ảnh này tự động. Vui lòng liên hệ nhà hàng để được hỗ trợ.';
    if (error.status === 429)
      return 'Tiệc đã đạt giới hạn tạo ảnh AI (tối đa 2 ảnh đang xử lý và 10 ảnh mới trong 24 giờ). Vui lòng thử lại sau.';
  }
  return describeApiError(error).message;
}

/** Dòng trạng thái hiển thị dưới ô mô tả ảnh. */
export function imageJobStatusText(job: ImageJobView): string {
  switch (job.status) {
    case 'QUEUED':
      return 'Đang xếp hàng chờ tạo ảnh…';
    case 'RUNNING':
      return 'Đang tạo ảnh…';
    case 'SUCCEEDED':
      return 'Ảnh đã sẵn sàng.';
    case 'FAILED':
      return `Không tạo được ảnh từ mô tả này. Hãy thử mô tả khác. (Mã: ${job.errorCode})`;
    case 'RECOVERY_REQUIRED':
      return 'Chưa xác định được kết quả tạo ảnh. Bấm “Thử khôi phục” để lấy lại ảnh đã tạo — không tạo thêm lượt mới.';
  }
}

type Options = Readonly<{
  gateway: InvitationGateway;
  accessToken: string;
  bookingId: string;
  /**
   * Job tạo ảnh xong. `restored = true`: job đã xong từ trước, tìm thấy khi mở lại Studio — giao diện
   * chỉ gợi ý dùng ảnh, không tự gắn vào thiệp.
   */
  onSucceeded: (job: SucceededImageJob, restored: boolean) => void;
}>;

/**
 * Luồng tạo ảnh AI bất đồng bộ: gửi job (202) → hỏi trạng thái → xong / thất bại / cần khôi phục.
 *
 * - Idempotency-Key giữ nguyên theo (mô tả, tỉ lệ) cho tới khi job kết thúc: bấm lại sau lỗi mạng
 *   nhận lại đúng job cũ, không mua thêm lượt tạo ảnh. Đổi mô tả = ý định mới = key mới.
 * - Mở lại Studio: đọc danh sách job để theo dõi tiếp job đang chạy, không tạo job mới.
 * - Rời trang: ngừng hỏi (job vẫn chạy ở backend).
 */
export function useImageJob({ gateway, accessToken, bookingId, onSucceeded }: Options) {
  const [job, setJob] = useState<ImageJobView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<AbortController | null>(null);
  const keyRef = useRef<{ signature: string; key: string } | null>(null);
  const recoveryKeyRef = useRef<{ jobId: string; key: string } | null>(null);
  const onSucceededRef = useRef(onSucceeded);
  useEffect(() => {
    onSucceededRef.current = onSucceeded;
  });

  const finish = useCallback((done: ImageJobView, restored: boolean) => {
    setJob(done);
    // Job đã kết thúc: lần bấm sau (dù cùng mô tả) là một ảnh mới.
    if (done.status === 'SUCCEEDED' || done.status === 'FAILED') keyRef.current = null;
    if (done.status === 'SUCCEEDED') onSucceededRef.current(done, restored);
  }, []);

  const track = useCallback(
    (current: ImageJobView) => {
      pollRef.current?.abort();
      setJob(current);
      setStalled(false);
      if (!isActiveJob(current)) {
        finish(current, false);
        return;
      }
      const controller = new AbortController();
      pollRef.current = controller;
      setWaiting(true);
      waitForImageJob(current, () => gateway.getImageJob(accessToken, bookingId, current.jobId), {
        signal: controller.signal,
        onUpdate: setJob,
      })
        .then(({ job: latest, settled }) => {
          if (controller.signal.aborted) return;
          if (settled) finish(latest, false);
          else {
            setJob(latest);
            setStalled(true);
          }
        })
        .catch((caught: unknown) => {
          if (!controller.signal.aborted) setError(imageJobErrorMessage(caught));
        })
        .finally(() => {
          if (!controller.signal.aborted) setWaiting(false);
        });
    },
    [gateway, accessToken, bookingId, finish],
  );

  // Mở Studio: theo dõi tiếp job đang chạy, hoặc hiện job cần khôi phục / ảnh đã xong gần nhất.
  useEffect(() => {
    let active = true;
    gateway
      .listImageJobs(accessToken, bookingId)
      .then((jobs) => {
        if (!active) return;
        const running = jobs.find(isActiveJob);
        if (running) {
          track(running);
          return;
        }
        const latest = jobs[0];
        if (latest?.status === 'RECOVERY_REQUIRED') setJob(latest);
        else if (latest?.status === 'SUCCEEDED') finish(latest, true);
      })
      .catch((caught: unknown) => {
        if (active) setError(imageJobErrorMessage(caught));
      });
    return () => {
      active = false;
      pollRef.current?.abort();
    };
  }, [gateway, accessToken, bookingId, track, finish]);

  const start = useCallback(
    async (prompt: string, aspectRatio: ImageAspectRatio = '1:1') => {
      const signature = `${aspectRatio}:${prompt}`;
      if (keyRef.current?.signature !== signature)
        keyRef.current = { signature, key: `image-job:${crypto.randomUUID()}` };
      setSubmitting(true);
      setError(null);
      try {
        track(
          await gateway.enqueueImageJob(
            accessToken,
            bookingId,
            prompt,
            aspectRatio,
            keyRef.current.key,
          ),
        );
      } catch (caught) {
        // Giữ key: bấm lại sau lỗi mạng nhận lại đúng job, không tạo trùng.
        setError(imageJobErrorMessage(caught));
      } finally {
        setSubmitting(false);
      }
    },
    [gateway, accessToken, bookingId, track],
  );

  const recover = useCallback(async () => {
    if (job?.status !== 'RECOVERY_REQUIRED') return;
    if (recoveryKeyRef.current?.jobId !== job.jobId)
      recoveryKeyRef.current = {
        jobId: job.jobId,
        key: `image-job-recovery:${crypto.randomUUID()}`,
      };
    setSubmitting(true);
    setError(null);
    try {
      track(
        await gateway.recoverImageJob(
          accessToken,
          bookingId,
          job.jobId,
          recoveryKeyRef.current.key,
        ),
      );
    } catch (caught) {
      setError(imageJobErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }, [job, gateway, accessToken, bookingId, track]);

  /** Sau khi ngừng hỏi vì chờ quá lâu: hỏi tiếp. */
  const checkAgain = useCallback(() => {
    if (job && isActiveJob(job)) {
      track(job);
      return;
    }
    if (job) return;
    setWaiting(true);
    setError(null);
    void gateway
      .listImageJobs(accessToken, bookingId)
      .then((jobs) => {
        const running = jobs.find(isActiveJob);
        if (running) track(running);
        else {
          const latest = jobs[0];
          if (latest?.status === 'RECOVERY_REQUIRED') setJob(latest);
          else if (latest?.status === 'SUCCEEDED') finish(latest, true);
        }
      })
      .catch((caught: unknown) => setError(imageJobErrorMessage(caught)))
      .finally(() => setWaiting(false));
  }, [job, track, gateway, accessToken, bookingId, finish]);

  return {
    job,
    busy: submitting || waiting,
    stalled,
    error,
    start,
    recover,
    checkAgain,
  };
}
