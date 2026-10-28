'use client';

import React from 'react';
import Image from 'next/image';
import { CopyButton } from '../../design-system/copy-button';
import { getApiBaseUrl } from './invitation-studio-utils';
import type { InvitationStudioState } from './use-invitation-studio';

export type StudioPublishTabProps = Readonly<{
  studio: InvitationStudioState;
}>;

export function StudioPublishTab({ studio }: StudioPublishTabProps) {
  const {
    currentDesign,
    publicationRevision,
    isPublishing,
    saving,
    publishedSlug,
    publicationState,
    handlePublish,
    handleUnpublish,
    handleDownloadQr,
    handleShareZalo,
    handleNativeShare,
    title,
    groomName,
    brideName,
    event,
  } = studio;

  return (
    <section aria-labelledby="publish-heading" className="studio-stack">
      <div className="studio-card">
        <h2 id="publish-heading" className="studio-title">
          Chia sẻ thiệp
        </h2>
        <p className="studio-hint">
          Xuất bản phiên bản thiệp cưới để khách mời có thể xem trang web trực tuyến và quét mã QR.
        </p>

        <p className="studio-publication-state" role="status">
          {publicationState === 'stale_conflict'
            ? 'Thông tin xuất bản vừa thay đổi. Đang chờ đồng bộ bản mới nhất.'
            : publicationRevision === null
              ? 'Đang đồng bộ trạng thái chia sẻ…'
              : publishedSlug
                ? 'Đã xuất bản · Khách có thể mở liên kết thiệp.'
                : 'Chưa xuất bản · Thiệp chưa có liên kết để gửi khách.'}
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
            {isPublishing ? 'Đang xử lý...' : 'Xuất bản thiệp'}
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
              Ngừng chia sẻ
            </button>
          )}
        </div>

        {publishedSlug ? (
          <div className="studio-published">
            <div className="studio-qr-block">
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
              <button
                type="button"
                onClick={() => void handleDownloadQr()}
                className="studio-btn is-small is-ghost"
              >
                Tải mã QR (PNG)
              </button>
            </div>
            <div className="studio-published-copy">
              <div className="studio-published-status">
                <span className="hy-chip is-success">Trực tuyến</span>
                <h4 className="studio-subtitle-sm">Thiệp đang được chia sẻ</h4>
              </div>
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
              <div className="studio-share-bar">
                <CopyButton
                  text={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/t/${publishedSlug}`
                      : `/t/${publishedSlug}`
                  }
                  className="studio-btn is-small"
                />
                <button
                  type="button"
                  onClick={handleShareZalo}
                  className="studio-btn is-small is-ghost studio-zalo-btn"
                >
                  Chia sẻ Zalo
                </button>
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  className="studio-btn is-small is-ghost"
                >
                  Gửi tin nhắn
                </button>
              </div>
              <p className="studio-meta">Mã QR an toàn, không chứa thông tin cá nhân khách mời.</p>

              <details className="studio-og-preview studio-disclosure">
                <summary>Nội dung tham khảo khi chia sẻ</summary>
                <p className="studio-meta">
                  Dựa trên nội dung đang chỉnh; bản công khai là bản đã xuất bản.
                </p>
                <div className="studio-og-card">
                  <div className="studio-og-badge">Thiệp cưới báo hỷ</div>
                  <div className="studio-og-title">{title}</div>
                  <div className="studio-og-subtitle">
                    {groomName || 'Chú rể'} &amp; {brideName || 'Cô dâu'}
                  </div>
                  {event?.eventDate ? (
                    <div className="studio-og-meta">
                      Ngày tổ chức: {new Date(event.eventDate).toLocaleDateString('vi-VN')} · Sảnh{' '}
                      {event.hallName}
                    </div>
                  ) : null}
                  <div className="studio-og-link">
                    {typeof window !== 'undefined' ? window.location.host : 'hy-yen.vn'}/t/
                    {publishedSlug}
                  </div>
                </div>
              </details>
            </div>
          </div>
        ) : publicationState === 'stale_conflict' ? (
          <div className="studio-callout is-warning">
            <p className="studio-callout-title">Thiệp vừa được cập nhật ở nơi khác</p>
            <p>
              Hãy đợi trạng thái đồng bộ trước khi xuất bản lại. Nội dung đang chỉnh của bạn được
              giữ nguyên.
            </p>
          </div>
        ) : publicationState === 'unpublished' ? (
          <div className="studio-callout">
            <p className="studio-callout-title">Thiệp chưa được chia sẻ</p>
            <p>
              Thiệp cưới hiện đang ở trạng thái riêng tư. Khách mời không thể truy cập liên kết công
              khai cũ.
            </p>
          </div>
        ) : (
          <div className="studio-callout">
            <p>
              Đang xác định trạng thái chia sẻ. Chờ đồng bộ trước khi xuất bản hoặc gửi liên kết cho
              khách.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
