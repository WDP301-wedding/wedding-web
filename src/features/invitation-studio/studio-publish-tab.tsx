'use client';

import React from 'react';
import Image from 'next/image';
import { CopyButton } from '../../design-system/copy-button';
import { getApiBaseUrl } from './invitation-studio-utils';
import type { InvitationStudioState } from './use-invitation-studio';
import { px } from './studio-panel-classes';
import { ix } from './studio-classes';

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
    <section aria-labelledby="publish-heading" className={ix.stack}>
      <div className={ix.card}>
        <h2 id="publish-heading" className={ix.title}>
          Chia sẻ thiệp
        </h2>
        <p className={ix.hint}>
          Xuất bản phiên bản thiệp cưới để khách mời có thể xem trang web trực tuyến và quét mã QR.
        </p>

        <p className={px.publicationState} role="status">
          {publicationState === 'stale_conflict'
            ? 'Thông tin xuất bản vừa thay đổi. Đang chờ đồng bộ bản mới nhất.'
            : publicationRevision === null
              ? 'Đang đồng bộ trạng thái chia sẻ…'
              : publishedSlug
                ? 'Đã xuất bản · Khách có thể mở liên kết thiệp.'
                : 'Chưa xuất bản · Thiệp chưa có liên kết để gửi khách.'}
        </p>
        <div className={ix.actions}>
          <button
            type="button"
            onClick={() => {
              void handlePublish();
            }}
            disabled={isPublishing || saving || !currentDesign || publicationRevision === null}
            className={ix.btn}
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
              className={ix.btnDanger}
            >
              Ngừng chia sẻ
            </button>
          )}
        </div>

        {publishedSlug ? (
          <div className={px.published}>
            <div className={px.qrBlock}>
              <div className={px.qr}>
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
                className={ix.btnSmallOutline}
              >
                Tải mã QR (PNG)
              </button>
            </div>
            <div className={px.publishedCopy}>
              <div className={px.publishedStatus}>
                <span className={ix.chipSuccess}>Trực tuyến</span>
                <h4 className={ix.subtitleSm}>Thiệp đang được chia sẻ</h4>
              </div>
              <p className={ix.hint}>
                Đường dẫn công khai:{' '}
                <a
                  href={`/t/${publishedSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ix.link}
                >
                  /t/{publishedSlug}
                </a>
              </p>
              <div className={px.shareBar}>
                <CopyButton
                  text={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/t/${publishedSlug}`
                      : `/t/${publishedSlug}`
                  }
                  className={ix.btnSmall}
                />
                <button type="button" onClick={handleShareZalo} className={ix.btnSmallOutline}>
                  Chia sẻ Zalo
                </button>
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  className={ix.btnSmallOutline}
                >
                  Gửi tin nhắn
                </button>
              </div>
              <p className={ix.meta}>Mã QR an toàn, không chứa thông tin cá nhân khách mời.</p>

              <details className={ix.disclosure}>
                <summary>Nội dung tham khảo khi chia sẻ</summary>
                <p className={ix.meta}>
                  Dựa trên nội dung đang chỉnh; bản công khai là bản đã xuất bản.
                </p>
                <div className={px.ogCard}>
                  <div className={px.ogBadge}>Thiệp cưới báo hỷ</div>
                  <div className={px.ogTitle}>{title}</div>
                  <div className={px.ogSubtitle}>
                    {groomName || 'Chú rể'} &amp; {brideName || 'Cô dâu'}
                  </div>
                  {event?.eventDate ? (
                    <div className={px.ogMeta}>
                      Ngày tổ chức: {new Date(event.eventDate).toLocaleDateString('vi-VN')} · Sảnh{' '}
                      {event.hallName}
                    </div>
                  ) : null}
                  <div className={px.ogLink}>
                    {typeof window !== 'undefined' ? window.location.host : 'hy-yen.vn'}/t/
                    {publishedSlug}
                  </div>
                </div>
              </details>
            </div>
          </div>
        ) : publicationState === 'stale_conflict' ? (
          <div className={ix.calloutWarning}>
            <p className={ix.calloutTitle}>Thiệp vừa được cập nhật ở nơi khác</p>
            <p>
              Hãy đợi trạng thái đồng bộ trước khi xuất bản lại. Nội dung đang chỉnh của bạn được
              giữ nguyên.
            </p>
          </div>
        ) : publicationState === 'unpublished' ? (
          <div className={ix.callout}>
            <p className={ix.calloutTitle}>Thiệp chưa được chia sẻ</p>
            <p>
              Thiệp cưới hiện đang ở trạng thái riêng tư. Khách mời không thể truy cập liên kết công
              khai cũ.
            </p>
          </div>
        ) : (
          <div className={ix.callout}>
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
