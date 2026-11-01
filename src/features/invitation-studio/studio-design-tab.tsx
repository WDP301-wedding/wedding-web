'use client';

import type { InvitationStudioState } from './use-invitation-studio';
import { StudioDesignForm } from './studio-design-form';
import { StudioAiBox } from './studio-ai-box';
import { StudioDesignPreview } from './studio-design-preview';
import { ix } from './studio-classes';

export type StudioDesignTabProps = Readonly<{ studio: InvitationStudioState }>;

export function StudioDesignTab({ studio }: StudioDesignTabProps) {
  const { currentDesign, title, mobileViewMode, setMobileViewMode } = studio;
  return (
    <section aria-labelledby="design-heading" className={ix.liveEditor} data-mode={mobileViewMode}>
      <header className={ix.designMeta}>
        <div>
          <h2 id="design-heading" className={ix.title}>
            Nội dung thiệp
          </h2>
          <p className={ix.meta}>{title || 'Thiệp chưa đặt tên'}</p>
        </div>
        <span className={ix.chip}>
          {currentDesign ? 'Bản lưu ' + currentDesign.revisionNumber : 'Thiết kế mới'}
        </span>
      </header>
      <div className={ix.modeBar} role="group" aria-label="Chế độ xem thiệp">
        <button
          type="button"
          className={ix.modeButton}
          aria-pressed={mobileViewMode === 'editor'}
          onClick={() => setMobileViewMode('editor')}
        >
          Chỉnh nội dung
        </button>
        <button
          type="button"
          className={ix.modeButton}
          aria-pressed={mobileViewMode === 'preview'}
          onClick={() => setMobileViewMode('preview')}
        >
          Xem trước
        </button>
      </div>
      <div className={ix.inspector}>
        <StudioAiBox studio={studio} />
        <div className={ix.formDivider}>
          <h4>Chi tiết nội dung &amp; câu chữ</h4>
          <p className={ix.meta}>
            Bạn có thể xem trước ở khung bên phải hoặc tùy ý sửa tay các trường chữ dưới đây:
          </p>
        </div>
        <StudioDesignForm studio={studio} />
      </div>
      <StudioDesignPreview studio={studio} />
    </section>
  );
}
