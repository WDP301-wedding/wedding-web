'use client';

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
  readonly bookingId: string;
  readonly accessToken: string;
  readonly gateway: InvitationGateway;
  readonly onTabChange?: (tab: 'design' | 'media' | 'publish' | 'print') => void;
  readonly initialTab?: 'design' | 'media' | 'publish' | 'print';
  readonly initialDesigns?: readonly DesignView[];
  readonly initialOrders?: readonly PrintOrderView[];
  readonly initialTemplates?: readonly TemplateItemView[];
}

const orderStatusMap: Record<string, { label: string; className: string }> = {
  REQUESTED: { label: 'Chờ báo giá', className: 'bg-amber-100 text-amber-800' },
  QUOTED: { label: 'Đã có báo giá', className: 'bg-blue-100 text-blue-800' },
  APPROVED: { label: 'Đã duyệt in', className: 'bg-emerald-100 text-emerald-800' },
  IN_PRODUCTION: { label: 'Đang in ấn', className: 'bg-purple-100 text-purple-800' },
  READY_FOR_HANDOVER: { label: 'Sẵn sàng bàn giao', className: 'bg-teal-100 text-teal-800' },
  HANDED_OVER: { label: 'Đã bàn giao', className: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-neutral-100 text-neutral-600' },
};

export function InvitationStudioView({
  bookingId,
  accessToken,
  gateway,
  initialTab = 'design',
  onTabChange,
  initialDesigns = [],
  initialOrders = [],
}: InvitationStudioViewProps) {
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
  const [orders, setOrders] = useState<readonly PrintOrderView[]>(initialOrders);

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generationKey, setGenerationKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publicationRevision, setPublicationRevision] = useState<number | null>(null);

  // Print order form state
  const [printQuantity, setPrintQuantity] = useState(100);
  const [isOrdering, setIsOrdering] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Media upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaAltText, setMediaAltText] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
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

  useEffect(() => {
    if (!currentDesign) return;
    const storageKey = `wedding_invitation_pub_${bookingId}_${currentDesign.designId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'publicationRevision' in parsed &&
          typeof parsed.publicationRevision === 'number'
        ) {
          const entry = parsed as {
            publicSlug?: string | null;
            publicationRevision: number;
            published?: boolean;
          };
          queueMicrotask(() => {
            setPublicationRevision(entry.publicationRevision);
            if (entry.published === false) {
              setPublishedSlug(null);
              setPublicationState('unpublished');
            } else if (typeof entry.publicSlug === 'string' && entry.publicSlug) {
              void gateway
                .getPublicInvitation(entry.publicSlug)
                .then(() => {
                  setPublishedSlug(entry.publicSlug ?? null);
                  setPublicationState('published');
                })
                .catch((err: unknown) => {
                  if (
                    (err instanceof ApiClientError && err.status === 404) ||
                    (err instanceof Error && err.message.includes('không tồn tại'))
                  ) {
                    setPublishedSlug(null);
                    setPublicationState('unpublished');
                    localStorage.setItem(
                      storageKey,
                      JSON.stringify({
                        publicSlug: entry.publicSlug,
                        publicationRevision: entry.publicationRevision,
                        published: false,
                      }),
                    );
                  } else {
                    setPublishedSlug(entry.publicSlug ?? null);
                    setPublicationState('published');
                  }
                });
            }
          });
        }
      } else {
        queueMicrotask(() => setPublicationState('unknown'));
      }
    } catch {
      // Ignore storage errors in test or restricted environments
    }
  }, [bookingId, currentDesign, gateway]);

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
    const signature = `${currentDesign?.designId ?? 'new'}:${currentDesign?.revisionNumber ?? 0}:${title}:${brideName}:${groomName}:${greeting}:${message}:${derivedAssetIds.join(',')}`;
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
              },
              sections: finalSections,
              derivedAssetIds,
              includesSeating: currentDesign.includesSeating,
            },
          },
          key,
        );
        setDesigns([updated, ...designs.slice(1)]);
        saveKeyRef.current = null;
        setNotice({ type: 'success', text: 'Đã lưu bản thiết kế thiệp thành công!' });
      } else {
        const created = await gateway.createDesign(
          accessToken,
          bookingId,
          {
            title,
            textFields: { brideName, groomName, greeting, message },
            sections: newImageSections,
            derivedAssetIds,
            includesSeating: false,
          },
          key,
        );
        setDesigns([created]);
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

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || isGeneratingAi) return;
    setIsGeneratingAi(true);
    setNotice(null);
    try {
      const key = generationKey ?? 'generate-image:' + crypto.randomUUID();
      setGenerationKey(key);
      const res = await gateway.generateImage(accessToken, bookingId, aiPrompt, '1:1', key);
      const assetId = res.derivedAssetId;
      if (assetId) setDerivedAssetIds((ids) => (ids.includes(assetId) ? ids : [...ids, assetId]));
      if (res.previewUrl) setPreviewUrl(res.previewUrl);
      setNotice({
        type: 'success',
        text: 'Ảnh đã sẵn sàng. Lưu thiết kế để sử dụng ảnh trên thiệp.',
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: invitationErrorMessage(err, 'Không thể tạo ảnh với AI.'),
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handlePublish = async () => {
    if (!currentDesign) return;
    setIsPublishing(true);
    setNotice(null);
    const pubRev = publicationRevision ?? 0;
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
      try {
        const storageKey = `wedding_invitation_pub_${bookingId}_${currentDesign.designId}`;
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            publicSlug: res.publicSlug,
            publicationRevision: res.publicationRevision,
            published: true,
            publishedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // Ignore storage errors
      }
      setNotice({ type: 'success', text: 'Thiệp cưới đã được xuất bản trực tuyến!' });
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'INVITATION_PUBLICATION_STALE') {
        setPublicationState('stale_conflict');
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
    if (!currentDesign) return;
    setIsPublishing(true);
    setNotice(null);
    const pubRev = publicationRevision ?? 1;
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
      const nextRev = res?.publicationRevision ?? pubRev + 1;
      setPublishedSlug(null);
      setPublicationRevision(nextRev);
      setPublicationState('unpublished');
      unpublishKeyRef.current = null;
      try {
        const storageKey = `wedding_invitation_pub_${bookingId}_${currentDesign.designId}`;
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            publicSlug: publishedSlug,
            publicationRevision: nextRev,
            published: false,
            unpublishedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // Ignore storage errors
      }
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
  const [printSourceIndex, setPrintSourceIndex] = useState(0);
  useEffect(() => {
    let active = true;
    if (!gateway.contractedPrintSources) return;
    gateway
      .contractedPrintSources(accessToken, bookingId)
      .then((sources) => {
        if (!active) return;
        setPrintSources(sources);
        if (sources[0]) setPrintQuantity(sources[0].quantity);
      })
      .catch(() => {
        // Booking theo đề xuất cũ không có hợp đồng: giữ luồng in tính phí riêng như trước.
      });
    return () => {
      active = false;
    };
  }, [gateway, accessToken, bookingId]);
  const selectedPrintSource = printSources[printSourceIndex];

  const handleRequestPrint = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setOrders([newOrder, ...orders]);
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
    setNotice(null);
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
      setOrders(orders.map((o) => (o.orderId === order.orderId ? updated : o)));
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
      try {
        const preview = await gateway.getMediaPreview(accessToken, bookingId, asset.mediaAssetId);
        signedUrl = preview.signedUrl;
      } catch {
        // Fallback if preview signed url cannot be fetched immediately
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

  return (
    <div className="invitation-live">
      {/* Header */}
      <header className="page-heading">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#1E3A2F] ">
          Studio Thiệp Cưới & In Ấn
        </h1>
        <p className="text-neutral-600 mt-1">
          Thiết kế thiệp cưới sang trọng, tạo ảnh AI độc bản, chia sẻ mã QR và đặt in thiệp giấy
          truyền thống.
        </p>
      </header>

      {/* Notifications */}
      {notice && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-md text-sm font-medium ${
            notice.type === 'success'
              ? 'bg-[#D8F3DC] text-[#1E3A2F] border border-[#74C69D]'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav
        aria-label="Studio Tabs"
        className="flex border-b border-neutral-200 mb-6 gap-2 overflow-x-auto"
      >
        <button
          type="button"
          onClick={() => selectTab('design')}
          className={`min-h-[44px] px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'design'
              ? 'border-[#1E3A2F] text-[#1E3A2F]'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          Thiết Kế & AI
        </button>
        <button
          type="button"
          onClick={() => selectTab('media')}
          className={`min-h-[44px] px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'media'
              ? 'border-[#1E3A2F] text-[#1E3A2F]'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          Bộ Sưu Tập Ảnh
        </button>
        <button
          type="button"
          onClick={() => selectTab('publish')}
          className={`min-h-[44px] px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'publish'
              ? 'border-[#1E3A2F] text-[#1E3A2F]'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          Xuất Bản & Mã QR
        </button>
        <button
          type="button"
          onClick={() => selectTab('print')}
          className={`min-h-[44px] px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'print'
              ? 'border-[#1E3A2F] text-[#1E3A2F]'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          Đặt In Thiệp Giấy ({orders.length})
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
              <span className="invite-overline">{greeting}</span>
              <h2>
                {groomName || 'Chú rể'} &amp; {brideName || 'Cô dâu'}
              </h2>
              <div className="invite-line" />
              {previewUrl && (
                <Image
                  src={previewUrl}
                  alt="Ảnh nền đang chọn"
                  width={400}
                  height={300}
                  unoptimized
                />
              )}
              <p>{message}</p>
              <small>Thông tin tiệc sẽ lấy từ hồ sơ đã được duyệt khi xuất bản.</small>
            </div>
          </section>
          <div className="inspector">
            <h2 id="design-heading" className="text-xl font-semibold text-[#1E3A2F] mb-4">
              Cấu Trúc Nội Dung Thiệp Cưới
            </h2>
            <form
              onSubmit={(e) => {
                void handleSaveDesign(e);
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="invitation-title"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Tiêu Đề Thiệp Cưới
                </label>
                <input
                  id="invitation-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={120}
                  className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="groom-name"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Tên Chú Rể
                  </label>
                  <input
                    id="groom-name"
                    type="text"
                    value={groomName}
                    onChange={(e) => setGroomName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bride-name"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Tên Cô Dâu
                  </label>
                  <input
                    id="bride-name"
                    type="text"
                    value={brideName}
                    onChange={(e) => setBrideName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="invitation-greeting"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Lời Mời Đầu Thiệp
                </label>
                <input
                  id="invitation-greeting"
                  type="text"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883]"
                />
              </div>

              <div>
                <label
                  htmlFor="invitation-message"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Thông Điệp / Lời Nhắn
                </label>
                <textarea
                  id="invitation-message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883]"
                />
              </div>

              {derivedAssetIds.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-200">
                  <h4 className="text-sm font-semibold text-neutral-800">
                    Hình ảnh đang dùng trong thiệp ({derivedAssetIds.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {derivedAssetIds.map((id) => (
                      <div
                        key={id}
                        className="flex items-center gap-2 p-2 bg-neutral-100 rounded text-xs border border-neutral-200"
                      >
                        <span className="font-mono text-neutral-600">Mã: {id.slice(0, 8)}...</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImageFromDesign(id)}
                          className="text-red-600 hover:underline font-medium"
                        >
                          Bỏ khỏi thiệp
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || isGeneratingAi}
                  className="min-h-[44px] px-6 py-2 bg-[#1E3A2F] hover:bg-[#274C3D] text-white font-medium rounded-md transition-colors"
                >
                  Lưu Bản Thiết Kế
                </button>
              </div>
            </form>
          </div>

          {/* AI Generation Box */}
          <div className="ai-box">
            <h3 className="text-lg font-semibold text-[#1E3A2F] mb-2">
              Tạo Hoạ Tiết Thiệp Bằng Trí Tuệ Nhân Tạo (AI)
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Nhập mô tả phong cách hoa văn hoặc khung cảnh tiệc cưới (ví dụ: hoa cẩm tú cầu pastel,
              phong cách hoàng gia).
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Nhập mô tả hình ảnh..."
                value={aiPrompt}
                onChange={(e) => {
                  setAiPrompt(e.target.value);
                  setGenerationKey(null);
                }}
                aria-label="Mô tả ảnh AI"
                maxLength={2000}
                className="flex-1 min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883]"
              />
              <button
                type="button"
                onClick={() => {
                  void handleAiGenerate();
                }}
                disabled={isGeneratingAi || !aiPrompt.trim()}
                className="min-h-[44px] px-5 py-2 bg-[#D4AF37] hover:bg-[#B8972E] disabled:opacity-50 text-white font-medium rounded-md transition-colors whitespace-nowrap"
              >
                {isGeneratingAi ? 'Đang tạo ảnh...' : 'Tạo Ảnh AI'}
              </button>
            </div>
          </div>
        </section>
      )}

      {previewUrl && (
        <Image src={previewUrl} alt="Ảnh nền thiệp vừa tạo" width={600} height={600} unoptimized />
      )}

      {/* Tab: Media Gallery */}
      {activeTab === 'media' && (
        <section aria-labelledby="media-heading" className="space-y-6">
          <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
            <h2 id="media-heading" className="text-xl font-semibold text-[#1E3A2F] mb-2">
              Bộ Sưu Tập Hình Ảnh Cưới
            </h2>
            <p className="text-sm text-neutral-600 mb-4">
              Hạn ngạch: Tối đa 100 ảnh hoặc 1 GiB mỗi tiệc cưới. Hạn chót tải ảnh: 72 giờ trước giờ
              khai tiệc. Định dạng hỗ trợ: JPEG, PNG, WebP (&le; 25MB).
            </p>

            <form
              onSubmit={(e) => {
                void handleUploadMedia(e);
              }}
              className="space-y-4 max-w-lg mb-6 p-4 border rounded-md bg-neutral-50"
            >
              <div>
                <label
                  htmlFor="media-file-input"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Chọn Tệp Hình Ảnh
                </label>
                <input
                  id="media-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  required
                  className="w-full text-sm text-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#1E3A2F] file:text-white hover:file:bg-[#274C3D]"
                />
              </div>

              <div>
                <label
                  htmlFor="media-alt-input"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
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
                  className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883]"
                />
              </div>

              <button
                type="submit"
                disabled={isUploadingMedia || !selectedFile || !mediaAltText.trim()}
                className="min-h-[44px] px-6 py-2 bg-[#1E3A2F] hover:bg-[#274C3D] disabled:opacity-50 text-white font-medium rounded-md transition-colors"
              >
                {isUploadingMedia ? 'Đang tải lên...' : 'Tải Lên Hình Ảnh'}
              </button>
            </form>

            <h3 className="text-lg font-semibold text-[#1E3A2F] mb-3">
              Hình Ảnh Đã Tải Lên Trong Phiên
            </h3>
            {uploadedMediaList.length === 0 ? (
              <p className="text-sm text-neutral-500 italic">
                Chưa có ảnh nào được tải lên trong phiên làm việc này.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {uploadedMediaList.map((item) => (
                  <div
                    key={item.mediaAssetId}
                    className="border rounded-md p-3 space-y-2 bg-neutral-50 flex flex-col justify-between"
                  >
                    {item.signedUrl ? (
                      <div className="w-full h-36 bg-neutral-200 rounded overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.signedUrl}
                          alt={item.altText}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-36 bg-neutral-100 rounded flex items-center justify-center text-xs text-neutral-400">
                        Chưa có xem trước
                      </div>
                    )}
                    <div>
                      <p
                        className="text-xs font-semibold text-neutral-700 truncate"
                        title={item.altText}
                      >
                        {item.altText}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Mã: {item.mediaAssetId.slice(0, 8)}... (rev {item.revision})
                      </p>
                    </div>

                    {/* Derive Status & Actions */}
                    <div className="space-y-1.5 pt-1">
                      {item.deriveStatus === 'ready' && item.derivedAssetId ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 font-medium">
                            ✓ Đã chuẩn bị cho thiệp
                          </span>
                          {derivedAssetIds.includes(item.derivedAssetId) ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveImageFromDesign(item.derivedAssetId!)}
                              className="text-xs px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded font-medium text-left"
                            >
                              ✕ Bỏ ảnh khỏi thiệp
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInsertImageIntoDesign(item.derivedAssetId!)}
                              className="text-xs px-2.5 py-1 bg-[#1E3A2F] hover:bg-[#274C3D] text-white rounded font-medium text-left"
                            >
                              + Chèn vào thiệp cưới
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800 font-medium">
                            ⚠ Chưa sẵn sàng cho thiệp
                          </span>
                          {item.deriveError && (
                            <p className="text-xs text-amber-700">{item.deriveError}</p>
                          )}
                          <button
                            type="button"
                            disabled={derivingAssetId === item.mediaAssetId}
                            onClick={() => void handleRetryDerive(item)}
                            className="text-xs px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium"
                          >
                            {derivingAssetId === item.mediaAssetId
                              ? 'Đang chuẩn bị...'
                              : 'Thử lại tạo ảnh cho thiệp'}
                          </button>
                        </div>
                      )}

                      <div className="pt-1 border-t border-neutral-200">
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
                          className="text-xs text-red-600 hover:underline font-medium"
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
        <section aria-labelledby="publish-heading" className="space-y-6">
          <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
            <h2 id="publish-heading" className="text-xl font-semibold text-[#1E3A2F] mb-2">
              Xuất Bản Trực Tuyến & Mã QR Chung
            </h2>
            <p className="text-sm text-neutral-600 mb-6">
              Xuất bản phiên bản thiệp cưới để khách mời có thể xem trang web trực tuyến và quét mã
              QR.
            </p>

            <div className="flex flex-wrap gap-4 items-center mb-6">
              <button
                type="button"
                onClick={() => {
                  void handlePublish();
                }}
                disabled={isPublishing || saving || !currentDesign}
                className="min-h-[44px] px-6 py-2 bg-[#1E3A2F] hover:bg-[#274C3D] text-white font-medium rounded-md transition-colors"
              >
                {isPublishing ? 'Đang xử lý...' : 'Xuất Bản Thiệp Ngay'}
              </button>
              {publishedSlug && (
                <button
                  type="button"
                  onClick={() => {
                    void handleUnpublish();
                  }}
                  disabled={isPublishing}
                  className="min-h-[44px] px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                >
                  Hủy Xuất Bản
                </button>
              )}
            </div>

            {publishedSlug ? (
              <div className="p-4 border border-[#879883] bg-[#D8F3DC]/30 rounded-lg flex flex-col md:flex-row items-center gap-6">
                <div className="w-32 h-32 bg-white p-2 border rounded-md shadow-inner flex items-center justify-center text-xs text-neutral-400">
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
                <div className="space-y-2">
                  <h4 className="font-semibold text-[#1E3A2F]">Thiệp Cưới Đã Xuất Bản</h4>
                  <p className="text-sm text-neutral-600">
                    Đường dẫn công khai:{' '}
                    <a
                      href={`/invitation/${publishedSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#274C3D] underline font-medium"
                    >
                      /invitation/{publishedSlug}
                    </a>
                  </p>
                  <p className="text-xs text-neutral-500">
                    Mã QR an toàn, không chứa thông tin cá nhân khách mời.
                  </p>
                </div>
              </div>
            ) : publicationState === 'stale_conflict' ? (
              <div className="p-4 border border-amber-300 bg-amber-50 rounded-lg text-sm text-amber-900 space-y-1">
                <p className="font-semibold">
                  Xung Đột Phiên Bản Xuất Bản (INVITATION_PUBLICATION_STALE)
                </p>
                <p>
                  Máy chủ thông báo số hiệu bản xuất bản (publication revision) không khớp với phiên
                  bản hiện tại trên server.
                </p>
                <p className="text-xs text-amber-700">
                  Ranh giới hệ thống: Backend hiện tại chưa có API đọc trạng thái xuất bản nội bộ
                  (authoritative publication reader) nên giao diện không thể tự động đồng bộ
                  revision mới nhất nếu bản lưu cục bộ bị thiếu hoặc lệch.
                </p>
              </div>
            ) : publicationState === 'unpublished' ? (
              <div className="p-4 border border-neutral-300 bg-neutral-50 rounded-lg text-sm text-neutral-700 space-y-1">
                <p className="font-semibold text-[#1E3A2F]">Trạng Thái: Đã Hủy Xuất Bản</p>
                <p>
                  Thiệp cưới hiện đang ở trạng thái riêng tư. Khách mời không thể truy cập liên kết
                  công khai cũ.
                </p>
                {publicationRevision !== null && (
                  <p className="text-xs text-neutral-500">
                    Phiên bản xuất bản tiếp theo sẵn sàng: #{publicationRevision}. Nhấn &quot;Xuất
                    Bản Thiệp Ngay&quot; để phát hành phiên bản mới.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 border border-neutral-200 bg-neutral-50 rounded-lg text-sm text-neutral-600">
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
        <section aria-labelledby="print-heading" className="space-y-6">
          <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
            <h2 id="print-heading" className="text-xl font-semibold text-[#1E3A2F] mb-4">
              Đặt In Thiệp Giấy Truyền Thống
            </h2>
            <form
              onSubmit={(e) => {
                void handleRequestPrint(e);
              }}
              className="space-y-4 max-w-md"
            >
              {printSources.length > 0 ? (
                <div>
                  <label
                    htmlFor="print-source"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
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
                    className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md"
                  >
                    {printSources.map((source, index) => (
                      <option key={source.offeringId} value={index}>
                        {source.name} · {source.quantity} bản trong hợp đồng
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">
                    Số bản trong hợp đồng đã được tính tiền, nhà hàng không thu lại. Muốn in thêm
                    hoặc đổi mẫu, hãy tạo phụ lục hợp đồng.
                  </p>
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="print-quantity"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
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
                  className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883]"
                />
              </div>
              <button
                type="submit"
                disabled={isOrdering}
                className="min-h-[44px] px-6 py-2 bg-[#D4AF37] hover:bg-[#B8972E] text-white font-medium rounded-md transition-colors"
              >
                {isOrdering ? 'Đang gửi...' : 'Gửi Yêu Cầu Báo Giá In'}
              </button>
            </form>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#1E3A2F] mb-4">
              Lịch Sử & Trạng Thái Đơn In
            </h3>
            {orders.length === 0 ? (
              <p className="text-sm text-neutral-500 italic">Chưa có đơn in thiệp nào.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.orderId} className="border rounded-md p-4 space-y-2">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="font-medium text-sm">
                        Đơn hàng #{order.orderId.slice(0, 8)}
                      </span>
                      <span
                        className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                          orderStatusMap[order.status]?.className ??
                          'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {orderStatusMap[order.status]?.label ?? order.status}
                      </span>
                    </div>

                    {order.currentCommercialRevision && (
                      <div className="text-sm bg-neutral-50 p-3 rounded border border-neutral-200 space-y-1">
                        <p>
                          Tổng tiền:{' '}
                          <strong className="text-[#1E3A2F]">
                            {Number(order.currentCommercialRevision.orderTotalVnd).toLocaleString(
                              'vi-VN',
                            )}{' '}
                            VND
                          </strong>
                        </p>
                        <p className="text-xs text-neutral-500">
                          Hạn báo giá:{' '}
                          {new Date(order.currentCommercialRevision.expiresAt).toLocaleDateString(
                            'vi-VN',
                          )}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
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
                          className="min-h-[44px] px-4 py-1.5 bg-[#1E3A2F] hover:bg-[#274C3D] disabled:opacity-50 text-white text-sm font-medium rounded-md"
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
                          className="min-h-[44px] px-4 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium rounded-md"
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
    </div>
  );
}
