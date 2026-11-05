'use client';

import Image from 'next/image';
import type { DesignView } from './invitation-api';
import { useInvitationPublish } from './use-invitation-publish';
import { CopyButton } from '../../design-system/copy-button';
import { getApiBaseUrl } from './invitation-studio-utils';
import type { InvitationStudioState } from './use-invitation-studio';
import { ix } from './studio-classes';

export function StudioPublishTab({ studio }: Readonly<{ studio: InvitationStudioState }>) {
  return (
    <section className={ix.stack} aria-labelledby="publish-heading">
      <header>
        <h2 id="publish-heading" className={ix.title}>
          Chia sẻ thiệp
        </h2>
        <p className={ix.hint}>
          Mỗi mẫu thiệp có liên kết và mã QR riêng. Chọn thiệp muốn gửi ngay bên dưới.
        </p>
      </header>
      {studio.designs.length === 0 ? (
        <p className={ix.empty}>Chưa có thiết kế thiệp đã lưu.</p>
      ) : null}
      {studio.designs.map((design) => (
        <DesignShareCard key={design.designId} studio={studio} design={design} />
      ))}
    </section>
  );
}

function DesignShareCard({
  studio,
  design,
}: Readonly<{ studio: InvitationStudioState; design: DesignView }>) {
  const designDirty = studio.currentDesign?.designId === design.designId && studio.designDirty;
  const publication = useInvitationPublish({
    bookingId: studio.bookingId,
    accessToken: studio.accessToken,
    gateway: studio.gateway,
    currentDesign: design,
    designDirty,
    writing: studio.writing,
    confirm: studio.confirm,
  });
  const { publicationRevision, publicationState, publishedSlug } = publication;
  const currentDesign = design;
  const writing = studio.writing || publication.isPublishing;
  const currentIsPublic = currentDesign?.revisionId === publication.publishedDesignRevisionId;
  const href = publishedSlug ? `/t/${publishedSlug}` : null;
  const api = getApiBaseUrl().replace(/\/+$/, '');
  const qrUrl = href
    ? `${api.endsWith('/api/v1') ? api : api + '/api/v1'}/public/invitations/${publishedSlug}/qr`
    : null;

  return (
    <article className={ix.card} aria-label={design.title || 'Thiệp chưa đặt tên'}>
      <h3 className="text-lg leading-snug font-bold text-foreground wrap-anywhere">
        {design.title || 'Thiệp chưa đặt tên'}
      </h3>
      {publication.publicationError && (
        <div role="alert">
          <p>{publication.publicationError}</p>
          <button
            type="button"
            className={ix.btnSmallOutline}
            onClick={() => void publication.refreshPublication()}
          >
            Thử lại
          </button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1 rounded-lg bg-muted p-3">
          <h4 className="font-semibold">Bản đã lưu</h4>
          <p className={ix.meta}>
            {design.title || 'Thiệp chưa đặt tên'} ·{' '}
            {designDirty
              ? 'Có thay đổi chưa lưu'
              : currentDesign
                ? `Bản lưu ${currentDesign.revisionNumber}`
                : 'Chưa lưu'}
          </p>
        </div>
        <div className="grid gap-1 rounded-lg bg-muted p-3">
          <h4 className="font-semibold">Bản khách mời đang xem</h4>
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
        <p className="text-sm text-foreground break-all select-all">
          {typeof window === 'undefined' ? href : window.location.origin + href}
        </p>
      )}
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
            onClick={() => void publication.handlePublish()}
          >
            {publication.isPublishing
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
                alt={`Mã QR ${design.title}`}
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
                onClick={() => void publication.handleDownloadQr()}
              >
                Tải mã QR
              </button>
              <button
                type="button"
                className={ix.btnSmallOutline}
                onClick={publication.handleShareZalo}
              >
                Chia sẻ Zalo
              </button>
              <button
                type="button"
                className={ix.btnSmallOutline}
                onClick={() => void publication.handleNativeShare()}
              >
                Gửi tin nhắn
              </button>
              {!studio.locked && (
                <button
                  type="button"
                  className={ix.btnDanger}
                  disabled={
                    writing || publicationRevision === null || publicationState === 'stale_conflict'
                  }
                  onClick={() => void publication.handleUnpublish()}
                >
                  Ngừng chia sẻ
                </button>
              )}
            </div>
          </div>
        </details>
      )}
    </article>
  );
}
