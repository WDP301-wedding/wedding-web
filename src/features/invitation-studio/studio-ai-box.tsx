'use client';

import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { imageJobStatusText } from './use-image-job';
import type { InvitationStudioState } from './use-invitation-studio';
import { AI_DESIGN_PRESETS, type AiDesignPreset } from './ai-design-presets';
import { generateDesignFromPrompt } from './ai-invitation-generator';
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
    event,
  } = studio;

  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [showImageSubGenerator, setShowImageSubGenerator] = useState(false);

  // Xử lý tạo thiệp theo prompt tùy chỉnh của người dùng
  const handleGenerateCustomCard = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const promptText = customPrompt.trim();
    if (!promptText) return;

    setIsGeneratingCard(true);
    try {
      const generated = generateDesignFromPrompt(promptText, {
        currentBrideName: brideName,
        currentGroomName: groomName,
        hallName: event?.hallName,
        eventDate: event?.eventDate,
      });

      applyAiDesign(generated);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  // Xử lý áp dụng 1 trong 3 biến thể AI gợi ý
  const handleApplyPreset = (preset: AiDesignPreset) => {
    // Kế thừa tên cô dâu chú rể hiện có nếu có, nếu chưa có thì dùng tên mẫu gợi ý
    const designToApply = {
      ...preset.design,
      brideName: brideName.trim() || preset.design.brideName,
      groomName: groomName.trim() || preset.design.groomName,
    };
    applyAiDesign(designToApply);
  };

  return (
    <div className={px.aiCard}>
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div>
          <h3 className={ix.subtitle}>Thiết kế toàn bộ thiệp cưới</h3>
          <p className={ix.meta}>
            Nhập mô tả ý tưởng của bạn (phong cách, tông màu, lời chúc...) hoặc bấm chọn nhanh 1
            trong 3 biến thể gợi ý bên dưới để AI tự động thiết kế trọn vẹn thiệp cưới.
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
            placeholder="Ví dụ: Thiệp cưới phong cách hoàng gia sang trọng tone đỏ rượu và vàng gold cho chú rể Minh Quân và cô dâu Lan Anh..."
            disabled={isGeneratingCard}
            className={ix.input}
          />
          <button
            type="submit"
            disabled={isGeneratingCard || !customPrompt.trim()}
            className={ix.btn}
          >
            {isGeneratingCard ? 'Đang thiết kế...' : 'Tạo thiết kế'}
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

      {/* 3 Biến thể gợi ý từ AI */}
      <div className={px.presetsSection}>
        <div className={px.presetsLabelRow}>
          <span className={ix.label}>Hoặc chọn 1 trong 3 biến thể phong cách gợi ý từ AI:</span>
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
                {aiJob.busy ? 'Đang vẽ...' : 'Vẽ ảnh'}
              </button>
            </div>

            {aiJob.job ? (
              <div className={px.aiStatus}>
                <span className={ix.meta}>Tiến trình: {imageJobStatusText(aiJob.job)}</span>
                {aiJob.job.status === 'RUNNING' && (
                  <span className={ix.spinner} aria-hidden="true" />
                )}
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
    </div>
  );
}
