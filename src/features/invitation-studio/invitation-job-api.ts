import type { ApiClient } from '../../lib/api/client';
import type { ImageAspectRatio, ImageJobView } from './invitation-api-types';

/**
 * openapi-fetch bỏ mất các trường chỉ có kiểu `null` (`result`, `errorCode` khi chưa có) → điền lại
 * để giao diện luôn nhận đúng hình dạng job như tài liệu backend mô tả.
 */
export function toImageJob(raw: Readonly<{ status: ImageJobView['status'] }>): ImageJobView {
  const job = raw as unknown as ImageJobView;
  if (job.status === 'SUCCEEDED') return { ...job, errorCode: null };
  if (job.status === 'QUEUED' || job.status === 'RUNNING')
    return { ...job, result: null, errorCode: null };
  return { ...job, result: null };
}

export function createInvitationJobMethods(
  api: () => ApiClient,
  headers: (token: string) => { Authorization: string },
  required: <T>(value: T | undefined) => T,
) {
  return {
    async enqueueImageJob(
      accessToken: string,
      bookingId: string,
      prompt: string,
      aspectRatio: ImageAspectRatio,
      idempotencyKey: string,
    ): Promise<ImageJobView> {
      const { data } = await api().POST('/bookings/{bookingId}/invitation-image-jobs', {
        headers: headers(accessToken),
        params: { path: { bookingId }, header: { 'Idempotency-Key': idempotencyKey } },
        body: { prompt, aspectRatio },
      });
      return toImageJob(required(data).data);
    },

    async getImageJob(
      accessToken: string,
      bookingId: string,
      jobId: string,
    ): Promise<ImageJobView> {
      const { data } = await api().GET('/bookings/{bookingId}/invitation-image-jobs/{jobId}', {
        headers: headers(accessToken),
        params: { path: { bookingId, jobId } },
        cache: 'no-store',
      });
      return toImageJob(required(data).data);
    },

    async listImageJobs(
      accessToken: string,
      bookingId: string,
    ): Promise<readonly ImageJobView[]> {
      const { data } = await api().GET('/bookings/{bookingId}/invitation-image-jobs', {
        headers: headers(accessToken),
        params: { path: { bookingId }, query: { limit: 20 } },
        cache: 'no-store',
      });
      return Array.from(required(data).data.items, toImageJob);
    },

    async recoverImageJob(
      accessToken: string,
      bookingId: string,
      jobId: string,
      idempotencyKey: string,
    ): Promise<ImageJobView> {
      const { data } = await api().POST(
        '/bookings/{bookingId}/invitation-image-jobs/{jobId}/recovery',
        {
          headers: headers(accessToken),
          params: { path: { bookingId, jobId }, header: { 'Idempotency-Key': idempotencyKey } },
          body: {},
        },
      );
      return toImageJob(required(data).data);
    },
  };
}

