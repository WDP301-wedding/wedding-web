'use client';

import styles from './invitation.module.css';
import { readPublicEnv } from '../../lib/env';

import Image from 'next/image';
import React, { useState } from 'react';
import type {
  InvitationGateway,
  DesignView,
  PrintOrderView,
  TemplateItemView,
} from './invitation-api';

export interface InvitationStudioViewProps {
  readonly bookingId: string;
  readonly accessToken: string;
  readonly gateway: InvitationGateway;
  readonly initialDesigns?: readonly DesignView[];
  readonly initialOrders?: readonly PrintOrderView[];
  readonly initialTemplates?: readonly TemplateItemView[];
}

export function InvitationStudioView({
  bookingId,
  accessToken,
  gateway,
  initialDesigns = [],
  initialOrders = [],
}: InvitationStudioViewProps) {
  const [activeTab, setActiveTab] = useState<'design' | 'media' | 'publish' | 'print'>('design');
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

  const currentDesign = designs[0];

  const handleSaveDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (saving) return;
    setSaving(true);
    const imageSections = derivedAssetIds
      .filter((id) => !currentDesign?.sections.some((section) => section.derivedAssetId === id))
      .map((id) => ({ kind: 'HERO' as const, textKey: null, derivedAssetId: id }));
    try {
      if (currentDesign) {
        const updated = await gateway.reviseDesign(accessToken, bookingId, currentDesign.designId, {
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
            sections: [...currentDesign.sections, ...imageSections],
            derivedAssetIds,
            includesSeating: currentDesign.includesSeating,
          },
        });
        setDesigns([updated, ...designs.slice(1)]);
        setNotice({ type: 'success', text: 'Đã lưu bản thiết kế thiệp thành công!' });
      } else {
        const created = await gateway.createDesign(accessToken, bookingId, {
          title,
          textFields: { brideName, groomName, greeting, message },
          sections: imageSections,
          derivedAssetIds,
          includesSeating: false,
        });
        setDesigns([created]);
        setNotice({ type: 'success', text: 'Đã tạo thiết kế thiệp cưới mới!' });
      }
    } catch (err: unknown) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Có lỗi xảy ra.' });
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
        text: err instanceof Error ? err.message : 'Không thể tạo ảnh với AI.',
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handlePublish = async () => {
    if (!currentDesign) return;
    setIsPublishing(true);
    setNotice(null);
    try {
      const res = await gateway.publishDesign(
        accessToken,
        bookingId,
        currentDesign.designId,
        currentDesign.revisionId,
        currentDesign.revisionNumber,
        publicationRevision ?? 0,
      );
      setPublishedSlug(res.publicSlug);
      setPublicationRevision(res.publicationRevision);
      setNotice({ type: 'success', text: 'Thiệp cưới đã được xuất bản trực tuyến!' });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể xuất bản.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!currentDesign) return;
    setIsPublishing(true);
    setNotice(null);
    try {
      await gateway.unpublishDesign(
        accessToken,
        bookingId,
        currentDesign.designId,
        publicationRevision ?? 1,
      );
      setPublishedSlug(null);
      setPublicationRevision((publicationRevision ?? 0) + 1);
      setNotice({ type: 'success', text: 'Đã hủy xuất bản thiệp cưới.' });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể hủy xuất bản.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRequestPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDesign) {
      setNotice({ type: 'error', text: 'Cần lưu thiết kế trước khi đặt in.' });
      return;
    }
    setIsOrdering(true);
    setNotice(null);
    try {
      const newOrder = await gateway.requestPrintOrder(accessToken, bookingId, [
        { designId: currentDesign.designId, quantity: printQuantity },
      ]);
      setOrders([newOrder, ...orders]);
      setNotice({ type: 'success', text: 'Đã gửi yêu cầu in thiệp giấy! Quản lý sẽ sớm báo giá.' });
    } catch (err: unknown) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Không thể đặt in.' });
    } finally {
      setIsOrdering(false);
    }
  };

  const handleApproveQuote = async (order: PrintOrderView) => {
    if (!order.currentCommercialRevision) return;
    setNotice(null);
    try {
      const updated = await gateway.approvePrintOrder(
        accessToken,
        bookingId,
        order.orderId,
        order.currentCommercialRevision.commercialRevisionId,
        order.revision,
      );
      setOrders(orders.map((o) => (o.orderId === order.orderId ? updated : o)));
      setNotice({
        type: 'success',
        text: 'Đã duyệt báo giá in thiệp thành công! Đơn hàng bắt đầu sản xuất.',
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể duyệt báo giá.',
      });
    }
  };

  const handleCancelOrder = async (order: PrintOrderView) => {
    setNotice(null);
    try {
      await gateway.cancelPrintOrder(
        accessToken,
        bookingId,
        order.orderId,
        order.revision,
        'Khách hàng yêu cầu hủy',
      );
      const reloaded = await gateway.listPrintOrders(accessToken, bookingId);
      setOrders(reloaded);
      setNotice({ type: 'success', text: 'Đã hủy đơn in thiệp thành công.' });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể hủy đơn in.',
      });
    }
  };

  return (
    <div className={styles.shell}>
      {/* Header */}
      <header className="mb-8 border-b pb-4">
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
          onClick={() => setActiveTab('design')}
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
          onClick={() => setActiveTab('media')}
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
          onClick={() => setActiveTab('publish')}
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
          onClick={() => setActiveTab('print')}
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
        <section aria-labelledby="design-heading" className="space-y-6">
          <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
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
          <div className="bg-[#FDFBF7]/40 rounded-lg border border-[#D4AF37]/30 p-6 shadow-sm">
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
              Hạn ngạch: Tối đa 100 ảnh hoặc 1 GiB. Hạn chót tải ảnh: 72 giờ trước giờ khai tiệc.
            </p>
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center bg-neutral-50">
              <p className="text-neutral-500 mb-2">
                Kéo thả ảnh hoặc chọn tệp từ máy tính (JPEG, PNG, WebP &le; 25MB)
              </p>
              <button
                type="button"
                disabled
                className="min-h-[44px] px-4 py-2 border border-neutral-400 bg-white rounded-md text-sm font-medium hover:bg-neutral-100"
              >
                Tải ảnh riêng tư chưa được tích hợp tại màn hình này
              </button>
            </div>
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

            {publishedSlug && (
              <div className="p-4 border border-[#879883] bg-[#D8F3DC]/30 rounded-lg flex flex-col md:flex-row items-center gap-6">
                <div className="w-32 h-32 bg-white p-2 border rounded-md shadow-inner flex items-center justify-center text-xs text-neutral-400">
                  <Image
                    src={
                      new URL(
                        '/api/v1/public/invitations/' + publishedSlug + '/qr',
                        readPublicEnv().NEXT_PUBLIC_API_BASE_URL,
                      ).href
                    }
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
                      <span className="px-2.5 py-1 text-xs rounded-full bg-neutral-100 font-semibold text-neutral-700">
                        {order.status}
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
                          onClick={() => {
                            void handleApproveQuote(order);
                          }}
                          className="min-h-[44px] px-4 py-1.5 bg-[#1E3A2F] hover:bg-[#274C3D] text-white text-sm font-medium rounded-md"
                        >
                          Duyệt Báo Giá
                        </button>
                      )}
                      {(order.status === 'REQUESTED' || order.status === 'QUOTED') && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleCancelOrder(order);
                          }}
                          className="min-h-[44px] px-4 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-md"
                        >
                          Hủy Đơn
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
