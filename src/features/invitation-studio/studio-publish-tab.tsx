'use client';

import Image from 'next/image';
import { CopyButton } from '../../design-system/copy-button';
import { getApiBaseUrl } from './invitation-studio-utils';
import type { InvitationStudioState } from './use-invitation-studio';
import { ix } from './studio-classes';

export function StudioPublishTab({ studio }: Readonly<{ studio: InvitationStudioState }>) {
  const {
    currentDesign,
    publicationRevision,
    publicationState,
    publishedSlug,
    designDirty,
    writing,
  } = studio;
  const currentIsPublic = currentDesign?.revisionId === studio.publishedDesignRevisionId;
  const href = publishedSlug ? `/t/${publishedSlug}` : null;
  const api = getApiBaseUrl().replace(/\/+$/, '');
  const qrUrl = href
    ? `${api.endsWith('/api/v1') ? api : api + '/api/v1'}/public/invitations/${publishedSlug}/qr`
    : null;

  return (
    <section className={ix.stack} aria-labelledby="publish-heading">
      <div className={ix.card}>
        <h2 id="publish-heading" className={ix.title}>
          Chia sẻ thiệp
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1 rounded-lg bg-muted p-3">
            <h3 className="font-semibold">{studio.locked ? 'Bản đã lưu' : 'Bản đang chỉnh'}</h3>
            <p className={ix.meta}>
              {studio.title || 'Thiệp chưa đặt tên'} ·{' '}
              {designDirty
                ? 'Có thay đổi chưa lưu'
                : currentDesign
                  ? `Bản lưu ${currentDesign.revisionNumber}`
                  : 'Chưa lưu'}
            </p>
          </div>
          <div className="grid gap-1 rounded-lg bg-muted p-3">
            <h3 className="font-semibold">Bản khách mời đang xem</h3>
            <p role="status" className={ix.meta}>
              {publicationState === 'stale_conflict'
                ? 'Đang đồng bộ phiên bản mới nhất…'
                : publicationRevision === null
                  ? 'Đang tải trạng thái chia sẻ…'
                  : href
                    ? currentIsPublic
                      ? `Bản lưu ${currentDesign?.revisionNumber}`
                      : 'Một bản đã xuất bản trước đó'
                    : 'Chưa chia sẻ'}
            </p>
          </div>
        </div>
        {href && (
          <div className={ix.actions}>
            <CopyButton
              text={typeof window === 'undefined' ? href : window.location.origin + href}
              className={ix.btn}
            />
            <a className={ix.btnSmallOutline} href={href} target="_blank" rel="noopener noreferrer">
              Xem thiệp đang chia sẻ
            </a>
          </div>
        )}
        {studio.locked ? null : designDirty || !currentDesign ? (
          <div className={ix.actions}>
            <p className={ix.hint}>Lưu mẫu đang chỉnh trước khi xuất bản.</p>
            <button
              type="button"
              className={ix.btnSmallOutline}
              onClick={() => studio.selectTab('design')}
            >
              Về thiết kế để lưu
            </button>
          </div>
        ) : !href || !currentIsPublic ? (
          <div className={ix.actions}>
            <button
              type="button"
              className={href ? ix.btnSmallOutline : ix.btn}
              disabled={
                writing || publicationRevision === null || publicationState === 'stale_conflict'
              }
              onClick={() => void studio.handlePublish()}
            >
              {studio.isPublishing
                ? 'Đang xử lý…'
                : href
                  ? 'Cập nhật thiệp đã chia sẻ'
                  : 'Xuất bản thiệp'}
            </button>
          </div>
        ) : null}
        {href && (
          <details className={ix.disclosure}>
            <summary>Mã QR và tùy chọn chia sẻ</summary>
            <div className="grid gap-3 pt-3">
              {qrUrl && (
                <Image
                  src={qrUrl}
                  alt="Mã QR thiệp cưới"
                  width={128}
                  height={128}
                  loading="lazy"
                  unoptimized
                />
              )}
              <div className={ix.actions}>
                <button
                  type="button"
                  className={ix.btnSmallOutline}
                  onClick={() => void studio.handleDownloadQr()}
                >
                  Tải mã QR
                </button>
                <button
                  type="button"
                  className={ix.btnSmallOutline}
                  onClick={studio.handleShareZalo}
                >
                  Chia sẻ Zalo
                </button>
                <button
                  type="button"
                  className={ix.btnSmallOutline}
                  onClick={() => void studio.handleNativeShare()}
                >
                  Gửi tin nhắn
                </button>
                {!studio.locked && (
                  <button
                    type="button"
                    className={ix.btnDanger}
                    disabled={
                      writing ||
                      publicationRevision === null ||
                      publicationState === 'stale_conflict'
                    }
                    onClick={() => void studio.handleUnpublish()}
                  >
                    Ngừng chia sẻ
                  </button>
                )}
              </div>
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
