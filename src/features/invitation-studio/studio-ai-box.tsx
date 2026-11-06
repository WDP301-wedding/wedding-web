'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { InvitationStudioState } from './use-invitation-studio';
import { AI_DESIGN_PRESETS, type AiDesignPreset } from './ai-design-presets';
import { InvitationOrnament } from './invitation-ornament';
import { InteractiveInvitation } from './interactive-invitation';
import { getApiBaseUrl } from './invitation-studio-utils';
import { DESIGN_LAYOUTS } from './invitation-presentation';
import { px } from './studio-panel-classes';
import { ix } from './studio-classes';

export function StudioAiBox({
  studio,
  onApplied,
}: Readonly<{
  studio: InvitationStudioState;
  onApplied: () => void;
}>) {
  const { applyAiDesign, cardTheme, brideName, groomName } = studio;

  const [customPrompt, setCustomPrompt] = useState('');
  const isGeneratingCard = studio.suggestionBusy;

  const handleGenerateCustomCard = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (customPrompt.trim().length < 10) return;
    void studio.generateSuggestion(customPrompt.trim());
  };
  const handleApplyPreset = (preset: AiDesignPreset) => {
    if (studio.writing) return;
    applyAiDesign({ ...preset.design, brideName, groomName });
    onApplied();
  };

  return (
    <fieldset disabled={studio.writing} className="grid min-w-0 gap-3" aria-label="Giao diện thiệp">
      {/* Mẫu có sẵn không sử dụng tên khách mẫu. */}
      <div className={px.presetsSection}>
        <div className={px.presetsLabelRow}>
          <span className={ix.label}>Chọn mẫu thiết kế</span>
        </div>

        <div className={px.presetsGrid}>
          {AI_DESIGN_PRESETS.map((preset) => {
            const isActive =
              cardTheme === preset.id &&
              JSON.stringify(studio.presentation.decoration) ===
                JSON.stringify(preset.design.decoration);
            return (
              <div key={preset.id} className={px.presetCard} data-active={isActive}>
                <div
                  aria-hidden="true"
                  className="relative isolate grid h-24 place-items-center overflow-hidden rounded-lg border border-current text-xs"
                  style={
                    {
                      backgroundColor: preset.palette[2],
                      color: preset.palette.at(-1),
                      '--accent': preset.palette[1],
                      '--paper': preset.palette[2],
                    } as React.CSSProperties
                  }
                >
                  {preset.design.decoration ? (
                    <InvitationOrnament decoration={preset.design.decoration} face="cover" />
                  ) : null}
                  <span className="relative rounded bg-card px-3 py-1">Thiệp cưới</span>
                </div>
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
                  onClick={() => handleApplyPreset(preset)}
                >
                  {isActive ? 'Đang áp dụng' : 'Áp dụng thiết kế này'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

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
      <details className={ix.disclosure}>
        <summary>Tạo thiết kế bằng AI</summary>
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
              placeholder="Ví dụ: Thiệp giấy cotton, hoa mộc lan, màu kem, lời mời trang nhã"
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
                setCustomPrompt(
                  'Thiệp cưới phong cách Champagne thanh lịch tone vàng ánh kim ấm áp',
                );
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
                  ...studio.parentNames,
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
            <button
              type="button"
              className={ix.btn}
              onClick={() => {
                studio.applySuggestion();
                onApplied();
              }}
            >
              Áp dụng vào thiệp
            </button>
          </div>
        ) : null}
      </details>
    </fieldset>
  );
}
