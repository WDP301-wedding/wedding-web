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
                <h4 className="studio-subtitle-sm">Thiệp Cưới Đã Xuất Bản</h4>
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
              <p className="studio-meta">
                Mã QR an toàn, không chứa thông tin cá nhân khách mời.
              </p>

              <div className="studio-og-preview">
                <div className="studio-og-label">Xem trước khi gửi tin nhắn:</div>
                <div className="studio-og-card">
                  <div className="studio-og-badge">THIỆP CƯỚI BÁO HỶ</div>
                  <div className="studio-og-title">{title}</div>
                  <div className="studio-og-subtitle">
                    {groomName || 'Chú rể'} &amp; {brideName || 'Cô dâu'}
                  </div>
                  {event?.eventDate ? (
                    <div className="studio-og-meta">
                      Ngày tổ chức: {new Date(event.eventDate).toLocaleDateString('vi-VN')} · Sảnh {event.hallName}
                    </div>
                  ) : null}
                  <div className="studio-og-link">
                    {typeof window !== 'undefined' ? window.location.host : 'hy-yen.vn'}/t/{publishedSlug}
                  </div>
                </div>
              </div>
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
  );
}
