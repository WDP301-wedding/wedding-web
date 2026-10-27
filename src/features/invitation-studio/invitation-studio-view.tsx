'use client';
import { useLiveRefresh, LiveUpdateNotice } from '../realtime/use-live-refresh';
import { z } from 'zod';
import { InlineError } from '../../design-system/inline-error';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { sharedCoupleRealtime } from '../realtime/realtime-client';
import { browserSession } from '../identity-access/browser-session';

import {
  InvitationContents,
  type InvitationEvent,
  type InvitationContent,
} from './invitation-content';
import { ApiClientError } from '../../lib/api/client';
import { readPublicEnv } from '../../lib/env';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import type {
  ContractedPrintSource,
  InvitationGateway,
  DesignView,
  PrintOrderView,
  TemplateItemView,
} from './invitation-api';
import { previewAssetId } from './invitation-api';
import { imageJobStatusText, useImageJob, type SucceededImageJob } from './use-image-job';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { notify } from '../../design-system/toast';

const publicationSnapshotSchema = z.object({
  publicationRevision: z.number().int().nonnegative(),
  published: z.boolean(),
  publicSlug: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
  publishedRevisionId: z.string().uuid().nullable(),
  designRevisionId: z.string().uuid().nullable(),
});

function invitationErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    const meta = ` (Mã: ${err.code}${err.status ? `, HTTP ${err.status}` : ''}${err.requestId ? `, RequestId: ${err.requestId.slice(0, 8)}` : ''})`;
    if (err.code === 'INVITATION_DESIGN_STALE')
      return `Bản thiết kế thiệp đã có phiên bản mới hơn trên máy chủ. Vui lòng làm mới trang để nhận bản mới nhất.${meta}`;
    if (err.code === 'INVITATION_PUBLICATION_STALE')
      return `Phiên bản xuất bản thiệp không đồng bộ với máy chủ. Vui lòng thử lại hoặc tải lại trang.${meta}`;
    if (err.code === 'PRINT_ORDER_STATE_INVALID')
      return `Trạng thái đơn in hiện tại không cho phép thực hiện thao tác này.${meta}`;
    if (err.code === 'PRINT_QUOTE_EXPIRED')
      return `Báo giá in thiệp đã hết hạn (quá 7 ngày). Vui lòng gửi yêu cầu báo giá mới.${meta}`;
    if (err.code === 'PRINT_QUOTE_STALE')
      return `Báo giá đã thay đổi hoặc không còn hiệu lực. Vui lòng làm mới đơn hàng.${meta}`;
    if (err.code === 'PRINT_CANCELLATION_NOT_ALLOWED')
      return `Đơn in đang trong quá trình sản xuất hoặc đã hoàn tất, không thể hủy.${meta}`;
    if (err.code === 'PRINTABLE_TIMELINE_NOT_EFFECTIVE')
      return `Kịch bản tiệc chưa có hiệu lực hoặc chưa được cả hai bên phê duyệt, chưa thể xuất bản thiệp.${meta}`;
    if (err.code === 'PRINTABLE_SEATING_REQUIRES_REVIEW')
      return `Sơ đồ sắp bàn cần được rà soát trước khi xuất bản thiệp.${meta}`;
    if (err.code === 'MEDIA_QUOTA_EXCEEDED')
      return `Đã vượt quá hạn ngạch hình ảnh cho phép (tối đa 100 ảnh hoặc 1 GiB mỗi tiệc).${meta}`;
    if (err.code === 'MEDIA_CUTOFF_REACHED')
      return `Đã hết hạn tải ảnh lên cho tiệc cưới (hạn chót khóa trước giờ tiệc 72 giờ).${meta}`;
    if (err.code === 'MEDIA_REVISION_STALE')
      return `Tệp hình ảnh không đồng bộ phiên bản với máy chủ. Vui lòng thử lại.${meta}`;
    if (err.code === 'IDEMPOTENCY_KEY_REUSED')
      return `Khóa thao tác đã được sử dụng cho một yêu cầu khác. Vui lòng làm mới trang.${meta}`;
    if (err.code === 'IDEMPOTENCY_KEY_REQUIRED')
      return `Yêu cầu cần có mã nhận diện thao tác idempotency.${meta}`;
    if (err.code === 'REQUEST_IN_PROGRESS')
      return `Một yêu cầu tương tự đang được xử lý trên máy chủ. Vui lòng chờ trong giây lát.${meta}`;
    if (err.code === 'RATE_LIMIT_EXCEEDED')
      return `Thao tác quá nhanh. Vui lòng đợi ${err.retryAfterSeconds ?? 'vài'} giây rồi thử lại.${meta}`;
    if (err.code === 'REQUEST_TIMEOUT')
      return `Yêu cầu máy chủ đã quá thời gian chờ (10 giây). Vui lòng kiểm tra lại đường truyền internet.${meta}`;
    if (err.code === 'NETWORK_ERROR')
      return `Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền internet.${meta}`;
    if (err.code === 'VALIDATION_ERROR')
      return `Dữ liệu gửi lên không đúng định dạng quy định. Vui lòng kiểm tra lại.${meta}`;
    if (err.status === 401 || err.code === 'AUTHENTICATION_REQUIRED')
      return `Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.${meta}`;
    if (err.status === 403)
      return `Bạn không có quyền thực hiện thao tác này trên hồ sơ tiệc cưới.${meta}`;
    if (err.status === 404) return `Không tìm thấy tài nguyên yêu cầu trên máy chủ.${meta}`;
    if (err.message) return `${err.message}${meta}`;
  }
  return err instanceof Error ? err.message : fallback;
}

function getApiBaseUrl(): string {
  try {
    return readPublicEnv().NEXT_PUBLIC_API_BASE_URL;
  } catch {
    return 'http://localhost:3000';
  }
}

export interface InvitationStudioViewProps {
  readonly event?: InvitationEvent | null;
  readonly timeline?: InvitationContent['timeline'];
  readonly bookingId: string;
  readonly accessToken: string;
  readonly gateway: InvitationGateway;
  readonly onTabChange?: (tab: 'design' | 'media' | 'publish' | 'print') => void;
  readonly initialTab?: 'design' | 'media' | 'publish' | 'print';
  readonly initialDesigns?: readonly DesignView[];
  readonly initialOrders?: readonly PrintOrderView[];
  readonly initialTemplates?: readonly TemplateItemView[];
  /**
   * Mốc khoá ảnh ƯỚC TÍNH (ISO) từ lịch tiệc — xem media-cutoff.ts. Đã qua mốc thì hiện cảnh báo
   * trước khi người dùng mất công nhập mô tả/chọn ảnh (backend vẫn quyết định cuối cùng).
   */
  readonly mediaCutoffEstimate?: string | null;
}

const orderStatusMap: Record<string, { label: string; className: string }> = {
  REQUESTED: { label: 'Chờ báo giá', className: 'is-warning' },
  QUOTED: { label: 'Đã có báo giá', className: 'is-info' },
  APPROVED: { label: 'Đã duyệt in', className: 'is-success' },
  IN_PRODUCTION: { label: 'Đang in ấn', className: 'is-info' },
  READY_FOR_HANDOVER: { label: 'Sẵn sàng bàn giao', className: 'is-success' },
  HANDED_OVER: { label: 'Đã bàn giao', className: 'is-success' },
  CANCELLED: { label: 'Đã hủy', className: '' },
};

