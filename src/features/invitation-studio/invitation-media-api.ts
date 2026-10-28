import type { ApiClient } from '../../lib/api/client';
import type { operations } from '../../lib/api/generated/schema';
import type {
  DerivedAssetView,
  MediaAssetView,
  MediaPreviewView,
} from './invitation-api-types';

export function createInvitationMediaMethods(
  api: () => ApiClient,
  headers: (token: string) => { Authorization: string },
  intent: (scope: string, callerKey?: string) => string,
  required: <T>(value: T | undefined) => T,
) {
  return {
    async uploadMedia(
      accessToken: string,
      bookingId: string,
      file: File | Blob,
      altText: string,
      expectedRevision?: number,
      idempotencyKey?: string,
    ): Promise<MediaAssetView> {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('altText', altText);
      if (expectedRevision !== undefined) {
        formData.append('expectedRevision', String(expectedRevision));
      }

      const { data, error } = await api().POST('/bookings/{bookingId}/media', {
        headers: headers(accessToken),
        params: {
          path: { bookingId },
          header: { 'Idempotency-Key': intent('upload-media', idempotencyKey) },
        },
        body: formData as unknown as operations['uploadWeddingMedia']['requestBody']['content']['multipart/form-data'],
      });
      if (error !== undefined) {
        throw new Error('Không thể tải lên hình ảnh.', { cause: error });
      }
      return required(data).data;
    },

    async detachMedia(
      accessToken: string,
      bookingId: string,
      assetId: string,
      expectedRevision: number,
      idempotencyKey?: string,
    ): Promise<MediaAssetView> {
      const { data, error } = await api().DELETE('/bookings/{bookingId}/media/{assetId}', {
        headers: headers(accessToken),
        params: {
          path: { bookingId, assetId },
          header: { 'Idempotency-Key': intent('detach-media', idempotencyKey) },
        },
        body: { expectedRevision },
      });
      if (error !== undefined) {
        throw new Error('Không thể xóa hình ảnh.', { cause: error });
      }
      return required(data).data;
    },

    async getMediaPreview(
      accessToken: string,
      bookingId: string,
      assetId: string,
    ): Promise<MediaPreviewView> {
      const { data, error } = await api().GET('/bookings/{bookingId}/media/{assetId}', {
        headers: headers(accessToken),
        params: { path: { bookingId, assetId } },
      });
      if (error !== undefined) {
        throw new Error('Không thể tải ảnh xem trước.', { cause: error });
      }
      return required(data).data;
    },

    async deriveAsset(
      accessToken: string,
      bookingId: string,
      mediaAssetId: string,
      expectedRevision: number,
      idempotencyKey?: string,
    ): Promise<DerivedAssetView> {
      const { data, error } = await api().POST('/bookings/{bookingId}/invitation-derived-assets', {
        headers: headers(accessToken),
        params: {
          path: { bookingId },
          header: { 'Idempotency-Key': intent('derive-image', idempotencyKey) },
        },
        body: { mediaAssetId, expectedRevision },
      });
      if (error !== undefined) {
        throw new Error('Không thể chuẩn bị ảnh cho thiệp.', { cause: error });
      }
      return required(data).data;
    },
  };
}

