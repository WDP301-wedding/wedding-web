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
  title: string;
  groomName: string;
  brideName: string;
  writing: boolean;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export function useInvitationPublish({
  bookingId,
  accessToken,
  gateway,
  currentDesign,
  title,
  groomName,
  brideName,
  writing,
  confirm,
}: UseInvitationPublishOptions) {
  const [isPublishing, setIsPublishing] = useState(false);
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
    if (!currentDesign || publicationRevision === null) return;
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
      notify.success('Đã hủy xuất bản thiệp cưới.');
    } catch (err: unknown) {
      notify.error(invitationErrorMessage(err, 'Không thể hủy xuất bản thiệp cưới.'));
    } finally {
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
      window.open(qrUrl, '_blank');
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
          title: title || 'Thiệp Cưới Báo Hỷ',
          text: `Thiệp cưới của ${groomName || 'chú rể'} & ${brideName || 'cô dâu'}`,
          url: fullUrl,
        });
        notify.success('Đã mở chia sẻ thiệp.');
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(fullUrl);
      notify.success('Đã sao chép liên kết thiệp để gửi tin nhắn.');
    }
  };

  return {
    isPublishing,
    publishedSlug,
    publicationRevision,
    publicationState,
    handlePublish,
    handleUnpublish,
    handleDownloadQr,
    handleShareZalo,
    handleNativeShare,
  };
}
