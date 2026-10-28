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

  return (
    <section className="invitation-preview" aria-label="Xem trước thiệp cưới">
      <div className="preview-toolbar">
        <span>Preview · Nội dung đang chỉnh</span>
        <div className="preview-viewport-controls">
          <button
            type="button"
            className={`preview-scale-btn ${previewDevice === 'mobile' ? 'is-active' : ''}`}
            onClick={() => setPreviewDevice('mobile')}
            title="Khổ điện thoại (380px)"
          >
            Khổ điện thoại
          </button>
          <button
            type="button"
            className={`preview-scale-btn ${previewDevice === 'desktop' ? 'is-active' : ''}`}
            onClick={() => setPreviewDevice('desktop')}
            title="Khổ rộng (520px)"
          >
            Khổ rộng
          </button>
        </div>
      </div>
      <div className={`invite-paper ${previewDevice === 'desktop' ? 'is-desktop-scale' : ''}`}>
        <InvitationContents
          apiBase={getApiBaseUrl()}
          invitation={{
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
          }}
        />
        <p className="cw-note">
          Bản xem trước nội dung đang chỉnh. Khi xuất bản, máy chủ dùng thông tin và lịch trình có hiệu lực.
        </p>
      </div>
    </section>
  );
}

