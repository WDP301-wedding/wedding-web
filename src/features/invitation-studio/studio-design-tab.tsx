'use client';

import React from 'react';
import type { InvitationStudioState } from './use-invitation-studio';
import { StudioDesignForm } from './studio-design-form';
import { StudioAiBox } from './studio-ai-box';
import { StudioDesignPreview } from './studio-design-preview';

export type StudioDesignTabProps = Readonly<{
  studio: InvitationStudioState;
}>;

export function StudioDesignTab({ studio }: StudioDesignTabProps) {
  const {
    currentDesign,
    title,
    brideName,
    groomName,
    mobileViewMode,
    setMobileViewMode,
  } = studio;

  return (
    <section
      aria-labelledby="design-heading"
      className={`live-editor ${mobileViewMode === 'preview' ? 'mobile-show-preview' : 'mobile-show-editor'}`}
    >
      <div className="studio-mobile-mode-bar" role="group" aria-label="Chế độ xem Studio">
        <button
          type="button"
          className={`studio-mobile-mode-btn ${mobileViewMode === 'editor' ? 'is-active' : ''}`}
          onClick={() => setMobileViewMode('editor')}
        >
          Chỉnh sửa nội dung
        </button>
        <button
          type="button"
          className={`studio-mobile-mode-btn ${mobileViewMode === 'preview' ? 'is-active' : ''}`}
          onClick={() => setMobileViewMode('preview')}
        >
          Xem trước thiệp
        </button>
      </div>

      <aside className="template-rail">
        <div className="eyebrow">Thiết kế đang chọn</div>
        <div className="template-card selected">
          <div className="template-preview botanical">
            <span>
              {groomName || 'Chú rể'}
              <br />
              &amp;
              <br />
              {brideName || 'Cô dâu'}
            </span>
          </div>
          <strong>{title}</strong>
          <small>
            {currentDesign ? 'Phiên bản ' + currentDesign.revisionNumber : 'Thiết kế mới'}
          </small>
        </div>
        <div className="eyebrow rail-label">Các phần</div>
        <p className="muted">Lời mời · Hình ảnh · Nội dung tiệc</p>
      </aside>

      <StudioDesignPreview studio={studio} />

      <div className="inspector">
        <div className="inspector-head">
          <h2 id="design-heading" className="studio-title">
            Cấu Trúc Nội Dung Thiệp Cưới
          </h2>
        </div>
        <StudioDesignForm studio={studio} />
        <StudioAiBox studio={studio} />
      </div>
    </section>
  );
}
