import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { operations } from '../../lib/api/generated/schema';

export type DesignView =
  operations['getWeddingInvitation']['responses'][200]['content']['application/json']['data'];
export type PrintOrderView =
  operations['getPrintOrder']['responses'][200]['content']['application/json']['data'];
export type PublicInvitationView =
  operations['getPublicInvitation']['responses'][200]['content']['application/json']['data'];
export type TemplateItemView =
  operations['listInvitationTemplates']['responses'][200]['content']['application/json']['data']['items'][number];
export type MediaAssetView =
  operations['uploadWeddingMedia']['responses'][201]['content']['application/json']['data'];
export type MediaPreviewView =
  operations['getWeddingMediaOriginal']['responses'][200]['content']['application/json']['data'];
export type DerivedAssetView =
  operations['deriveWeddingInvitationAsset']['responses'][201]['content']['application/json']['data'];

export type DesignTextFields = {
  brideName?: string;
  groomName?: string;
  greeting?: string;
  message?: string;
  footer?: string;
};

export type DesignSection = {
  kind: 'HERO' | 'MESSAGE' | 'EVENT' | 'TIMELINE' | 'SEATING' | 'FOOTER';
  textKey: 'brideName' | 'groomName' | 'greeting' | 'message' | 'footer' | null;
  derivedAssetId: string | null;
};

export type DesignContentInput = {
  title: string;
  textFields: DesignTextFields;
  sections: readonly DesignSection[];
  derivedAssetIds: readonly string[];
  includesSeating: boolean;
};

export type ReviseDesignInput = {
  expectedRevision: number;
  content?: DesignContentInput;
  textFields?: DesignTextFields;
};

