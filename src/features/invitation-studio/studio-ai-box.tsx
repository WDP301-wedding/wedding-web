'use client';

import React from 'react';
import { imageJobStatusText } from './use-image-job';
import type { InvitationStudioState } from './use-invitation-studio';

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
  } = studio;

  return (
    <div className="studio-ai-box">
      <div className="studio-ai-box-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="ai-badge">Trí tuệ nhân tạo</span>
            <h3 className="studio-subtitle" style={{ margin: 0 }}>
              Tạo Ảnh Nền Nghệ Thuật
            </h3>
          </div>
          <p className="studio-meta">
            Mô tả ý tưởng trang trí (hoa phong lữ, phong cách tối giản...) để tạo hình minh hoạ độc bản cho thiệp.
          </p>
        </div>
      </div>
      {mediaLikelyLocked && (
        <p className="studio-hint studio-hint-warning" role="note">
          Theo lịch tiệc, hạn chỉnh sửa ảnh (72 giờ trước giờ khai tiệc) đã qua nên nhiều khả năng không
          tạo/tải ảnh mới được nữa. Nếu cần, hãy liên hệ nhà hàng để được gia hạn.
        </p>
      )}
      <div className="studio-ai-prompt-row">
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="VD: Cổng hoa hồng phấn pastel phong cách châu Âu, ánh sáng hoàng hôn..."
          disabled={aiJob.busy}
          className="studio-input"
        />
        <button
          type="button"
          disabled={aiJob.busy || !aiPrompt.trim()}
          onClick={handleAiGenerate}
          className="studio-btn"
        >
          {aiJob.busy ? 'Đang tạo...' : 'Tạo Ảnh'}
        </button>
      </div>

      {aiJob.job ? (
        <div className="studio-ai-status">
          <span className="studio-meta">Tiến trình: {imageJobStatusText(aiJob.job)}</span>
          {aiJob.job.status === 'RUNNING' && (
            <span className="studio-spinner" aria-hidden="true" />
          )}
        </div>
      ) : null}

      {restoredAiImage ? (
        <div className="studio-ai-restored" role="status">
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
  );
}

