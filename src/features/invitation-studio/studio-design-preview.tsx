'use client';

import React from 'react';
import { InvitationContents } from './invitation-content';
import { getApiBaseUrl } from './invitation-studio-utils';
import type { InvitationStudioState } from './use-invitation-studio';

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
        imageUrl: section.derivedAssetId
          ? (assetPreviewMap[section.derivedAssetId] ?? null)
          : null,
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
      <section className="invitation-preview" aria-label="Xem trước thiệp cưới">
        {/* Thanh công cụ điều khiển viewport & chế độ xem */}
        <div className="preview-toolbar">
          <div className="preview-toolbar-meta">
            <span className="preview-indicator">Xem trước thực tế</span>
            <span className="preview-hint-text">Khung chuẩn tỷ lệ</span>
          </div>

          <div className="preview-viewport-controls">
            <button
              type="button"
              className={`preview-scale-btn ${previewDevice === 'mobile' ? 'is-active' : ''}`}
              onClick={() => setPreviewDevice('mobile')}
              title="Khổ điện thoại (380px)"
            >
              Điện thoại
            </button>
            <button
              type="button"
              className={`preview-scale-btn ${previewDevice === 'desktop' ? 'is-active' : ''}`}
              onClick={() => setPreviewDevice('desktop')}
              title="Khổ rộng (520px)"
            >
              Khổ rộng
            </button>
            <button
              type="button"
              className="preview-scale-btn preview-fullscreen-btn"
              onClick={() => setIsFullscreen(true)}
              title="Mở toàn màn hình trải nghiệm như khách nhận thiệp"
            >
              Toàn màn hình
            </button>
          </div>
        </div>

        {/* Thanh chuyển nhanh các phân đoạn thiệp cưới */}
        <div className="preview-stepper-bar" role="tablist" aria-label="Các phân đoạn thiệp cưới">
          <button
            type="button"
            className={`preview-step-pill ${activeSection === 'header' ? 'is-active' : ''}`}
            onClick={() => scrollToSection('hy-invite-sec-header', 'header')}
          >
            Trang bìa
          </button>
          <button
            type="button"
            className={`preview-step-pill ${activeSection === 'message' ? 'is-active' : ''}`}
            onClick={() => scrollToSection('hy-invite-sec-message', 'message')}
          >
            Lời nhắn
          </button>
          <button
            type="button"
            className={`preview-step-pill ${activeSection === 'event' ? 'is-active' : ''}`}
            onClick={() => scrollToSection('hy-invite-sec-event', 'event')}
          >
            Thời gian & sảnh
          </button>
          <button
            type="button"
            className={`preview-step-pill ${activeSection === 'timeline' ? 'is-active' : ''}`}
            onClick={() => scrollToSection('hy-invite-sec-timeline', 'timeline')}
          >
            Lịch trình
          </button>
        </div>

        {/* Khung mô phỏng thiết bị di động chuẩn công thái học */}
        <div className="preview-phone-simulator">
          <div className="preview-phone-bezel">
            <div className="preview-phone-speaker" aria-hidden="true" />
            <div
              ref={scrollContainerRef}
              className={`preview-phone-screen ${previewDevice === 'desktop' ? 'is-desktop-scale' : ''}`}
            >
              <div className="invite-paper-inner">
                <InvitationContents
                  apiBase={getApiBaseUrl()}
                  invitation={invitationData}
                />
                <p className="cw-note" style={{ margin: '24px 0 8px', fontSize: 12 }}>
                  Bản xem trước nội dung đang chỉnh. Khi xuất bản, hệ thống áp dụng thông tin và lịch trình chính thức.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal trải nghiệm toàn màn hình như khách nhận thiệp */}
      {isFullscreen ? (
        <div
          className="preview-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Xem trước thiệp cưới toàn màn hình"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullscreen(false);
          }}
        >
          <div className="preview-modal-content">
            <div className="preview-modal-header">
              <h3>Trải nghiệm thiệp cưới trên di động</h3>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsFullscreen(false)}
                style={{ minHeight: 36, padding: '4px 14px', fontSize: 13 }}
              >
                Đóng
              </button>
            </div>
            <div className="preview-modal-body">
              <div className="preview-phone-bezel in-modal">
                <div className="preview-phone-speaker" aria-hidden="true" />
                <div className="preview-phone-screen">
                  <div className="invite-paper-inner">
                    <InvitationContents
                      apiBase={getApiBaseUrl()}
                      invitation={invitationData}
                    />
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
