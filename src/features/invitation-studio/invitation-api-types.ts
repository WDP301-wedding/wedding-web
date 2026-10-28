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

/** Job tạo ảnh AI chạy nền: QUEUED → RUNNING → SUCCEEDED | FAILED | RECOVERY_REQUIRED. */
export type ImageJobView =
  operations['getInvitationImageJob']['responses'][200]['content']['application/json']['data'];
export type ImageAspectRatio =
  operations['enqueueInvitationImageJob']['requestBody']['content']['application/json']['aspectRatio'];

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

export type ContractedPrintSource = Readonly<{
  agreementRevisionId: string;
  offeringId: string;
  sourceRevisionId: string;
  name: string;
  quantity: number;
}>;

export type PrintRequestLine = Readonly<{
  designId: string;
  quantity: number;
  commercialSource?: Readonly<{
    agreementRevisionId: string;
    offeringId: string;
    sourceRevisionId: string;
  }>;
}>;

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
  /** Gửi yêu cầu tạo ảnh AI (202, chạy nền). Cùng key + cùng nội dung → trả lại job cũ, không tạo lượt mới. */
  enqueueImageJob(
    this: void,
    accessToken: string,
    bookingId: string,
    prompt: string,
    aspectRatio: ImageAspectRatio,
    idempotencyKey: string,
  ): Promise<ImageJobView>;
  getImageJob(
    this: void,
    accessToken: string,
    bookingId: string,
    jobId: string,
  ): Promise<ImageJobView>;
  /** Job mới nhất trước (gồm cả job đã xong) — dùng để theo dõi tiếp sau khi tải lại trang. */
  listImageJobs(
    this: void,
    accessToken: string,
    bookingId: string,
  ): Promise<readonly ImageJobView[]>;
  /** Khôi phục job RECOVERY_REQUIRED: dùng lại kết quả đã có, không mua lượt tạo ảnh mới. */
  recoverImageJob(
    this: void,
    accessToken: string,
    bookingId: string,
    jobId: string,
    idempotencyKey: string,
  ): Promise<ImageJobView>;
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
    lines: readonly PrintRequestLine[],
    idempotencyKey?: string,
  ): Promise<PrintOrderView>;
  /**
   * Các dòng "in thiệp" trong thoả thuận đang hiệu lực (hợp đồng + phụ lục đã duyệt).
   * Đơn in phải trỏ tới nguồn này để backend không tính tiền in lần hai.
   * Tuỳ chọn để các bản giả lập trong test cũ vẫn hợp lệ.
   */
  contractedPrintSources?(
    this: void,
    accessToken: string,
    bookingId: string,
  ): Promise<readonly ContractedPrintSource[]>;
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

