'use client';

import React, { useState } from 'react';
import { imageJobStatusText } from './use-image-job';
import type { InvitationStudioState } from './use-invitation-studio';
import {
  AI_DESIGN_PRESETS,
  generateDesignFromPrompt,
  type AiDesignPreset,
} from './ai-invitation-generator';

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
    <div className="studio-ai-card-designer">
      {/* Header */}
      <div className="studio-ai-box-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="ai-badge">✨ Trợ lý AI Designer</span>
            <h3 className="studio-subtitle" style={{ margin: 0, fontSize: 16 }}>
              Thiết Kế Toàn Bộ Thiệp Cưới
            </h3>
          </div>
          <p className="studio-meta" style={{ margin: 0 }}>
            Nhập mô tả ý tưởng của bạn (phong cách, tông màu, lời chúc...) hoặc bấm chọn nhanh 1 trong 3 biến thể gợi ý bên dưới để AI tự động thiết kế trọn vẹn thiệp cưới.
          </p>
        </div>
      </div>

      {/* Thanh Prompt Input tùy chỉnh */}
      <form onSubmit={handleGenerateCustomCard} className="studio-ai-custom-prompt-container">
        <label htmlFor="ai-custom-card-prompt" className="studio-label" style={{ fontWeight: 600 }}>
          Mô tả phong cách thiệp cưới theo ý bạn:
        </label>
        <div className="studio-ai-prompt-row">
          <input
            id="ai-custom-card-prompt"
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ví dụ: Thiệp cưới phong cách hoàng gia sang trọng tone đỏ rượu và vàng gold cho chú rể Minh Quân và cô dâu Lan Anh..."
            disabled={isGeneratingCard}
            className="studio-input"
            style={{ fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={isGeneratingCard || !customPrompt.trim()}
            className="studio-btn"
            style={{ minWidth: 160 }}
          >
            {isGeneratingCard ? 'Đang thiết kế...' : '✨ Tạo thiết kế'}
          </button>
        </div>

        <div className="studio-prompt-ideas-row">
          <span className="studio-meta" style={{ fontSize: 12 }}>Ý tưởng gợi ý:</span>
          <button
            type="button"
            className="studio-chip-btn"
            onClick={() => {
              setCustomPrompt('Thiệp cưới truyền thống Á Đông áo dài đỏ thắm trầu cau mang đậm nét đẹp văn hóa');
            }}
          >
            🏮 Á Đông truyền thống
          </button>
          <button
            type="button"
            className="studio-chip-btn"
            onClick={() => {
              setCustomPrompt('Thiệp cưới dạ tiệc ánh sao Celestial Navy quý phái huyền bí lung linh');
            }}
          >
            ✨ Dạ tiệc ánh sao
          </button>
          <button
            type="button"
            className="studio-chip-btn"
            onClick={() => {
              setCustomPrompt('Thiệp cưới phong cách Champagne thanh lịch tone vàng ánh kim ấm áp');
            }}
          >
            🥂 Champagne ấm áp
          </button>
        </div>
      </form>

      {/* 3 Biến thể gợi ý từ AI */}
      <div className="studio-ai-presets-section">
        <div className="studio-presets-label-row">
          <span className="studio-label" style={{ fontWeight: 600 }}>
            Hoặc chọn 1 trong 3 biến thể phong cách gợi ý từ AI:
          </span>
          <span className="studio-meta" style={{ fontSize: 12 }}>
            (Bấm để áp dụng ngay vào thiệp)
          </span>
        </div>

        <div className="studio-presets-grid">
          {AI_DESIGN_PRESETS.map((preset) => {
            const isActive = cardTheme === preset.id;
            return (
              <div
                key={preset.id}
                className={`studio-preset-card ${isActive ? 'is-active' : ''}`}
                onClick={() => handleApplyPreset(preset)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleApplyPreset(preset);
                  }
                }}
              >
                <div className="preset-card-head">
                  <span className="preset-icon">{preset.icon}</span>
                  <div className="preset-meta-text">
                    <strong className="preset-name">{preset.name}</strong>
                    <span className="preset-tagline">{preset.tagline}</span>
                  </div>
                  {isActive && <span className="preset-active-check">✓ Đang dùng</span>}
                </div>

                <p className="preset-desc">{preset.description}</p>

                <div className="preset-palette">
                  {preset.palette.map((color, idx) => (
                    <span
                      key={idx}
                      className="palette-dot"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <span className="palette-tag">{preset.badge}</span>
                </div>

                <button
                  type="button"
                  className={`studio-btn is-small ${isActive ? 'is-ghost' : ''}`}
                  style={{ width: '100%', marginTop: 8 }}
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
      <div className="studio-image-addon-disclosure">
        <button
          type="button"
          className="studio-link"
          style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowImageSubGenerator((prev) => !prev)}
        >
          <span>{showImageSubGenerator ? '▼ Thu gọn' : '▶ Tùy chọn nâng cao: Vẽ thêm hình minh họa bằng AI'}</span>
        </button>

        {showImageSubGenerator && (
          <div className="studio-image-addon-body" style={{ marginTop: 12, padding: 12, background: 'var(--hy-surface-subtle, #fcf9f7)', borderRadius: 8 }}>
            <p className="studio-meta" style={{ margin: '0 0 8px' }}>
              Mô tả hình minh họa để AI vẽ thêm ảnh độc bản (ví dụ: Cổng hoa hồng phong cách châu Âu...).
            </p>
            {mediaLikelyLocked && (
              <p className="studio-hint studio-hint-warning" role="note">
                Hạn chỉnh sửa ảnh (72h trước giờ khai tiệc) đã qua nên không thể tạo ảnh mới.
              </p>
            )}
            <div className="studio-ai-prompt-row">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Mô tả hình ảnh: Cổng hoa hồng hoàng gia, ánh hoàng hôn..."
                disabled={aiJob.busy}
                className="studio-input"
              />
              <button
                type="button"
                disabled={aiJob.busy || !aiPrompt.trim()}
                onClick={handleAiGenerate}
                className="studio-btn is-small"
              >
                {aiJob.busy ? 'Đang vẽ...' : 'Vẽ ảnh'}
              </button>
            </div>

            {aiJob.job ? (
              <div className="studio-ai-status" style={{ marginTop: 8 }}>
                <span className="studio-meta">Tiến trình: {imageJobStatusText(aiJob.job)}</span>
                {aiJob.job.status === 'RUNNING' && (
                  <span className="studio-spinner" aria-hidden="true" />
                )}
              </div>
            ) : null}

            {restoredAiImage ? (
              <div className="studio-ai-restored" role="status" style={{ marginTop: 8 }}>
                <p>Có ảnh tạo từ phiên trước sẵn sàng sử dụng.</p>
                <button
                  type="button"
                  className="studio-btn is-small"
                  onClick={applyRestoredAiImage}
                >
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
