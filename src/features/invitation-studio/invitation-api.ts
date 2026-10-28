import { createApiClient, type ApiClient } from '../../lib/api/client';
import {
  type DesignView,
  type InvitationGateway,
  type PublicInvitationView,
  type TemplateItemView,
} from './invitation-api-types';
import { createInvitationJobMethods, toImageJob } from './invitation-job-api';
import { createInvitationPrintMethods } from './invitation-print-api';
import { createInvitationMediaMethods } from './invitation-media-api';

export * from './invitation-api-types';
export { toImageJob };

/** `previewPath` = `/api/v1/bookings/{id}/media/{assetId}` → lấy assetId để gọi API xem ảnh hiện có. */
export function previewAssetId(previewPath: string): string | null {
  return /\/media\/([a-f0-9-]+)$/u.exec(previewPath)?.[1] ?? null;
}

function intent(scope: string, callerKey?: string): string {
  return callerKey ?? `${scope}:${crypto.randomUUID()}`;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Thiếu dữ liệu phản hồi.');
  return value;
}

export function createInvitationGateway(client?: ApiClient): InvitationGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

  const jobMethods = createInvitationJobMethods(api, headers, required);
  const printMethods = createInvitationPrintMethods(api, headers, intent, required);
  const mediaMethods = createInvitationMediaMethods(api, headers, intent, required);

  return {
    async listDesigns(accessToken, bookingId): Promise<readonly DesignView[]> {
      const { data, error } = await api().GET('/bookings/{bookingId}/invitations', {
        headers: headers(accessToken),
        params: { path: { bookingId } },
      });
      if (error !== undefined)
        throw new Error('Không thể tải danh sách thiết kế thiệp.', { cause: error });
      return required(data).data.items as unknown as readonly DesignView[];
    },

    async getDesign(accessToken, bookingId, designId): Promise<DesignView> {
      const { data, error } = await api().GET('/bookings/{bookingId}/invitations/{designId}', {
        headers: headers(accessToken),
        params: { path: { bookingId, designId } },
      });
      if (error !== undefined) throw new Error('Không thể tải thiết kế thiệp.', { cause: error });
      return required(data).data as unknown as DesignView;
    },

    async createDesign(accessToken, bookingId, content, idempotencyKey): Promise<DesignView> {
      const { data, error } = await api().POST('/bookings/{bookingId}/invitations', {
        headers: headers(accessToken),
        params: {
          path: { bookingId },
          header: { 'Idempotency-Key': intent('create-design', idempotencyKey) },
        },
        body: { content },
      });
      if (error !== undefined) throw new Error('Không thể tạo thiết kế thiệp.', { cause: error });
      return required(data).data as unknown as DesignView;
    },

    async reviseDesign(
      accessToken,
      bookingId,
      designId,
      input,
      idempotencyKey,
    ): Promise<DesignView> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/invitations/{designId}/revisions',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, designId },
            header: { 'Idempotency-Key': intent('revise-design', idempotencyKey) },
          },
          body: input,
        },
      );
      if (error !== undefined)
        throw new Error('Không thể cập nhật thiết kế thiệp.', { cause: error });
      return required(data).data as unknown as DesignView;
    },

    async publishDesign(
      accessToken,
      bookingId,
      designId,
      designRevisionId,
      expectedRevision,
      expectedPublicationRevision,
      idempotencyKey,
    ): Promise<{ publicSlug: string; publicationRevision: number }> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/invitations/{designId}/publication',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, designId },
            header: { 'Idempotency-Key': intent('publish-design', idempotencyKey) },
          },
          body: { designRevisionId, expectedRevision, expectedPublicationRevision },
        },
      );
      if (error !== undefined) throw new Error('Không thể xuất bản thiệp cưới.', { cause: error });
      return required(data).data;
    },

    async unpublishDesign(
      accessToken,
      bookingId,
      designId,
      expectedRevision,
      idempotencyKey,
    ): Promise<{ publicationRevision: number; publicInvitationId: string; published: false }> {
      const { data, error } = await api().DELETE(
        '/bookings/{bookingId}/invitations/{designId}/publication',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, designId },
            header: { 'Idempotency-Key': intent('unpublish-design', idempotencyKey) },
          },
          body: { expectedRevision },
        },
      );
      if (error !== undefined)
        throw new Error('Không thể hủy xuất bản thiệp cưới.', { cause: error });
      return required(data).data;
    },

    ...jobMethods,

    async listTemplates(accessToken): Promise<readonly TemplateItemView[]> {
      const { data, error } = await api().GET('/invitation-templates', {
        headers: headers(accessToken),
      });
      if (error !== undefined)
        throw new Error('Không thể tải danh sách mẫu thiệp.', { cause: error });
      return required(data).data.items as unknown as readonly TemplateItemView[];
    },

    ...printMethods,
    ...mediaMethods,

    async getPublicInvitation(slug): Promise<PublicInvitationView> {
      const { data, error } = await api().GET('/public/invitations/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined)
        throw new Error('Thiệp cưới không tồn tại hoặc đã bị gỡ bỏ.', { cause: error });
      return required(data).data as unknown as PublicInvitationView;
    },
  };
}
