'use client';

import { useState } from 'react';
import type { InvitationStudioState } from './use-invitation-studio';
import { StudioDesignForm } from './studio-design-form';
import { StudioAiBox } from './studio-ai-box';
import { StudioDesignPreview } from './studio-design-preview';
import { ix } from './studio-classes';

export type StudioDesignTabProps = Readonly<{ studio: InvitationStudioState }>;

export function StudioDesignTab({ studio }: StudioDesignTabProps) {
  const { currentDesign, title, mobileViewMode, setMobileViewMode } = studio;
  const [panel, setPanel] = useState<'content' | 'style'>(currentDesign ? 'content' : 'style');
  async function changeDesign(designId: string | null) {
    if (studio.writing || studio.aiJob.busy) return;
    if (
      studio.designDirty &&
      !(await studio.confirm({
        title: 'Đổi mẫu đang chỉnh sửa?',
        description:
          'Các thay đổi chưa lưu của mẫu hiện tại sẽ được bỏ. Bạn có thể lưu trước khi chuyển mẫu.',
        confirmLabel: 'Bỏ thay đổi và chuyển mẫu',
      }))
    )
      return;
    setPanel(designId === null ? 'style' : 'content');
    if (designId === null) studio.startNewDesign();
    else studio.selectDesign(designId);
  }
  return (
    // data-wide: trình sửa 2 cột cần khung nội dung rộng hơn (SpaceShell đọc thuộc tính này).
    <section
      aria-labelledby="design-heading"
      className={ix.liveEditor}
      data-mode={mobileViewMode}
      data-wide
    >
      <header className={ix.designMeta}>
        <div>
          <h2 id="design-heading" className={ix.title}>
            Thiết kế thiệp
          </h2>
          <p className={ix.meta}>{title || 'Thiệp chưa đặt tên'}</p>
          {studio.designs.length ? (
            <div className={ix.actions}>
              <label htmlFor="design-selection" className={ix.label}>
                Mẫu đang chỉnh sửa
              </label>
              <select
                id="design-selection"
                className={ix.input}
                disabled={studio.writing}
                value={currentDesign?.designId ?? ''}
                onChange={(event) => {
                  event.stopPropagation();
                  void changeDesign(event.target.value || null);
                }}
              >
                {!currentDesign ? <option value="">Thiết kế mới chưa lưu</option> : null}
                {studio.designs.map((design) => (
                  <option key={design.designId} value={design.designId}>
                    {design.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={ix.btnSmallOutline}
                disabled={studio.writing}
                onClick={() => void changeDesign(null)}
              >
                Tạo thêm mẫu thiệp
              </button>
            </div>
          ) : null}
        </div>
        <span className={ix.chip}>
          {studio.designDirty
            ? 'Chưa lưu thay đổi'
            : currentDesign
              ? 'Bản lưu ' + currentDesign.revisionNumber
              : 'Thiết kế mới'}
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
        <div className={ix.actions} role="group" aria-label="Phần chỉnh sửa">
          <button
            type="button"
            aria-pressed={panel === 'style'}
            className={panel === 'style' ? ix.btnSmall : ix.btnSmallOutline}
            onClick={() => setPanel('style')}
          >
            Mẫu và giao diện
          </button>
          <button
            type="button"
            aria-pressed={panel === 'content'}
            className={panel === 'content' ? ix.btnSmall : ix.btnSmallOutline}
            onClick={() => setPanel('content')}
          >
            Nội dung thiệp
          </button>
        </div>
        <div className={panel === 'style' ? 'block' : 'hidden'}>
          <StudioAiBox studio={studio} onApplied={() => setPanel('content')} />
        </div>
        {panel === 'content' && <StudioDesignForm studio={studio} />}
      </div>
      <StudioDesignPreview studio={studio} />
    </section>
  );
}
