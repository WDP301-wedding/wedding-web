'use client';

import React from 'react';
import { useOverlayFocus } from '../../design-system/use-overlay-focus';
import { InvitationContents } from './invitation-content';
import { getApiBaseUrl } from './invitation-studio-utils';
import type { InvitationStudioState } from './use-invitation-studio';
import { ix } from './studio-classes';

export function StudioDesignPreview({
  studio,
}: Readonly<{
  studio: InvitationStudioState;
}>) {
  const {
    currentDesign,
    title,
    brideName,
    groomName,
    greeting,
    message,
    footer,
    previewDevice,
    setPreviewDevice,
    assetPreviewMap,
    studioAssets,
    event,
    timeline,
  } = studio;

  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const fullscreenRef = useOverlayFocus<HTMLDivElement>(isFullscreen, () => setIsFullscreen(false));
  const invitationData = React.useMemo(
    () => ({
      title,
      textFields: { brideName, groomName, greeting, message, footer },
      event,
      timeline,
      sections: (currentDesign?.sections ?? []).map((section) => ({
        kind: section.kind,
        textKey: section.textKey,
        imageUrl: section.derivedAssetId ? (assetPreviewMap[section.derivedAssetId] ?? null) : null,
      })),
      assets: studioAssets,
      theme: studio.cardTheme,
      presentation: studio.presentation,
      seating: studio.includesSeating ? studio.seating.tables : null,
    }),
    [
      title,
      brideName,
      groomName,
      greeting,
      message,
      footer,
      event,
      timeline,
      currentDesign?.sections,
      assetPreviewMap,
      studioAssets,
      studio.cardTheme,
      studio.presentation,
      studio.includesSeating,
      studio.seating.tables,
    ],
  );

  return (
    <>
      <section className={ix.preview} aria-label="Xem trước thiệp cưới">
        {/* Thanh công cụ điều khiển viewport & chế độ xem */}
        <div className={ix.previewToolbar}>
          <div className={ix.previewMeta}>
            <span className={ix.previewIndicator}>Xem trước thực tế</span>
            <span className={ix.previewHint}>Khung chuẩn tỷ lệ</span>
          </div>

          <div className={ix.viewport}>
            <button
              type="button"
              className={ix.scaleButton}
              aria-pressed={previewDevice === 'mobile'}
              onClick={() => setPreviewDevice('mobile')}
              title="Khổ điện thoại (380px)"
            >
              Điện thoại
            </button>
            <button
              type="button"
              className={ix.scaleButton}
              aria-pressed={previewDevice === 'desktop'}
              onClick={() => setPreviewDevice('desktop')}
              title="Khổ rộng (520px)"
            >
              Khổ rộng
            </button>
            <button
              type="button"
              className={`${ix.scaleButton} text-primary`}
              onClick={() => setIsFullscreen(true)}
              title="Mở toàn màn hình trải nghiệm như khách nhận thiệp"
            >
              Toàn màn hình
            </button>
          </div>
        </div>

        {/* Khung mô phỏng thiết bị di động chuẩn công thái học */}
        <div className={ix.phone}>
          <div className={ix.bezel} data-device={previewDevice}>
            <div className={ix.speaker} aria-hidden="true" />
            <div ref={scrollContainerRef} className={ix.screen}>
              <div className={ix.paper}>
                <InvitationContents apiBase={getApiBaseUrl()} invitation={invitationData} />
                <p className={ix.previewNote}>
                  Bản xem trước nội dung đang chỉnh. Khi xuất bản, hệ thống áp dụng thông tin và
                  lịch trình chính thức. Mở thiệp và dùng các nút chuyển trang hoặc vuốt ngang. Bản
                  in là bố cục A5 tĩnh riêng; luôn kiểm tra PDF trước khi đặt in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal trải nghiệm toàn màn hình như khách nhận thiệp */}
      {isFullscreen ? (
        <div
          className={ix.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Xem trước thiệp cưới toàn màn hình"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullscreen(false);
          }}
        >
          <div className={ix.modalContent} ref={fullscreenRef}>
            <div className={ix.modalHeader}>
              <h3>Trải nghiệm thiệp cưới trên di động</h3>
              <button
                type="button"
                className={ix.btnSmallOutline}
                onClick={() => setIsFullscreen(false)}
              >
                Đóng
              </button>
            </div>
            <div className={ix.modalBody}>
              <div className={ix.bezelModal}>
                <div className={ix.speaker} aria-hidden="true" />
                <div className={ix.screen}>
                  <div className={ix.paper}>
                    <InvitationContents apiBase={getApiBaseUrl()} invitation={invitationData} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
