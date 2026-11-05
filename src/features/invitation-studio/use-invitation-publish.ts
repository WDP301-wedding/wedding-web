'use client';

import { useRef, useState } from 'react';
import type { z } from 'zod';
import type { InvitationGateway, DesignView } from './invitation-api';
import {
  getApiBaseUrl,
  getOrGenerateKey,
  invitationErrorMessage,
  publicationSnapshotSchema,
} from './invitation-studio-utils';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { sharedCoupleRealtime } from '../realtime/realtime-client';
import { ApiClientError } from '../../lib/api/client';
import { notify } from '../../design-system/toast';
import type { ConfirmOptions } from '../../design-system/confirm-dialog';

export interface UseInvitationPublishOptions {
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
  currentDesign?: DesignView | undefined;
  designs: readonly DesignView[];
  writing: boolean;
  designDirty: boolean;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export function useInvitationPublish({
  bookingId,
  accessToken,
  gateway,
  currentDesign,
  designs,
  writing,
  designDirty,
  confirm,
}: UseInvitationPublishOptions) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedDesignRevisionId, setPublishedDesignRevisionId] = useState<string | null>(null);
  const commandBusy = useRef(false);
  const lastPublished = useRef<{ designId: string; revisionId: string } | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publicationRevision, setPublicationRevision] = useState<number | null>(null);
  const [publicationState, setPublicationState] = useState<
    'unknown' | 'unpublished' | 'published' | 'stale_conflict'
  >('unknown');

  const incomingPublication = useRef<z.infer<typeof publicationSnapshotSchema> | null>(null);
  const publishKeyRef = useRef<{ signature: string; key: string } | null>(null);
  const unpublishKeyRef = useRef<{ signature: string; key: string } | null>(null);

  const publicationLive = useLiveRefresh(
    () => {
      const next = incomingPublication.current;
      incomingPublication.current = null;
      if (next && next.publicationRevision >= (publicationRevision ?? 0)) {
        setPublicationRevision(next.publicationRevision);
        setPublishedSlug(next.published ? next.publicSlug : null);
        setPublishedDesignRevisionId(next.published ? next.designRevisionId : null);
        const source = next.published
          ? designs.find((item) => item.revisionId === next.designRevisionId)
          : undefined;
        if (source)
          lastPublished.current = { designId: source.designId, revisionId: source.revisionId };
        setPublicationState(next.published ? 'published' : 'unpublished');
      }
    },
    { scope: bookingId + ':publication', bookingId, types: [], blocked: writing },
  );

  useRealtimeSubscription({
    bookingId,
    filterBooking: true,
    onEvent: (ev) => {
      if (ev.type !== 'print_order.updated' || ev.scope.bookingId !== bookingId) return;
      const parsed = publicationSnapshotSchema.safeParse(ev.payload?.['publication']);
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

  const handlePublish = async () => {
    if (
      !currentDesign ||
      publicationRevision === null ||
      designDirty ||
      writing ||
      commandBusy.current ||
      publicationState === 'stale_conflict'
    )
      return;
    commandBusy.current = true;
    setIsPublishing(true);
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
      setPublishedDesignRevisionId(currentDesign.revisionId);
      lastPublished.current = {
        designId: currentDesign.designId,
        revisionId: currentDesign.revisionId,
      };
      setPublicationRevision(res.publicationRevision);
      setPublicationState('published');
      publishKeyRef.current = null;
      notify.success('Thiệp cưới đã được xuất bản trực tuyến!');
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'INVITATION_PUBLICATION_STALE') {
        setPublicationState('stale_conflict');
        sharedCoupleRealtime.requestBookingResync(bookingId);
      }
      notify.error(invitationErrorMessage(err, 'Không thể xuất bản thiệp cưới.'));
    } finally {
      commandBusy.current = false;
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    const designId =
      designs.find((item) => item.revisionId === publishedDesignRevisionId)?.designId ??
      (lastPublished.current?.revisionId === publishedDesignRevisionId
        ? lastPublished.current?.designId
        : undefined) ??
      currentDesign?.designId;
    if (
      !designId ||
      publicationRevision === null ||
      !publishedSlug ||
      writing ||
      commandBusy.current
    )
      return;
    const agreed = await confirm({
      title: 'Huỷ xuất bản thiệp?',
      description:
        'Đường dẫn thiệp công khai sẽ ngừng hoạt động — khách đã nhận link sẽ không mở được nữa. Bạn có thể xuất bản lại sau.',
      confirmLabel: 'Huỷ xuất bản',
      cancelLabel: 'Giữ thiệp',
      tone: 'danger',
    });
    if (!agreed || commandBusy.current) return;
    commandBusy.current = true;
    setIsPublishing(true);
    const pubRev = publicationRevision;
    const signature = `${designId}:${pubRev}`;
    const key = getOrGenerateKey(unpublishKeyRef, signature, 'unpublish-design');
    try {
      const res = await gateway.unpublishDesign(accessToken, bookingId, designId, pubRev, key);
      const nextRev = res.publicationRevision;
      setPublishedSlug(null);
      setPublishedDesignRevisionId(null);
      setPublicationRevision(nextRev);
      setPublicationState('unpublished');
      unpublishKeyRef.current = null;
      notify.success('Đã hủy xuất bản thiệp cưới.');
    } catch (err: unknown) {
      notify.error(invitationErrorMessage(err, 'Không thể hủy xuất bản thiệp cưới.'));
    } finally {
      commandBusy.current = false;
      setIsPublishing(false);
    }
  };

  const handleDownloadQr = async () => {
    if (!publishedSlug) return;
    const qrUrl = (() => {
      const base = getApiBaseUrl().replace(/\/+$/, '');
      return base.endsWith('/api/v1')
        ? `${base}/public/invitations/${publishedSlug}/qr`
        : `${base}/api/v1/public/invitations/${publishedSlug}/qr`;
    })();
    try {
      const res = await fetch(qrUrl);
      if (!res.ok) throw new Error('Không tải được mã QR.');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `thiep-cuoi-qr-${publishedSlug.slice(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      notify.success('Đã tải xuống mã QR thiệp cưới.');
    } catch {
      notify.error('Không tải được mã QR. Hãy thử lại.');
    }
  };

  const handleShareZalo = () => {
    if (typeof window === 'undefined' || !publishedSlug) return;
    const fullUrl = `${window.location.origin}/t/${publishedSlug}`;
    window.open(
      `https://zalo.me/share?url=${encodeURIComponent(fullUrl)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleNativeShare = async () => {
    if (typeof window === 'undefined' || !publishedSlug) return;
    const fullUrl = `${window.location.origin}/t/${publishedSlug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Thiệp cưới',
          url: fullUrl,
        });
        notify.success('Đã mở chia sẻ thiệp.');
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(fullUrl);
        notify.success('Đã sao chép liên kết thiệp để gửi tin nhắn.');
      } catch {
        notify.error('Chưa sao chép được liên kết. Hãy mở thiệp đang chia sẻ để lấy đường dẫn.');
      }
    }
  };

  return {
    isPublishing,
    publishedSlug,
    publishedDesignRevisionId,
    publicationRevision,
    publicationState,
    handlePublish,
    handleUnpublish,
    handleDownloadQr,
    handleShareZalo,
    handleNativeShare,
  };
}
