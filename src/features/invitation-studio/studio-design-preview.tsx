'use client';

import React from 'react';
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
  const [activeSection, setActiveSection] = React.useState<string>('header');

  const scrollToSection = (sectionId: string, sectionKey: string) => {
    setActiveSection(sectionKey);
    const target = scrollContainerRef.current?.querySelector(`#${sectionId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

        {/* Thanh chuyển nhanh các phân đoạn thiệp cưới */}
        <div className={ix.stepper} role="tablist" aria-label="Các phân đoạn thiệp cưới">
          <button
            type="button"
            className={ix.stepPill}
            data-active={activeSection === 'header'}
            onClick={() => scrollToSection('hy-invite-sec-header', 'header')}
          >
            Trang bìa
          </button>
          <button
            type="button"
            className={ix.stepPill}
            data-active={activeSection === 'message'}
            onClick={() => scrollToSection('hy-invite-sec-message', 'message')}
          >
            Lời nhắn
          </button>
          <button
            type="button"
            className={ix.stepPill}
            data-active={activeSection === 'event'}
            onClick={() => scrollToSection('hy-invite-sec-event', 'event')}
          >
            Thời gian & sảnh
          </button>
          <button
            type="button"
            className={ix.stepPill}
            data-active={activeSection === 'timeline'}
            onClick={() => scrollToSection('hy-invite-sec-timeline', 'timeline')}
          >
            Lịch trình
          </button>
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
                  lịch trình chính thức.
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
          <div className={ix.modalContent}>
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
