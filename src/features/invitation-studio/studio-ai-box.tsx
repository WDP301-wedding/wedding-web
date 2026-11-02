'use client';

import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { imageJobStatusText } from './use-image-job';
import type { InvitationStudioState } from './use-invitation-studio';
import { AI_DESIGN_PRESETS, type AiDesignPreset } from './ai-design-presets';
import { InteractiveInvitation } from './interactive-invitation';
import { getApiBaseUrl } from './invitation-studio-utils';
import { DESIGN_LAYOUTS } from './invitation-presentation';
import { px } from './studio-panel-classes';
import { ix } from './studio-classes';

export function StudioAiBox({
  studio,
}: Readonly<{
  studio: InvitationStudioState;
}>) {
  const {
    aiPrompt,
    setAiPrompt,
    aiJob,
    handleAiGenerate,
    restoredAiImage,
    applyRestoredAiImage,
    mediaLikelyLocked,
    applyAiDesign,
    cardTheme,
    brideName,
    groomName,
  } = studio;

  const [customPrompt, setCustomPrompt] = useState('');
  const isGeneratingCard = studio.suggestionBusy;
  const [showImageSubGenerator, setShowImageSubGenerator] = useState(false);

  const handleGenerateCustomCard = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (customPrompt.trim().length < 10) return;
    void studio.generateSuggestion(customPrompt.trim());
  };
  const handleApplyPreset = (preset: AiDesignPreset) => {
    if (studio.writing) return;
    applyAiDesign({ ...preset.design, brideName, groomName });
  };

  return (
    <fieldset disabled={studio.writing} className={px.aiCard}>
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div>
          <h3 className={ix.subtitle}>Thiết kế toàn bộ thiệp cưới</h3>
          <p className={ix.meta}>
            Nhập mô tả ý tưởng của bạn (phong cách, tông màu, lời chúc...) hoặc bấm chọn nhanh 1
            trong 3 mẫu có sẵn. Mẫu dùng ngay không cần AI; AI đề xuất bố cục, màu và lời mời, giữ
            nguyên thông tin hồ sơ.
          </p>
        </div>
      </div>

      {/* Thanh Prompt Input tùy chỉnh */}
      <form onSubmit={handleGenerateCustomCard} className={px.aiForm}>
        <label htmlFor="ai-custom-card-prompt" className={ix.label}>
          Mô tả phong cách thiệp cưới theo ý bạn:
        </label>
        <div className={px.promptRow}>
          <input
            id="ai-custom-card-prompt"
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ví dụ: Thiệp mở hai cánh, màu đỏ rượu và vàng, lời mời trang trọng"
            maxLength={2000}
            minLength={10}
            disabled={isGeneratingCard}
            className={ix.input}
          />
          <button
            type="submit"
            disabled={isGeneratingCard || customPrompt.trim().length < 10}
            className={ix.btn}
          >
            {isGeneratingCard ? 'Đang thiết kế...' : 'Đề xuất thiết kế bằng AI'}
          </button>
        </div>

        <div className={px.ideasRow}>
          <span className={ix.meta}>Ý tưởng gợi ý:</span>
          <button
            type="button"
            className={px.chipButton}
            onClick={() => {
              setCustomPrompt(
                'Thiệp cưới truyền thống Á Đông áo dài đỏ thắm trầu cau mang đậm nét đẹp văn hóa',
              );
            }}
          >
            Á Đông truyền thống
          </button>
          <button
            type="button"
            className={px.chipButton}
            onClick={() => {
              setCustomPrompt(
                'Thiệp cưới dạ tiệc ánh sao Celestial Navy quý phái huyền bí lung linh',
              );
            }}
          >
            Dạ tiệc ánh sao
          </button>
          <button
            type="button"
            className={px.chipButton}
            onClick={() => {
              setCustomPrompt('Thiệp cưới phong cách Champagne thanh lịch tone vàng ánh kim ấm áp');
            }}
          >
            Champagne ấm áp
          </button>
        </div>
      </form>

      {studio.suggestionError ? (
        <p role="alert" className={ix.meta}>
          {studio.suggestionError}
        </p>
      ) : null}
      {studio.suggestion ? (
        <div className={px.aiCard} role="status">
          <strong>Thiết kế AI đã sẵn sàng</strong>
          <InteractiveInvitation
            apiBase={getApiBaseUrl()}
            invitation={{
              title: studio.suggestion.title,
              textFields: {
                brideName,
                groomName,
                greeting: studio.suggestion.greeting,
                message: studio.suggestion.message,
                footer: studio.suggestion.footer,
              },
              event: studio.event,
              timeline: studio.timeline,
              assets: [],
              presentation: studio.suggestion.presentation,
            }}
          />
          <p>
            {studio.suggestion.title} · {studio.suggestion.presentation.layout}
          </p>
          <p>{studio.suggestion.message}</p>
          <button type="button" className={ix.btn} onClick={studio.applySuggestion}>
            Áp dụng vào thiệp
          </button>
        </div>
      ) : null}
      <div role="group" aria-label="Cách mở thiệp" className={px.ideasRow}>
        <span className={ix.label}>Cách mở thiệp</span>
        {DESIGN_LAYOUTS.map((layout) => (
          <button
            type="button"
            key={layout.id}
            className={px.chipButton}
            aria-pressed={studio.presentation.layout === layout.id}
            onClick={() => studio.setCardLayout(layout.id)}
          >
            {layout.label}
          </button>
        ))}
      </div>
      {/* Mẫu có sẵn không sử dụng tên khách mẫu. */}
      <div className={px.presetsSection}>
        <div className={px.presetsLabelRow}>
          <span className={ix.label}>Hoặc chọn mẫu thiết kế có sẵn:</span>
          <span className={ix.meta}>(Bấm để áp dụng ngay vào thiệp)</span>
        </div>

        <div className={px.presetsGrid}>
          {AI_DESIGN_PRESETS.map((preset) => {
            const isActive = cardTheme === preset.id;
            return (
              <div
                key={preset.id}
                className={px.presetCard}
                data-active={isActive}
                // Bấm cả thẻ để chọn cho tiện; bàn phím và trình đọc màn hình dùng nút bên dưới.
                onClick={() => handleApplyPreset(preset)}
              >
                <div className={px.presetHead}>
                  <div className={px.presetMeta}>
                    <strong className={px.presetName}>{preset.name}</strong>
                    <span className={px.presetTagline}>{preset.tagline}</span>
                  </div>
                  {isActive && (
                    <span className={px.presetActive}>
                      <Check className="size-3.5" aria-hidden="true" />
                      Đang dùng
                    </span>
                  )}
                </div>

                <p className={px.presetDesc}>{preset.description}</p>

                <div className={px.palette}>
                  {preset.palette.map((color, idx) => (
                    <span
                      key={idx}
                      className={px.paletteDot}
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  ))}
                  <span className={px.paletteTag}>{preset.badge}</span>
                </div>

                <button
                  type="button"
                  aria-pressed={isActive}
                  className={`${isActive ? ix.btnSmallOutline : ix.btnSmall} mt-1 w-full`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyPreset(preset);
                  }}
                >
                  {isActive ? 'Đang áp dụng' : 'Áp dụng thiết kế này'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sub-generator: Tạo thêm ảnh minh họa bằng AI (Dành cho ai muốn vẽ thêm hình) */}
      <div>
        <button
          type="button"
          className={`${ix.link} text-sm`}
          aria-expanded={showImageSubGenerator}
          onClick={() => setShowImageSubGenerator((prev) => !prev)}
        >
          <ChevronRight
            className="size-4 transition-transform duration-200 data-[open=true]:rotate-90 motion-reduce:transition-none"
            data-open={showImageSubGenerator}
            aria-hidden="true"
          />
          <span>
            {showImageSubGenerator ? 'Thu gọn' : 'Tùy chọn nâng cao: Vẽ thêm hình minh họa bằng AI'}
          </span>
        </button>

        {showImageSubGenerator && (
          <div className={px.addonBody}>
            <p className={ix.meta}>
              Mô tả hình minh họa để AI vẽ thêm ảnh độc bản (ví dụ: Cổng hoa hồng phong cách châu
              Âu...).
            </p>
            {mediaLikelyLocked && (
              <p className={ix.hintWarning} role="note">
                Hạn chỉnh sửa ảnh (72h trước giờ khai tiệc) đã qua nên không thể tạo ảnh mới.
              </p>
            )}
            <div className={px.promptRow}>
              <input
                type="text"
                aria-label="Mô tả ảnh AI"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Mô tả hình ảnh: Cổng hoa hồng hoàng gia, ánh hoàng hôn..."
                disabled={aiJob.busy}
                className={ix.input}
              />
              <button
                type="button"
                disabled={aiJob.busy || !aiPrompt.trim()}
                onClick={handleAiGenerate}
                className={ix.btnSmall}
              >
                {aiJob.busy ? 'Đang vẽ...' : 'Tạo Ảnh AI'}
              </button>
            </div>

            {aiJob.error ? (
              <p role="alert" className={ix.hintWarning}>
                {aiJob.error}
              </p>
            ) : null}

            {aiJob.job ? (
              <div className={px.aiStatus}>
                <span className={ix.meta}>Tiến trình: {imageJobStatusText(aiJob.job)}</span>
                {aiJob.job.status === 'RUNNING' && (
                  <span className={ix.spinner} aria-hidden="true" />
                )}
              </div>
            ) : null}

            {aiJob.job?.status === 'RECOVERY_REQUIRED' ? (
              <div className={ix.actions}>
                <button
                  type="button"
                  className={ix.btnSmall}
                  disabled={aiJob.busy}
                  onClick={() => {
                    void aiJob.recover();
                  }}
                >
                  Thử khôi phục
                </button>
              </div>
            ) : null}

            {aiJob.stalled ? (
              <div className={ix.actions}>
                <button type="button" className={ix.btnSmall} onClick={aiJob.checkAgain}>
                  Kiểm tra lại
                </button>
              </div>
            ) : null}

            {restoredAiImage ? (
              <div className={px.aiRestored} role="status">
                <p>Có ảnh tạo từ phiên trước sẵn sàng sử dụng.</p>
                <button type="button" className={ix.btnSmall} onClick={applyRestoredAiImage}>
                  Dùng ảnh này trên thiệp
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </fieldset>
  );
}