export interface InvitationGateway {
  listDesigns(this: void, accessToken: string, bookingId: string): Promise<readonly DesignView[]>;
  getDesign(
    this: void,
    accessToken: string,
    bookingId: string,
    designId: string,
  ): Promise<DesignView>;
  createDesign(
    this: void,
    accessToken: string,
    bookingId: string,
    content: DesignContentInput,
    idempotencyKey?: string,
  ): Promise<DesignView>;
  reviseDesign(
    this: void,
    accessToken: string,
    bookingId: string,
    designId: string,
    input: ReviseDesignInput,
    idempotencyKey?: string,
  ): Promise<DesignView>;
  publishDesign(
    this: void,
    accessToken: string,
    bookingId: string,
    designId: string,
    designRevisionId: string,
    expectedRevision: number,
    expectedPublicationRevision: number,
    idempotencyKey?: string,
  ): Promise<{ publicSlug: string; publicationRevision: number }>;
  unpublishDesign(
    this: void,
    accessToken: string,
    bookingId: string,
    designId: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<{ publicationRevision: number; publicInvitationId: string; published: false }>;
  generateImage(
    this: void,
    accessToken: string,
    bookingId: string,
    prompt: string,
    aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9',
    idempotencyKey?: string,
  ): Promise<{
    mediaAssetId: string;
    previewPath: string;
    derivedAssetId?: string;
    previewUrl?: string;
  }>;
  listTemplates(this: void, accessToken: string): Promise<readonly TemplateItemView[]>;
  listPrintOrders(
    this: void,
    accessToken: string,
    bookingId: string,
  ): Promise<readonly PrintOrderView[]>;
  getPrintOrder(
    this: void,
    accessToken: string,
    bookingId: string,
    orderId: string,
  ): Promise<PrintOrderView>;
  requestPrintOrder(
    this: void,
    accessToken: string,
    bookingId: string,
    lines: readonly { designId: string; quantity: number }[],
    idempotencyKey?: string,
  ): Promise<PrintOrderView>;
  approvePrintOrder(
    this: void,
    accessToken: string,
    bookingId: string,
    orderId: string,
    commercialRevisionId: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<PrintOrderView>;
  cancelPrintOrder(
    this: void,
    accessToken: string,
    bookingId: string,
    orderId: string,
    expectedRevision: number,
    reason: string,
    idempotencyKey?: string,
  ): Promise<void>;
  uploadMedia(
    this: void,
    accessToken: string,
    bookingId: string,
    file: File | Blob,
    altText: string,
    expectedRevision?: number,
    idempotencyKey?: string,
  ): Promise<MediaAssetView>;
  detachMedia(
    this: void,
    accessToken: string,
    bookingId: string,
    assetId: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<MediaAssetView>;
  getMediaPreview(
    this: void,
    accessToken: string,
    bookingId: string,
    assetId: string,
  ): Promise<MediaPreviewView>;
  deriveAsset(
    this: void,
    accessToken: string,
    bookingId: string,
    mediaAssetId: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<DerivedAssetView>;
  getPublicInvitation(this: void, slug: string): Promise<PublicInvitationView>;
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

    async generateImage(
      accessToken,
      bookingId,
      prompt,
      aspectRatio = '1:1',
      idempotencyKey,
    ): Promise<{
      mediaAssetId: string;
      previewPath: string;
      derivedAssetId?: string;
      previewUrl?: string;
    }> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/invitation-image-generations',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId },
            header: { 'Idempotency-Key': intent('generate-image', idempotencyKey) },
          },
          body: { prompt, aspectRatio },
        },
      );
      if (error !== undefined) throw new Error('Không thể tạo hình ảnh với AI.', { cause: error });
      const asset = required(data).data;
      const { data: derived, error: deriveError } = await api().POST(
        '/bookings/{bookingId}/invitation-derived-assets',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId },
            header: {
              'Idempotency-Key': intent(
                'derive-image',
                idempotencyKey ? idempotencyKey + ':derive' : undefined,
              ),
            },
          },
          body: { mediaAssetId: asset.mediaAssetId, expectedRevision: asset.revision },
        },
      );
      if (deriveError !== undefined)
        throw new Error('Không thể chuẩn bị ảnh cho thiệp.', { cause: deriveError });
      const { data: preview } = await api().GET('/bookings/{bookingId}/media/{assetId}', {
        headers: headers(accessToken),
        params: { path: { bookingId, assetId: asset.mediaAssetId } },
      });
      return {
        mediaAssetId: asset.mediaAssetId,
        previewPath: asset.previewPath,
        derivedAssetId: required(derived).data.derivedAssetId,
        ...(preview ? { previewUrl: preview.data.signedUrl } : {}),
      };
    },

    async listTemplates(accessToken): Promise<readonly TemplateItemView[]> {
      const { data, error } = await api().GET('/invitation-templates', {
        headers: headers(accessToken),
      });
      if (error !== undefined)
        throw new Error('Không thể tải danh sách mẫu thiệp.', { cause: error });
      return required(data).data.items as unknown as readonly TemplateItemView[];
    },

    async listPrintOrders(accessToken, bookingId): Promise<readonly PrintOrderView[]> {
      const { data, error } = await api().GET('/bookings/{bookingId}/print-orders', {
        headers: headers(accessToken),
        params: { path: { bookingId } },
      });
      if (error !== undefined)
        throw new Error('Không thể tải danh sách đơn in thiệp.', { cause: error });
      return required(data).data.items as unknown as readonly PrintOrderView[];
    },

    async getPrintOrder(accessToken, bookingId, orderId): Promise<PrintOrderView> {
      const { data, error } = await api().GET('/bookings/{bookingId}/print-orders/{orderId}', {
        headers: headers(accessToken),
        params: { path: { bookingId, orderId } },
      });
      if (error !== undefined)
        throw new Error('Không thể tải chi tiết đơn in thiệp.', { cause: error });
      return required(data).data as unknown as PrintOrderView;
    },

    async requestPrintOrder(
      accessToken,
      bookingId,
      lines,
      idempotencyKey,
    ): Promise<PrintOrderView> {
      const { data, error } = await api().POST('/bookings/{bookingId}/print-orders', {
        headers: headers(accessToken),
        params: {
          path: { bookingId },
          header: { 'Idempotency-Key': intent('request-print-order', idempotencyKey) },
        },
        body: { lines },
      });
      if (error !== undefined) throw new Error('Không thể gửi yêu cầu in thiệp.', { cause: error });
      return required(data).data as unknown as PrintOrderView;
    },

    async approvePrintOrder(
      accessToken,
      bookingId,
      orderId,
      commercialRevisionId,
      expectedRevision,
      idempotencyKey,
    ): Promise<PrintOrderView> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/print-orders/{orderId}/approval',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, orderId },
            header: { 'Idempotency-Key': intent('approve-print-order', idempotencyKey) },
          },
          body: { commercialRevisionId, expectedRevision },
        },
      );
      if (error !== undefined)
        throw new Error('Không thể phê duyệt báo giá in thiệp.', { cause: error });
      return required(data).data as unknown as PrintOrderView;
    },

    async cancelPrintOrder(
      accessToken,
      bookingId,
      orderId,
      expectedRevision,
      reason,
      idempotencyKey,
    ): Promise<void> {
      const { error } = await api().POST(
        '/bookings/{bookingId}/print-orders/{orderId}/cancellation',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, orderId },
            header: { 'Idempotency-Key': intent('cancel-print-order', idempotencyKey) },
          },
          body: { expectedRevision, reason },
        },
      );
      if (error !== undefined) throw new Error('Không thể hủy đơn in thiệp.', { cause: error });
    },

    async uploadMedia(
      accessToken,
      bookingId,
      file,
      altText,
      expectedRevision,
      idempotencyKey,
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
      accessToken,
      bookingId,
      assetId,
      expectedRevision,
      idempotencyKey,
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

    async getMediaPreview(accessToken, bookingId, assetId): Promise<MediaPreviewView> {
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
      accessToken,
      bookingId,
      mediaAssetId,
      expectedRevision,
      idempotencyKey,
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