export function InvitationStudioView({
  event = null,
  timeline = [],
  bookingId,
  accessToken,
  gateway,
  initialTab = 'design',
  onTabChange,
  initialDesigns = [],
  initialOrders,
  mediaCutoffEstimate = null,
}: InvitationStudioViewProps) {
  // Mốc thời gian lấy một lần khi mở Studio (lazy init: không gọi Date.now() mỗi lần render).
  const [openedAt] = useState(() => Date.now());
  const mediaLikelyLocked =
    mediaCutoffEstimate !== null && openedAt >= Date.parse(mediaCutoffEstimate);
  const mediaLockNote = mediaLikelyLocked ? (
    <p className="studio-hint studio-hint-warning" role="note">
      Theo lịch tiệc, hạn chỉnh sửa ảnh (72 giờ trước giờ khai tiệc) đã qua nên nhiều khả năng không
      tạo/tải ảnh mới được nữa. Nếu cần, hãy liên hệ nhà hàng để được gia hạn.
    </p>
  ) : null;
  const [activeTab, setActiveTab] = useState<'design' | 'media' | 'publish' | 'print'>(initialTab);
  const prevInitialTab = React.useRef(initialTab);
  useEffect(() => {
    if (prevInitialTab.current !== initialTab) {
      prevInitialTab.current = initialTab;
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  function selectTab(tab: 'design' | 'media' | 'publish' | 'print') {
    setActiveTab(tab);
    onTabChange?.(tab);
  }
  const [designs, setDesigns] = useState<readonly DesignView[]>(initialDesigns);
  // null = chưa tải: đơn in chỉ tải khi mở tab "Đặt in" lần đầu (không truyền initialOrders).
  const [orders, setOrders] = useState<readonly PrintOrderView[] | null>(initialOrders ?? null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  // Đánh dấu bằng state (không dùng ref) để effect tải vẫn chạy đúng khi StrictMode chạy lại effect.
  const [printVisited, setPrintVisited] = useState(initialTab === 'print');
  if (activeTab === 'print' && !printVisited) setPrintVisited(true);
  const loadOrders = initialOrders === undefined;

  // Design form state
  const [title, setTitle] = useState(designs[0]?.title ?? 'Thiệp Cưới Hạnh Phúc');
  const [brideName, setBrideName] = useState(designs[0]?.textFields?.brideName ?? '');
  const [groomName, setGroomName] = useState(designs[0]?.textFields?.groomName ?? '');
  const [greeting, setGreeting] = useState(
    designs[0]?.textFields?.greeting ?? 'Trân trọng kính mời',
  );
  const [message, setMessageText] = useState(
    designs[0]?.textFields?.message ?? 'Đến tham dự buổi tiệc chung vui cùng gia đình chúng tôi',
  );
  const [derivedAssetIds, setDerivedAssetIds] = useState<readonly string[]>(
    designs[0]?.derivedAssetIds ?? [],
  );
  const [footer, setFooter] = useState(designs[0]?.textFields?.footer ?? '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [designDirty, setDesignDirty] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publicationRevision, setPublicationRevision] = useState<number | null>(null);
  const incomingPublication = React.useRef<z.infer<typeof publicationSnapshotSchema> | null>(null);

  // Print order form state
  const [printQuantity, setPrintQuantity] = useState(100);
  const [isOrdering, setIsOrdering] = useState(false);
  // Kết quả thao tác hiển thị bằng toast (sonner). Giữ tên `setNotice` để mọi chỗ gọi cũ không đổi;
  // `null` (xoá thông báo cũ) không còn cần vì toast tự ẩn.
  const setNotice = (next: { type: 'success' | 'error'; text: string } | null) => {
    if (next === null) return;
    if (next.type === 'success') notify.success(next.text);
    else notify.error(next.text);
  };
  const { confirm, dialog } = useConfirmDialog();

  // Media upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaAltText, setMediaAltText] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [previewingAssetId, setPreviewingAssetId] = useState<string | null>(null);
  const [detachingAssetId, setDetachingAssetId] = useState<string | null>(null);
  const [derivingAssetId, setDerivingAssetId] = useState<string | null>(null);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [publicationState, setPublicationState] = useState<
    'unknown' | 'unpublished' | 'published' | 'stale_conflict'
  >('unknown');

  const [uploadedMediaList, setUploadedMediaList] = useState<
    readonly {
      mediaAssetId: string;
      revision: number;
      altText: string;
      previewPath: string;
      signedUrl?: string | undefined;
      previewError?: FriendlyError | undefined;
      derivedAssetId?: string | undefined;
      deriveStatus?: 'ready' | 'failed' | 'pending' | undefined;
      deriveError?: string | undefined;
    }[]
  >([]);

  // Mutation idempotency key refs
  const saveKeyRef = React.useRef<{ signature: string; key: string } | null>(null);
  const publishKeyRef = React.useRef<{ signature: string; key: string } | null>(null);
  const unpublishKeyRef = React.useRef<{ signature: string; key: string } | null>(null);
  const orderKeyRef = React.useRef<{ signature: string; key: string } | null>(null);
  const approveKeyRef = React.useRef<{ signature: string; key: string } | null>(null);
  const cancelKeyRef = React.useRef<{ signature: string; key: string } | null>(null);
  const uploadKeyRef = React.useRef<{ signature: string; key: string } | null>(null);
  const deriveKeyRef = React.useRef<{ signature: string; key: string } | null>(null);
  const detachKeyRef = React.useRef<{ signature: string; key: string } | null>(null);

  function getOrGenerateKey(
    ref: React.MutableRefObject<{ signature: string; key: string } | null>,
    signature: string,
    scope: string,
  ): string {
    if (ref.current && ref.current.signature === signature) {
      return ref.current.key;
    }
    const newKey = `${scope}:${crypto.randomUUID()}`;
    ref.current = { signature, key: newKey };
    return newKey;
  }

  const currentDesign = designs[0];

  const handleSaveDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (saving) return;
    setSaving(true);
    const sanitizedSections = (currentDesign?.sections ?? []).filter(
      (section) => !section.derivedAssetId || derivedAssetIds.includes(section.derivedAssetId),
    );
    const newImageSections = derivedAssetIds
      .filter((id) => !sanitizedSections.some((section) => section.derivedAssetId === id))
      .map((id) => ({ kind: 'HERO' as const, textKey: null, derivedAssetId: id }));
    const finalSections = [...sanitizedSections, ...newImageSections];
    const signature = `${currentDesign?.designId ?? 'new'}:${currentDesign?.revisionNumber ?? 0}:${title}:${brideName}:${groomName}:${greeting}:${message}:${footer}:${derivedAssetIds.join(',')}`;
    const key = getOrGenerateKey(saveKeyRef, signature, 'save-design');
    try {
      if (currentDesign) {
        const updated = await gateway.reviseDesign(
          accessToken,
          bookingId,
          currentDesign.designId,
          {
            expectedRevision: currentDesign.revisionNumber,
            content: {
              title,
              textFields: {
                ...currentDesign.textFields,
                brideName,
                groomName,
                greeting,
                message,
                footer,
              },
              sections: finalSections,
              derivedAssetIds,
              includesSeating: currentDesign.includesSeating,
            },
          },
          key,
        );
        setDesigns([updated, ...designs.slice(1)]);
        setDesignDirty(false);
        saveKeyRef.current = null;
        setNotice({ type: 'success', text: 'Đã lưu bản thiết kế thiệp thành công!' });
      } else {
        const created = await gateway.createDesign(
          accessToken,
          bookingId,
          {
            title,
            textFields: { brideName, groomName, greeting, message, footer },
            sections: newImageSections,
            derivedAssetIds,
            includesSeating: false,
          },
          key,
        );
        setDesigns([created]);
        setDesignDirty(false);
        saveKeyRef.current = null;
        setNotice({ type: 'success', text: 'Đã tạo thiết kế thiệp cưới mới!' });
      }
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: invitationErrorMessage(err, 'Có lỗi xảy ra khi lưu thiết kế.'),
      });
    } finally {
      setSaving(false);
    }
  };

  // Ảnh AI đã tạo xong từ lần trước (tìm thấy khi mở lại Studio) nhưng chưa có trong thiệp:
  // chỉ gợi ý "Dùng ảnh này", không tự gắn — có thể người dùng đã chủ động gỡ ảnh đó.
  const [restoredAiImage, setRestoredAiImage] = useState<{
    derivedAssetId: string;
    previewUrl: string | null;
  } | null>(null);
  const showAiPreview = async (job: SucceededImageJob): Promise<string | null> => {
    const assetId = previewAssetId(job.result.previewPath) ?? job.result.mediaAssetId;
    try {
      return (await gateway.getMediaPreview(accessToken, bookingId, assetId)).signedUrl;
    } catch {
      return null; // Ảnh vẫn dùng được trong thiệp, chỉ thiếu ảnh xem trước.
    }
  };
  const aiJob = useImageJob({
    gateway,
    accessToken,
    bookingId,
    onSucceeded: (job, restored) => {
      const { derivedAssetId } = job.result;
      if (restored) {
        if (derivedAssetIds.includes(derivedAssetId)) return;
        void showAiPreview(job).then((url) =>
          setRestoredAiImage({ derivedAssetId, previewUrl: url }),
        );
        return;
      }
      setDesignDirty(true);
      setDerivedAssetIds((ids) => (ids.includes(derivedAssetId) ? ids : [...ids, derivedAssetId]));
      void showAiPreview(job).then((url) => url && setPreviewUrl(url));
      setNotice({
        type: 'success',
        text: 'Ảnh đã sẵn sàng. Lưu thiết kế để sử dụng ảnh trên thiệp.',
      });
    },
  });
  const applyRestoredAiImage = () => {
    if (!restoredAiImage) return;
    const { derivedAssetId } = restoredAiImage;
    setDesignDirty(true);
    setDerivedAssetIds((ids) => (ids.includes(derivedAssetId) ? ids : [...ids, derivedAssetId]));
    if (restoredAiImage.previewUrl) setPreviewUrl(restoredAiImage.previewUrl);
    setRestoredAiImage(null);
    setNotice({ type: 'success', text: 'Đã thêm ảnh. Lưu thiết kế để sử dụng ảnh trên thiệp.' });
  };

  const handleAiGenerate = () => {
    if (!aiPrompt.trim() || aiJob.busy) return;
    setNotice(null);
    setRestoredAiImage(null);
    void aiJob.start(aiPrompt.trim());
  };

  const handlePublish = async () => {
    if (!currentDesign || publicationRevision === null) return;
    setIsPublishing(true);
    setNotice(null);
    const pubRev = publicationRevision;
    const signature = `${currentDesign.designId}:${currentDesign.revisionId}:${currentDesign.revisionNumber}:${pubRev}`;
    const key = getOrGenerateKey(publishKeyRef, signature, 'publish-design');
    try {
      const res = await gateway.publishDesign(
        accessToken,
        bookingId,
        currentDesign.designId,
        currentDesign.revisionId,
        currentDesign.revisionNumber,
        pubRev,
        key,
      );
      setPublishedSlug(res.publicSlug);
      setPublicationRevision(res.publicationRevision);
      setPublicationState('published');
      publishKeyRef.current = null;
      setNotice({ type: 'success', text: 'Thiệp cưới đã được xuất bản trực tuyến!' });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'INVITATION_PUBLICATION_STALE') {
        setPublicationState('stale_conflict');
        sharedCoupleRealtime.requestBookingResync(bookingId);
      }
      setNotice({
        type: 'error',
        text: invitationErrorMessage(err, 'Không thể xuất bản thiệp cưới.'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!currentDesign || publicationRevision === null) return;
    const agreed = await confirm({
      title: 'Huỷ xuất bản thiệp?',
      description:
        'Đường dẫn thiệp công khai sẽ ngừng hoạt động — khách đã nhận link sẽ không mở được nữa. Bạn có thể xuất bản lại sau.',
      confirmLabel: 'Huỷ xuất bản',
      cancelLabel: 'Giữ thiệp',
      tone: 'danger',
    });
    if (!agreed) return;
    setIsPublishing(true);
    setNotice(null);
    const pubRev = publicationRevision;
    const signature = `${currentDesign.designId}:${pubRev}`;
    const key = getOrGenerateKey(unpublishKeyRef, signature, 'unpublish-design');
    try {
      const res = await gateway.unpublishDesign(
        accessToken,
        bookingId,
        currentDesign.designId,
        pubRev,
        key,
      );
      const nextRev = res.publicationRevision;
      setPublishedSlug(null);
      setPublicationRevision(nextRev);
      setPublicationState('unpublished');
      unpublishKeyRef.current = null;
      setNotice({ type: 'success', text: 'Đã hủy xuất bản thiệp cưới.' });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: invitationErrorMessage(err, 'Không thể hủy xuất bản thiệp cưới.'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Dòng in thiệp đã có trong hợp đồng/phụ lục (nếu có). Chọn nguồn này để không bị tính tiền 2 lần.
  const [printSources, setPrintSources] = useState<readonly ContractedPrintSource[]>([]);
  const [printSourcesError, setPrintSourcesError] = useState<FriendlyError | null>(null);
  const [sourcesReady, setSourcesReady] = useState(
    () => gateway.contractedPrintSources === undefined,
  );
  const [printSourceIndex, setPrintSourceIndex] = useState(0);
  const printSourcesLoaded = React.useRef(false);

  const selectedPrintSource = printSources[printSourceIndex];

  const handleRequestPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcesReady || printSourcesError) return;
    if (!currentDesign) {
      setNotice({ type: 'error', text: 'Cần lưu thiết kế trước khi đặt in.' });
      return;
    }
    setIsOrdering(true);
    setNotice(null);
    const signature = `${currentDesign.designId}:${printQuantity}:${selectedPrintSource?.offeringId ?? ''}`;
    const key = getOrGenerateKey(orderKeyRef, signature, 'request-print-order');
    try {
      const newOrder = await gateway.requestPrintOrder(
        accessToken,
        bookingId,
        [
          {
            designId: currentDesign.designId,
            quantity: printQuantity,
            ...(selectedPrintSource
              ? {
                  commercialSource: {
                    agreementRevisionId: selectedPrintSource.agreementRevisionId,
                    offeringId: selectedPrintSource.offeringId,
                    sourceRevisionId: selectedPrintSource.sourceRevisionId,
                  },
                }
              : {}),
          },
        ],
        key,
      );
      setOrders([newOrder, ...(orders ?? [])]);
      orderKeyRef.current = null;
      setNotice({ type: 'success', text: 'Đã gửi yêu cầu in thiệp giấy! Quản lý sẽ sớm báo giá.' });
    } catch (err: unknown) {
      setNotice({ type: 'error', text: invitationErrorMessage(err, 'Không thể đặt in.') });
    } finally {
      setIsOrdering(false);
    }
  };

  const handleApproveQuote = async (order: PrintOrderView) => {
    if (!order.currentCommercialRevision || approvingOrderId || cancellingOrderId) return;
    const total = Number(order.currentCommercialRevision.orderTotalVnd).toLocaleString('vi-VN');
    const agreed = await confirm({
      title: 'Duyệt báo giá in thiệp?',
      description: `Hai bạn đồng ý với báo giá ${total} đ. Sau khi duyệt, nhà hàng sẽ tiến hành in theo báo giá này.`,
      confirmLabel: 'Duyệt báo giá',
    });
    if (!agreed) return;
    setApprovingOrderId(order.orderId);
    const signature = `${order.orderId}:${order.currentCommercialRevision.commercialRevisionId}:${order.revision}`;
    const key = getOrGenerateKey(approveKeyRef, signature, 'approve-print-order');
    try {
      const updated = await gateway.approvePrintOrder(
        accessToken,
        bookingId,
        order.orderId,
        order.currentCommercialRevision.commercialRevisionId,
        order.revision,
        key,
      );
      setOrders((orders ?? []).map((o) => (o.orderId === order.orderId ? updated : o)));
      approveKeyRef.current = null;
      setNotice({
        type: 'success',
        text: 'Đã duyệt báo giá in thiệp thành công! Đơn hàng bắt đầu sản xuất.',
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: invitationErrorMessage(err, 'Không thể duyệt báo giá.'),
      });
    } finally {
      setApprovingOrderId(null);
    }
  };

  const handleCancelOrder = async (order: PrintOrderView) => {
    if (approvingOrderId || cancellingOrderId) return;
    const agreed = await confirm({
      title: 'Huỷ đơn in thiệp?',
      description:
        'Đơn in thiệp này sẽ bị huỷ và không thể khôi phục. Muốn in lại, bạn cần tạo đơn mới.',
      confirmLabel: 'Huỷ đơn in',
      cancelLabel: 'Giữ đơn',
      tone: 'danger',
    });
    if (!agreed) return;
    setNotice(null);
    setCancellingOrderId(order.orderId);
    const signature = `${order.orderId}:${order.revision}`;
    const key = getOrGenerateKey(cancelKeyRef, signature, 'cancel-print-order');
    try {
      await gateway.cancelPrintOrder(
        accessToken,
        bookingId,
        order.orderId,
        order.revision,
        'Khách hàng yêu cầu hủy đơn in',
        key,
      );
      const reloaded = await gateway.listPrintOrders(accessToken, bookingId);
      setOrders(reloaded);
      cancelKeyRef.current = null;
      setNotice({ type: 'success', text: 'Đã hủy đơn in thiệp thành công.' });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: invitationErrorMessage(err, 'Không thể hủy đơn in.'),
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const retryMediaPreview = async (mediaAssetId: string) => {
    if (previewingAssetId !== null) return;
    setPreviewingAssetId(mediaAssetId);
    try {
      const preview = await browserSession.authorize((token) =>
        gateway.getMediaPreview(token, bookingId, mediaAssetId),
      );
      setUploadedMediaList((current) =>
        current.map((item) =>
          item.mediaAssetId === mediaAssetId
            ? { ...item, signedUrl: preview.signedUrl, previewError: undefined }
            : item,
        ),
      );
    } catch (error) {
      const friendly = describeApiError(error);
      setUploadedMediaList((current) =>
        current.map((item) =>
          item.mediaAssetId === mediaAssetId ? { ...item, previewError: friendly } : item,
        ),
      );
    } finally {
      setPreviewingAssetId(null);
    }
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !mediaAltText.trim() || isUploadingMedia) return;
    if (selectedFile.size > 25 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Tệp hình ảnh vượt quá dung lượng tối đa 25MB.' });
      return;
    }
    const signature = `${selectedFile.name}:${selectedFile.size}:${selectedFile.lastModified}:${mediaAltText.trim()}`;
    const key = getOrGenerateKey(uploadKeyRef, signature, 'upload-media');
    setIsUploadingMedia(true);
    setNotice(null);
    try {
      const asset = await gateway.uploadMedia(
        accessToken,
        bookingId,
        selectedFile,
        mediaAltText.trim(),
        undefined,
        key,
      );
      let signedUrl: string | undefined;
      let previewError: FriendlyError | undefined;
      try {
        const preview = await gateway.getMediaPreview(accessToken, bookingId, asset.mediaAssetId);
        signedUrl = preview.signedUrl;
      } catch (error) {
        previewError = describeApiError(error);
      }
      let derivedId: string | undefined;
      let deriveStatus: 'ready' | 'failed' = 'failed';
      let deriveError: string | undefined;
      try {
        const derived = await gateway.deriveAsset(
          accessToken,
          bookingId,
          asset.mediaAssetId,
          asset.revision,
          key + ':derive',
        );
        derivedId = derived.derivedAssetId;
        deriveStatus = 'ready';
        setDerivedAssetIds((ids) =>
          ids.includes(derived.derivedAssetId) ? ids : [...ids, derived.derivedAssetId],
        );
      } catch (dErr: unknown) {
        deriveStatus = 'failed';
        deriveError = invitationErrorMessage(dErr, 'Chưa thể tạo ảnh phái sinh cho thiệp.');
      }
      setUploadedMediaList((prev) => [
        {
          mediaAssetId: asset.mediaAssetId,
          revision: asset.revision,
          altText: mediaAltText.trim(),
          previewPath: asset.previewPath,
          signedUrl,
          previewError,
          derivedAssetId: derivedId,
          deriveStatus,
          deriveError,
        },
        ...prev,
      ]);
      setSelectedFile(null);
      setMediaAltText('');
      uploadKeyRef.current = null;
      setNotice({
        type: 'success',
        text: `Đã tải lên tệp ảnh thành công! ${derivedId ? 'Ảnh đã sẵn sàng dùng trong thiệp.' : 'Có thể thử lại tạo ảnh cho thiệp bên dưới.'}`,
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: invitationErrorMessage(err, 'Không thể tải lên hình ảnh.'),
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRetryDerive = async (item: {
    mediaAssetId: string;
    revision: number;
    altText: string;
  }) => {
    if (derivingAssetId) return;
    setDerivingAssetId(item.mediaAssetId);
    setNotice(null);
    const signature = `retry-derive:${item.mediaAssetId}:${item.revision}`;
    const key = getOrGenerateKey(deriveKeyRef, signature, 'derive-image');
    try {
      const derived = await gateway.deriveAsset(
        accessToken,
        bookingId,
        item.mediaAssetId,
        item.revision,
        key,
      );
      setDerivedAssetIds((ids) =>
        ids.includes(derived.derivedAssetId) ? ids : [...ids, derived.derivedAssetId],
      );
      setUploadedMediaList((prev) =>
        prev.map((m) =>
          m.mediaAssetId === item.mediaAssetId
            ? {
                ...m,
                derivedAssetId: derived.derivedAssetId,
                deriveStatus: 'ready' as const,
                deriveError: undefined,
              }
            : m,
        ),
      );
      deriveKeyRef.current = null;
      setNotice({ type: 'success', text: 'Đã tạo ảnh phái sinh cho thiệp thành công!' });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: invitationErrorMessage(err, 'Không thể tạo ảnh phái sinh.'),
      });
    } finally {
      setDerivingAssetId(null);
    }
  };

  const handleInsertImageIntoDesign = (derivedAssetId: string) => {
    setDerivedAssetIds((ids) => (ids.includes(derivedAssetId) ? ids : [...ids, derivedAssetId]));
    setNotice({
      type: 'success',
      text: 'Đã thêm ảnh vào bản thảo thiệp. Hãy nhấn "Lưu Bản Thiết Kế" để cập nhật.',
    });
  };

  const handleRemoveImageFromDesign = (derivedAssetId: string) => {
    setDerivedAssetIds((ids) => ids.filter((id) => id !== derivedAssetId));
    if (currentDesign) {
      const updatedSections = currentDesign.sections.filter(
        (s) => s.derivedAssetId !== derivedAssetId,
      );
      setDesigns([
        {
          ...currentDesign,
          sections: updatedSections,
        },
        ...designs.slice(1),
      ]);
    }
    setNotice({
      type: 'success',
      text: 'Đã bỏ ảnh khỏi bản thảo thiệp. Hãy lưu thiết kế để ghi nhận thay đổi.',
    });
  };

  const handleDetachMedia = async (
    mediaAssetId: string,
    revision: number,
    derivedAssetId?: string,
  ) => {
    if (detachingAssetId) return;
    const agreed = await confirm({
      title: 'Gỡ ảnh gốc khỏi hồ sơ?',
      description:
        'Ảnh gốc và ảnh đã chuẩn bị cho thiệp sẽ bị gỡ vĩnh viễn, thiệp đang dùng ảnh này cũng sẽ bỏ ảnh. Thao tác không thể hoàn tác.',
      confirmLabel: 'Gỡ ảnh',
      tone: 'danger',
    });
    if (!agreed) return;
    setDetachingAssetId(mediaAssetId);
    setNotice(null);
    const signature = `${mediaAssetId}:${revision}`;
    const key = getOrGenerateKey(detachKeyRef, signature, 'detach-media');
    try {
      await gateway.detachMedia(accessToken, bookingId, mediaAssetId, revision, key);
      setUploadedMediaList((prev) => prev.filter((m) => m.mediaAssetId !== mediaAssetId));
      if (derivedAssetId) {
        setDerivedAssetIds((ids) => ids.filter((id) => id !== derivedAssetId));
        if (currentDesign) {
          const updatedSections = currentDesign.sections.filter(
            (s) => s.derivedAssetId !== derivedAssetId,
          );
          setDesigns([
            {
              ...currentDesign,
              sections: updatedSections,
            },
            ...designs.slice(1),
          ]);
        }
      }
      detachKeyRef.current = null;
      setNotice({
        type: 'success',
        text: 'Đã gỡ bỏ hình ảnh gốc và làm sạch tham chiếu trong bản thảo thiệp.',
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: invitationErrorMessage(err, 'Không thể gỡ bỏ hình ảnh.'),
      });
    } finally {
      setDetachingAssetId(null);
    }
  };

  const writing =
    saving ||
    isPublishing ||
    isOrdering ||
    isUploadingMedia ||
    detachingAssetId !== null ||
    derivingAssetId !== null ||
    approvingOrderId !== null ||
    cancellingOrderId !== null;
  const publicationLive = useLiveRefresh(
    () => {
      const next = incomingPublication.current;
      incomingPublication.current = null;
      if (next && next.publicationRevision >= (publicationRevision ?? 0)) {
        setPublicationRevision(next.publicationRevision);
        setPublishedSlug(next.published ? next.publicSlug : null);
        setPublicationState(next.published ? 'published' : 'unpublished');
      }
    },
    { scope: bookingId + ':publication', bookingId, types: [], blocked: writing },
  );
  useRealtimeSubscription({
    bookingId,
    filterBooking: true,
    onEvent: (event) => {
      if (event.type !== 'print_order.updated' || event.scope.bookingId !== bookingId) return;
      const parsed = publicationSnapshotSchema.safeParse(event.payload?.['publication']);
      if (!parsed.success) return;
      if (
        !incomingPublication.current ||
        parsed.data.publicationRevision >= incomingPublication.current.publicationRevision
      ) {
        incomingPublication.current = parsed.data;
      }
      publicationLive.schedule();
    },
  });
  useEffect(() => {
    // The persistent workspace may have subscribed before Studio mounted.
    sharedCoupleRealtime.requestBookingResync(bookingId);
  }, [bookingId]);
  const designLive = useLiveRefresh(
    async (isCurrent) => {
      try {
        const loaded = await browserSession.authorize((token) =>
          gateway.listDesigns(token, bookingId),
        );
        if (!isCurrent()) return;
        const currentId = currentDesign?.designId;
        const first = loaded.find((item) => item.designId === currentId) ?? loaded[0];
        setDesigns(
          first ? [first, ...loaded.filter((item) => item.designId !== first.designId)] : [],
        );
        if (first) {
          setTitle(first.title);
          setBrideName(first.textFields.brideName ?? '');
          setGroomName(first.textFields.groomName ?? '');
          setGreeting(first.textFields.greeting ?? '');
          setMessageText(first.textFields.message ?? '');
          setFooter(first.textFields.footer ?? '');
          setDerivedAssetIds(first.derivedAssetIds);
        }
      } catch (err) {
        if (isCurrent()) notify.error(invitationErrorMessage(err, 'Không thể cập nhật thiệp.'));
      }
    },
    {
      scope: bookingId,
      bookingId,
      blocked: writing || designDirty,
      invalidateOnBlock: true,
      types: ['print_order.updated', 'booking.updated'],
    },
  );
  const printLive = useLiveRefresh(
    async (isCurrent) => {
      try {
        const loaded = await browserSession.authorize((token) =>
          gateway.listPrintOrders(token, bookingId),
        );
        if (!isCurrent()) return;
        setOrders(loaded);
        setOrdersError(null);
        const loadSources = gateway.contractedPrintSources;
        if (loadSources) {
          try {
            const sources = await browserSession.authorize((token) =>
              loadSources(token, bookingId),
            );
            if (!isCurrent()) return;
            const previous = printSources[printSourceIndex]?.offeringId;
            setPrintSources(sources);
            setPrintSourcesError(null);
            setSourcesReady(true);
            setPrintSourceIndex(
              Math.max(
                0,
                sources.findIndex((source) => source.offeringId === previous),
              ),
            );
            if (!printSourcesLoaded.current && sources[0]) setPrintQuantity(sources[0].quantity);
            printSourcesLoaded.current = true;
          } catch (error) {
            if (isCurrent()) {
              setSourcesReady(false);
              setPrintSourcesError(describeApiError(error));
            }
          }
        }
      } catch (err) {
        if (isCurrent()) setOrdersError(invitationErrorMessage(err, 'Không thể cập nhật đơn in.'));
      }
    },
    {
      scope: bookingId + ':print',
      bookingId,
      enabled: printVisited,
      blocked: writing,
      invalidateOnBlock: true,
      initial: loadOrders,
      types: ['print_order.updated', 'contract.updated', 'booking.updated', 'billing.updated'],
    },
  );

  return (
    <div
      className="invitation-live"
      onChangeCapture={() => {
        if (activeTab === 'design') setDesignDirty(true);
      }}
    >
      {publicationRevision === null ? (
        <p role="status">Đang đồng bộ trạng thái xuất bản thiệp…</p>
      ) : null}
      <LiveUpdateNotice waiting={designLive.waiting} />
      {designLive.waiting && designDirty ? (
        <button
          type="button"
          className="studio-btn"
          disabled={writing}
          onClick={() => {
            void confirm({
              title: 'Nhận bản cập nhật mới?',
              description: 'Các thay đổi chưa lưu trên thiệp sẽ được bỏ. Bạn muốn tiếp tục?',
              confirmLabel: 'Bỏ thay đổi và cập nhật',
            }).then((agreed) => {
              if (agreed) {
                setDesignDirty(false);
                void designLive.refresh();
              }
            });
          }}
        >
          Bỏ thay đổi chưa lưu và cập nhật
        </button>
      ) : null}
      {/* Header */}
      <header className="page-heading">
        <h1>Studio Thiệp Cưới & In Ấn</h1>
        <p className="studio-lead">
          Thiết kế thiệp cưới sang trọng, tạo ảnh AI độc bản, chia sẻ mã QR và đặt in thiệp giấy
          truyền thống.
        </p>
      </header>

      {/* Navigation Tabs */}
      <nav aria-label="Studio Tabs" className="studio-tabs">
        <button
          type="button"
          onClick={() => selectTab('design')}
          aria-pressed={activeTab === 'design'}
          className="studio-tab"
        >
          Thiết Kế & AI
        </button>
        <button
          type="button"
          onClick={() => selectTab('media')}
          aria-pressed={activeTab === 'media'}
          className="studio-tab"
        >
          Bộ Sưu Tập Ảnh
        </button>
        <button
          type="button"
          onClick={() => selectTab('publish')}
          aria-pressed={activeTab === 'publish'}
          className="studio-tab"
        >
          Xuất Bản & Mã QR
        </button>
        <button
          type="button"
          onClick={() => selectTab('print')}
          aria-pressed={activeTab === 'print'}
          className="studio-tab"
        >
          {orders ? `Đặt In Thiệp Giấy (${orders.length})` : 'Đặt In Thiệp Giấy'}
        </button>
      </nav>

      {/* Tab: Design & AI */}
      {activeTab === 'design' && (
        <section aria-labelledby="design-heading" className="live-editor">
          <aside className="template-rail">
            <div className="eyebrow">Thiết kế đang chọn</div>
            <div className="template-card selected">
              <div className="template-preview botanical">
                <span>
                  {groomName || 'Chú rể'}
                  <br />
                  &amp;
                  <br />
                  {brideName || 'Cô dâu'}
                </span>
              </div>
              <strong>{title}</strong>
              <small>
                {currentDesign ? 'Phiên bản ' + currentDesign.revisionNumber : 'Thiết kế mới'}
              </small>
            </div>
            <div className="eyebrow rail-label">Các phần</div>
            <p className="muted">Lời mời · Hình ảnh · Nội dung tiệc</p>
          </aside>
          <section className="invitation-preview" aria-label="Xem trước thiệp cưới">
            <div className="preview-toolbar">Preview · Nội dung đang chỉnh</div>
            <div className="invite-paper">
              <InvitationContents
                apiBase={getApiBaseUrl()}
                invitation={{
                  title,
                  textFields: { brideName, groomName, greeting, message, footer },
                  event,
                  timeline,
                  sections: (currentDesign?.sections ?? []).map((section) => ({
                    kind: section.kind,
                    textKey: section.textKey,
                    imageUrl: null,
                  })),
                  assets: previewUrl ? [{ url: previewUrl, width: 400, height: 300 }] : [],
                }}
              />
              <p className="cw-note">
                Bản xem trước nội dung đang chỉnh. Khi xuất bản, máy chủ dùng thông tin và lịch
                trình có hiệu lực.
              </p>
            </div>
          </section>
          <div className="inspector">
            <h2 id="design-heading" className="studio-title">
              Cấu Trúc Nội Dung Thiệp Cưới
            </h2>
            <form
              onSubmit={(e) => {
                void handleSaveDesign(e);
              }}
              className="studio-form"
            >
              <div>
                <label htmlFor="invitation-footer" className="studio-label">
                  Lời cảm ơn cuối thiệp
                </label>
                <textarea
                  id="invitation-footer"
                  value={footer}
                  maxLength={2000}
                  rows={3}
                  onChange={(event) => setFooter(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="invitation-title" className="studio-label">
                  Tiêu Đề Thiệp Cưới
                </label>
                <input
                  id="invitation-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={120}
                  className="studio-input"
                />
              </div>

              <div className="studio-field-row">
                <div>
                  <label htmlFor="groom-name" className="studio-label">
                    Tên Chú Rể
                  </label>
                  <input
                    id="groom-name"
                    type="text"
                    value={groomName}
                    onChange={(e) => setGroomName(e.target.value)}
                    className="studio-input"
                  />
                </div>
                <div>
                  <label htmlFor="bride-name" className="studio-label">
                    Tên Cô Dâu
                  </label>
                  <input
                    id="bride-name"
                    type="text"
                    value={brideName}
                    onChange={(e) => setBrideName(e.target.value)}
                    className="studio-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="invitation-greeting" className="studio-label">
                  Lời Mời Đầu Thiệp
                </label>
                <input
                  id="invitation-greeting"
                  type="text"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  className="studio-input"
                />
              </div>

              <div>
                <label htmlFor="invitation-message" className="studio-label">
                  Thông Điệp / Lời Nhắn
                </label>
                <textarea
                  id="invitation-message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="studio-input"
                />
              </div>

              {derivedAssetIds.length > 0 && (
                <div className="studio-assets">
                  <h4 className="studio-subtitle-sm">
                    Hình ảnh đang dùng trong thiệp ({derivedAssetIds.length})
                  </h4>
                  <div className="studio-asset-list">
                    {derivedAssetIds.map((id) => (
                      <div key={id} className="studio-asset-chip">
                        <span className="studio-mono">Mã: {id.slice(0, 8)}...</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImageFromDesign(id)}
                          className="studio-link-danger"
                        >
                          Bỏ khỏi thiệp
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="studio-actions">
                <button type="submit" disabled={saving} className="studio-btn">
                  Lưu Bản Thiết Kế
                </button>
              </div>
            </form>
          </div>

          {/* AI Generation Box */}
          <div className="ai-box">
            <h3 className="studio-subtitle">Tạo Hoạ Tiết Thiệp Bằng Trí Tuệ Nhân Tạo (AI)</h3>
            {mediaLockNote}
            <p className="studio-hint">
              Nhập mô tả phong cách hoa văn hoặc khung cảnh tiệc cưới (ví dụ: hoa cẩm tú cầu pastel,
              phong cách hoàng gia).
            </p>
            <div className="studio-inline">
              <input
                type="text"
                placeholder="Nhập mô tả hình ảnh..."
                value={aiPrompt}
                // Idempotency-Key gắn với nội dung mô tả (useImageJob): đổi mô tả = yêu cầu mới.
                onChange={(e) => setAiPrompt(e.target.value)}
                aria-label="Mô tả ảnh AI"
                maxLength={2000}
                className="studio-input"
              />
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiJob.busy || !aiPrompt.trim()}
                className="studio-btn"
              >
                {aiJob.busy ? 'Đang tạo ảnh...' : 'Tạo Ảnh AI'}
              </button>
            </div>
            <div aria-live="polite">
              {aiJob.job && aiJob.job.status !== 'SUCCEEDED' ? (
                <p
                  className="studio-hint"
                  role={aiJob.job.status === 'FAILED' ? 'alert' : 'status'}
                >
                  {imageJobStatusText(aiJob.job)}
                </p>
              ) : null}
              {aiJob.busy && !aiJob.stalled ? (
                <p className="studio-hint">
                  Bạn có thể tiếp tục chỉnh thiệp hoặc rời trang; khi quay lại, ảnh vẫn được theo
                  dõi.
                </p>
              ) : null}
              {aiJob.stalled ? (
                <p className="studio-hint" role="status">
                  Ảnh vẫn đang được xử lý lâu hơn thường lệ.{' '}
                  <button type="button" className="studio-btn" onClick={aiJob.checkAgain}>
                    Kiểm tra lại
                  </button>
                </p>
              ) : null}
              {aiJob.job?.status === 'RECOVERY_REQUIRED' ? (
                <button
                  type="button"
                  className="studio-btn"
                  disabled={aiJob.busy}
                  onClick={() => void aiJob.recover()}
                >
                  Thử khôi phục
                </button>
              ) : null}
              <InlineError
                error={aiJob.error}
                onRetry={!aiJob.job ? aiJob.checkAgain : undefined}
              />
              {restoredAiImage ? (
                <p className="studio-hint" role="status">
                  Có ảnh AI đã tạo xong trước đó nhưng chưa dùng trong thiệp.{' '}
                  <button type="button" className="studio-btn" onClick={applyRestoredAiImage}>
                    Dùng ảnh này
                  </button>
                </p>
              ) : null}
            </div>
            {restoredAiImage?.previewUrl ? (
              <Image
                className="studio-generated"
                src={restoredAiImage.previewUrl}
                alt="Ảnh AI đã tạo trước đó"
                width={600}
                height={600}
                unoptimized
              />
            ) : null}
          </div>
        </section>
      )}

      {previewUrl && (
        <Image
          className="studio-generated"
          src={previewUrl}
          alt="Ảnh nền thiệp vừa tạo"
          width={600}
          height={600}
          unoptimized
        />
      )}

      {/* Tab: Media Gallery */}
      {activeTab === 'media' && (
        <section aria-labelledby="media-heading" className="studio-stack">
          <div className="studio-card">
            <h2 id="media-heading" className="studio-title">
              Bộ Sưu Tập Hình Ảnh Cưới
            </h2>
            <p className="studio-hint">
              Hạn ngạch: Tối đa 100 ảnh hoặc 1 GiB mỗi tiệc cưới. Hạn chót tải ảnh: 72 giờ trước giờ
              khai tiệc. Định dạng hỗ trợ: JPEG, PNG, WebP (&le; 25MB).
            </p>
            {mediaLockNote}

            <form
              onSubmit={(e) => {
                void handleUploadMedia(e);
              }}
              className="studio-form studio-upload"
            >
              <div>
                <label htmlFor="media-file-input" className="studio-label">
                  Chọn Tệp Hình Ảnh
                </label>
                <input
                  id="media-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  required
                  className="studio-file"
                />
              </div>

              <div>
                <label htmlFor="media-alt-input" className="studio-label">
                  Mô Tả Hình Ảnh (Alt Text, 1-250 ký tự)
                </label>
                <input
                  id="media-alt-input"
                  type="text"
                  maxLength={250}
                  placeholder="Ví dụ: Ảnh cưới chụp tại sân vườn..."
                  value={mediaAltText}
                  onChange={(e) => setMediaAltText(e.target.value)}
                  required
                  className="studio-input"
                />
              </div>

              <button
                type="submit"
                disabled={isUploadingMedia || !selectedFile || !mediaAltText.trim()}
                className="studio-btn"
              >
                {isUploadingMedia ? 'Đang tải lên...' : 'Tải Lên Hình Ảnh'}
              </button>
            </form>

            <h3 className="studio-subtitle">Hình Ảnh Đã Tải Lên Trong Phiên</h3>
            {uploadedMediaList.length === 0 ? (
              <p className="studio-empty">Chưa có ảnh nào được tải lên trong phiên làm việc này.</p>
            ) : (
              <div className="studio-media-grid">
                {uploadedMediaList.map((item) => (
                  <div key={item.mediaAssetId} className="studio-media-item">
                    {item.signedUrl ? (
                      <div className="studio-media-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.signedUrl}
                          onError={() =>
                            setUploadedMediaList((current) =>
                              current.map((entry) =>
                                entry.mediaAssetId === item.mediaAssetId
                                  ? {
                                      ...entry,
                                      signedUrl: undefined,
                                      previewError: {
                                        message: 'Không tải được ảnh xem trước. Hãy thử lại.',
                                        requestId: null,
                                        code: null,
                                      },
                                    }
                                  : entry,
                              ),
                            )
                          }
                          alt={item.altText}

                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="studio-media-thumb is-empty">Chưa có xem trước</div>
                    )}
                    <div>
                      <InlineError
                        error={item.previewError}
                        onRetry={
                          previewingAssetId === null
                            ? () => void retryMediaPreview(item.mediaAssetId)
                            : undefined
                        }
                      />
                      {previewingAssetId === item.mediaAssetId ? (
                        <p role="status">Đang tải ảnh xem trước…</p>
                      ) : null}
                      <p className="studio-media-name" title={item.altText}>
                        {item.altText}
                      </p>
                      <p className="studio-meta">
                        Mã: {item.mediaAssetId.slice(0, 8)}... (rev {item.revision})
                      </p>
                    </div>

                    {/* Derive Status & Actions */}
                    <div className="studio-media-status">
                      {item.deriveStatus === 'ready' && item.derivedAssetId ? (
                        <div className="studio-media-state">
                          <span className="hy-chip is-success">✓ Đã chuẩn bị cho thiệp</span>
                          {derivedAssetIds.includes(item.derivedAssetId) ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveImageFromDesign(item.derivedAssetId!)}
                              className="studio-btn is-small is-ghost"
                            >
                              ✕ Bỏ ảnh khỏi thiệp
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInsertImageIntoDesign(item.derivedAssetId!)}
                              className="studio-btn is-small"
                            >
                              + Chèn vào thiệp cưới
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="studio-media-state">
                          <span className="hy-chip is-warning">Chưa sẵn sàng cho thiệp</span>
                          {item.deriveError && (
                            <p className="studio-meta is-warning">{item.deriveError}</p>
                          )}
                          <button
                            type="button"
                            disabled={derivingAssetId === item.mediaAssetId}
                            onClick={() => void handleRetryDerive(item)}
                            className="studio-btn is-small is-ghost"
                          >
                            {derivingAssetId === item.mediaAssetId
                              ? 'Đang chuẩn bị...'
                              : 'Thử lại tạo ảnh cho thiệp'}
                          </button>
                        </div>
                      )}

                      <div className="studio-media-foot">
                        <button
                          type="button"
                          disabled={detachingAssetId === item.mediaAssetId || isUploadingMedia}
                          onClick={() =>
                            void handleDetachMedia(
                              item.mediaAssetId,
                              item.revision,
                              item.derivedAssetId,
                            )
                          }
                          className="studio-link-danger"
                        >
                          {detachingAssetId === item.mediaAssetId
                            ? 'Đang gỡ...'
                            : 'Gỡ ảnh gốc khỏi hồ sơ'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab: Publishing & QR */}
      {activeTab === 'publish' && (
        <section aria-labelledby="publish-heading" className="studio-stack">
          <div className="studio-card">
            <h2 id="publish-heading" className="studio-title">
              Xuất Bản Trực Tuyến & Mã QR Chung
            </h2>
            <p className="studio-hint">
              Xuất bản phiên bản thiệp cưới để khách mời có thể xem trang web trực tuyến và quét mã
              QR.
            </p>

            <div className="studio-actions">
              <button
                type="button"
                onClick={() => {
                  void handlePublish();
                }}
                disabled={isPublishing || saving || !currentDesign || publicationRevision === null}
                className="studio-btn"
              >
                {isPublishing ? 'Đang xử lý...' : 'Xuất Bản Thiệp Ngay'}
              </button>
              {publishedSlug && (
                <button
                  type="button"
                  onClick={() => {
                    void handleUnpublish();
                  }}
                  disabled={isPublishing || publicationRevision === null}
                  className="studio-btn is-danger-outline"
                >
                  Hủy Xuất Bản
                </button>
              )}
            </div>

            {publishedSlug ? (
              <div className="studio-published">
                <div className="studio-qr">
                  <Image
                    src={(() => {
                      const base = getApiBaseUrl().replace(/\/+$/, '');
                      return base.endsWith('/api/v1')
                        ? `${base}/public/invitations/${publishedSlug}/qr`
                        : `${base}/api/v1/public/invitations/${publishedSlug}/qr`;
                    })()}
                    alt="Mã QR thiệp cưới"
                    width={128}
                    height={128}
                    unoptimized
                  />
                </div>
                <div className="studio-published-copy">
                  <h4 className="studio-subtitle-sm">Thiệp Cưới Đã Xuất Bản</h4>
                  <p className="studio-hint">
                    Đường dẫn công khai:{' '}
                    <a
                      href={`/t/${publishedSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="studio-link"
                    >
                      /t/{publishedSlug}
                    </a>
                  </p>
                  <p className="studio-meta">
                    Mã QR an toàn, không chứa thông tin cá nhân khách mời.
                  </p>
                </div>
              </div>
            ) : publicationState === 'stale_conflict' ? (
              <div className="studio-callout is-warning">
                <p className="studio-callout-title">
                  Xung Đột Phiên Bản Xuất Bản (INVITATION_PUBLICATION_STALE)
                </p>
                <p>
                  Máy chủ thông báo số hiệu bản xuất bản (publication revision) không khớp với phiên
                  bản hiện tại trên server.
                </p>
                <p className="studio-meta is-warning">
                  Ranh giới hệ thống: Backend hiện tại chưa có API đọc trạng thái xuất bản nội bộ
                  (authoritative publication reader) nên giao diện không thể tự động đồng bộ
                  revision mới nhất nếu bản lưu cục bộ bị thiếu hoặc lệch.
                </p>
              </div>
            ) : publicationState === 'unpublished' ? (
              <div className="studio-callout">
                <p className="studio-callout-title">Trạng Thái: Đã Hủy Xuất Bản</p>
                <p>
                  Thiệp cưới hiện đang ở trạng thái riêng tư. Khách mời không thể truy cập liên kết
                  công khai cũ.
                </p>
                {publicationRevision !== null && (
                  <p className="studio-meta">
                    Phiên bản xuất bản tiếp theo sẵn sàng: #{publicationRevision}. Nhấn &quot;Xuất
                    Bản Thiệp Ngay&quot; để phát hành phiên bản mới.
                  </p>
                )}
              </div>
            ) : (
              <div className="studio-callout">
                <p>
                  Thiệp cưới chưa được phát hành công khai. Nhấn &quot;Xuất Bản Thiệp Ngay&quot; để
                  nhận liên kết trang web và mã QR cho khách mời.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab: Print Orders */}
      {activeTab === 'print' && (
        <section aria-labelledby="print-heading" className="studio-stack">
          <div className="studio-card">
            <h2 id="print-heading" className="studio-title">
              Đặt In Thiệp Giấy Truyền Thống
            </h2>
            <InlineError error={printSourcesError} onRetry={() => void printLive.refresh()} />
            {!sourcesReady && !printSourcesError ? (
              <p role="status">Đang tải lựa chọn in theo hợp đồng…</p>
            ) : null}
            <form
              onSubmit={(e) => {
                void handleRequestPrint(e);
              }}
              className="studio-form studio-narrow"
            >
              {printSources.length > 0 ? (
                <div>
                  <label htmlFor="print-source" className="studio-label">
                    Mẫu in theo hợp đồng
                  </label>
                  <select
                    id="print-source"
                    value={printSourceIndex}
                    onChange={(e) => {
                      const index = Number(e.target.value);
                      setPrintSourceIndex(index);
                      setPrintQuantity(printSources[index]?.quantity ?? printQuantity);
                    }}
                    className="studio-input"
                  >
                    {printSources.map((source, index) => (
                      <option key={source.offeringId} value={index}>
                        {source.name} · {source.quantity} bản trong hợp đồng
                      </option>
                    ))}
                  </select>
                  <p className="studio-meta">
                    Số bản trong hợp đồng đã được tính tiền, nhà hàng không thu lại. Muốn in thêm
                    hoặc đổi mẫu, hãy tạo phụ lục hợp đồng.
                  </p>
                </div>
              ) : null}
              <div>
                <label htmlFor="print-quantity" className="studio-label">
                  Số Lượng Bản In (1 - 10.000 bản)
                </label>
                <input
                  id="print-quantity"
                  type="number"
                  min={1}
                  max={10000}
                  value={printQuantity}
                  onChange={(e) => setPrintQuantity(Number(e.target.value))}
                  required
                  className="studio-input"
                />
              </div>
              <button
                type="submit"
                disabled={isOrdering || !sourcesReady || printSourcesError !== null}
                className="studio-btn"
              >
                {isOrdering ? 'Đang gửi...' : 'Gửi Yêu Cầu Báo Giá In'}
              </button>
            </form>
          </div>

          {/* Orders List */}
          <div className="studio-card">
            <h3 className="studio-subtitle">Lịch Sử & Trạng Thái Đơn In</h3>
            {orders === null ? (
              ordersError ? (
                <p role="alert">{ordersError}</p>
              ) : (
                <p className="studio-empty" role="status">
                  Đang tải đơn in…
                </p>
              )
            ) : orders.length === 0 ? (
              <p className="studio-empty">Chưa có đơn in thiệp nào.</p>
            ) : (
              <div className="studio-orders">
                {orders.map((order) => (
                  <div key={order.orderId} className="studio-order">
                    <div className="studio-order-head">
                      <span className="studio-order-id">Đơn hàng #{order.orderId.slice(0, 8)}</span>
                      <span className={`hy-chip ${orderStatusMap[order.status]?.className ?? ''}`}>
                        {orderStatusMap[order.status]?.label ?? order.status}
                      </span>
                    </div>

                    {order.currentCommercialRevision && (
                      <div className="studio-order-summary">
                        <p>
                          Tổng tiền:{' '}
                          <strong>
                            {Number(order.currentCommercialRevision.orderTotalVnd).toLocaleString(
                              'vi-VN',
                            )}{' '}
                            VND
                          </strong>
                        </p>
                        <p className="studio-meta">
                          Hạn báo giá:{' '}
                          {new Date(order.currentCommercialRevision.expiresAt).toLocaleDateString(
                            'vi-VN',
                          )}
                        </p>
                      </div>
                    )}

                    <div className="studio-actions">
                      {order.status === 'QUOTED' && order.currentCommercialRevision && (
                        <button
                          type="button"
                          disabled={
                            approvingOrderId === order.orderId ||
                            cancellingOrderId === order.orderId
                          }
                          onClick={() => {
                            void handleApproveQuote(order);
                          }}
                          className="studio-btn"
                        >
                          {approvingOrderId === order.orderId ? 'Đang duyệt...' : 'Duyệt Báo Giá'}
                        </button>
                      )}
                      {(order.status === 'REQUESTED' || order.status === 'QUOTED') && (
                        <button
                          type="button"
                          disabled={
                            approvingOrderId === order.orderId ||
                            cancellingOrderId === order.orderId
                          }
                          onClick={() => {
                            void handleCancelOrder(order);
                          }}
                          className="studio-btn is-danger-outline"
                        >
                          {cancellingOrderId === order.orderId ? 'Đang hủy...' : 'Hủy Đơn'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
      {dialog}
    </div>
  );
}
