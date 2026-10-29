'use client';

import type { InvitationStudioState } from './use-invitation-studio';
import { StudioDesignForm } from './studio-design-form';
import { StudioAiBox } from './studio-ai-box';
import { StudioDesignPreview } from './studio-design-preview';

export type StudioDesignTabProps = Readonly<{ studio: InvitationStudioState }>;

export function StudioDesignTab({ studio }: StudioDesignTabProps) {
  const { currentDesign, title, mobileViewMode, setMobileViewMode } = studio;
  return (
    <section
      aria-labelledby="design-heading"
      className={`live-editor ${mobileViewMode === 'preview' ? 'mobile-show-preview' : 'mobile-show-editor'}`}
    >
      <header className="studio-design-meta">
        <div>
          <h2 id="design-heading" className="studio-title">
            Nội dung thiệp
          </h2>
          <p className="studio-meta">{title || 'Thiệp chưa đặt tên'}</p>
        </div>
        <span className="hy-chip">
          {currentDesign ? 'Bản lưu ' + currentDesign.revisionNumber : 'Thiết kế mới'}
        </span>
      </header>
      <div className="studio-mobile-mode-bar" role="group" aria-label="Chế độ xem thiệp">
        <button
          type="button"
          className={`studio-mobile-mode-btn ${mobileViewMode === 'editor' ? 'is-active' : ''}`}
          aria-pressed={mobileViewMode === 'editor'}
          onClick={() => setMobileViewMode('editor')}
        >
          Chỉnh nội dung
        </button>
        <button
          type="button"
          className={`studio-mobile-mode-btn ${mobileViewMode === 'preview' ? 'is-active' : ''}`}
          aria-pressed={mobileViewMode === 'preview'}
          onClick={() => setMobileViewMode('preview')}
        >
          Xem trước
        </button>
      </div>
      <div className="inspector">
        <StudioAiBox studio={studio} />
        <div className="studio-form-divider-title" style={{ marginTop: 8 }}>
          <h4 style={{ margin: '8px 0 4px', fontSize: 15, color: 'var(--hy-wine, #7a1f3d)' }}>
            Chi tiết nội dung &amp; câu chữ
          </h4>
          <p className="studio-meta" style={{ margin: '0 0 12px' }}>
            Bạn có thể xem trước ở khung bên phải hoặc tùy ý sửa tay các trường chữ dưới đây:
          </p>
        </div>
        <StudioDesignForm studio={studio} />
      </div>
      <StudioDesignPreview studio={studio} />
    </section>
  );
}
