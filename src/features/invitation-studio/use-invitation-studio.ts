'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { sharedCoupleRealtime } from '../realtime/realtime-client';
import { browserSession } from '../identity-access/browser-session';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { notify } from '../../design-system/toast';
import type { InvitationEvent, InvitationContent } from './invitation-content';
import type { InvitationGateway, DesignView, PrintOrderView } from './invitation-api';
import { invitationErrorMessage } from './invitation-studio-utils';
import { useInvitationDesign } from './use-invitation-design';
import { useInvitationMedia } from './use-invitation-media';
import { useInvitationPublish } from './use-invitation-publish';
import { useInvitationSeating } from './use-invitation-seating';
import { useInvitationPrint } from './use-invitation-print';

export interface UseInvitationStudioOptions {
  readonly event?: InvitationEvent | null;
  readonly timeline?: InvitationContent['timeline'];
  readonly bookingId: string;
  readonly accessToken: string;
  readonly gateway: InvitationGateway;
  readonly initialTab?: ('design' | 'media' | 'publish' | 'print') | undefined;
  readonly onTabChange?: ((tab: 'design' | 'media' | 'publish' | 'print') => void) | undefined;
  readonly initialDesigns?: readonly DesignView[] | undefined;
  readonly initialOrders?: readonly PrintOrderView[] | undefined;
  readonly mediaCutoffEstimate?: string | null | undefined;
  /** Tên cô dâu/chú rể đã nhập ở Thoả thuận: điền sẵn khi thiết kế chưa có tên. */
  readonly coupleNames?: { brideName?: string | null; groomName?: string | null } | undefined;
}

export function useInvitationStudio({
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
  coupleNames,
}: UseInvitationStudioOptions) {
  const [openedAt] = useState(() => Date.now());
  const mediaLikelyLocked =
    mediaCutoffEstimate !== null && openedAt >= Date.parse(mediaCutoffEstimate);

  const [activeTab, setActiveTab] = useState<'design' | 'media' | 'publish' | 'print'>(initialTab);
  const prevInitialTab = useRef(initialTab);
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

  const [printVisited, setPrintVisited] = useState(initialTab === 'print');
  if (activeTab === 'print' && !printVisited) setPrintVisited(true);

  const { confirm, dialog } = useConfirmDialog();

  // 1. Design & AI sub-hook
  const design = useInvitationDesign({
    bookingId,
    accessToken,
    gateway,
    initialDesigns,
    coupleNames,
  });

  // 2. Media gallery & assets sub-hook
  const media = useInvitationMedia({
    bookingId,
    accessToken,
    gateway,
    derivedAssetIds: design.derivedAssetIds,
    setDerivedAssetIds: design.setDerivedAssetIds,
    designs: design.designs,
    setDesigns: design.setDesigns,
    previewUrl: design.previewUrl,
    confirm,
  });

  // Active mutations lock
  const writing =
    design.saving ||
    design.suggestionBusy ||
    media.isUploadingMedia ||
    media.detachingAssetId !== null ||
    media.derivingAssetId !== null;

  // 3. Publishing & QR sub-hook
  const publish = useInvitationPublish({
    bookingId,
    accessToken,
    gateway,
    currentDesign: design.currentDesign,
    title: design.title,
    groomName: design.groomName,
    brideName: design.brideName,
    writing,
    confirm,
  });

  // 4. Print orders sub-hook
  const print = useInvitationPrint({
    bookingId,
    accessToken,
    gateway,
    designs: design.designs,
    initialOrders,
    printVisited,
    writing: writing || publish.isPublishing,
    confirm,
  });

  const seating = useInvitationSeating(bookingId, design.includesSeating);

  // View modes
  const [mobileViewMode, setMobileViewMode] = useState<'editor' | 'preview'>('editor');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Realtime resync & live design
  useEffect(() => {
    sharedCoupleRealtime.requestBookingResync(bookingId);
  }, [bookingId]);

  const designLive = useLiveRefresh(
    async (isCurrent) => {
      try {
        const loaded = await browserSession.authorize((token) =>
          gateway.listDesigns(token, bookingId),
        );
        if (!isCurrent()) return;
        design.refreshDesigns(loaded);
      } catch (err) {
        if (isCurrent()) notify.error(invitationErrorMessage(err, 'Không thể cập nhật thiệp.'));
      }
    },
    {
      scope: bookingId,
      bookingId,
      blocked: writing || design.designDirty || design.suggestionBusy,
      invalidateOnBlock: true,
      types: ['print_order.updated', 'booking.updated'],
    },
  );

  return {
    event,
    timeline,
    bookingId,
    activeTab,
    selectTab,
    mediaLikelyLocked,
    // Design
    ...design,
    // Media
    ...media,
    // Publish
    ...publish,
    // Print
    ...print,
    seating,
    // UI view modes
    mobileViewMode,
    setMobileViewMode,
    previewDevice,
    setPreviewDevice,
    // Lifecycle
    writing:
      writing ||
      publish.isPublishing ||
      print.isOrdering ||
      print.approvingOrderId !== null ||
      print.cancellingOrderId !== null,
    designLive,
    confirm,
    dialog,
  };
}

export type InvitationStudioState = ReturnType<typeof useInvitationStudio>;
