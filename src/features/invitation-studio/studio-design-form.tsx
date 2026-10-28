'use client';

import React from 'react';
import Image from 'next/image';
import type { InvitationStudioState } from './use-invitation-studio';

export function StudioDesignForm({
  studio,
}: Readonly<{
  studio: InvitationStudioState;
}>) {
  const {
    title,
    setTitle,
    brideName,
    setBrideName,
    groomName,
    setGroomName,
    greeting,
    setGreeting,
    message,
    setMessageText,
    footer,
    setFooter,
    derivedAssetIds,
    saving,
    designDirty,
    handleSaveDesign,
    assetPreviewMap,
    uploadedMediaList,
    handleRemoveImageFromDesign,
  } = studio;

  return (
    <form
      onSubmit={(e) => {
        void handleSaveDesign(e);
      }}
      className="studio-form"
    >
      <div>
        <label htmlFor="invitation-title" className="studio-label">
          Tiêu Đề Thiệp Cưới
        </label>
        <input
          id="invitation-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          className="studio-input"
        />
      </div>

      <div className="studio-field-row">
        <div>
          <label htmlFor="groom-name" className="studio-label">
            Tên Chú Rể
          </label>
          <input
            id="groom-name"
            type="text"
            value={groomName}
            onChange={(e) => setGroomName(e.target.value)}
            placeholder="Nhập tên chú rể..."
            className="studio-input"
          />
        </div>
        <div>
          <label htmlFor="bride-name" className="studio-label">
            Tên Cô Dâu
          </label>
          <input
            id="bride-name"
            type="text"
            value={brideName}
            onChange={(e) => setBrideName(e.target.value)}
            placeholder="Nhập tên cô dâu..."
            className="studio-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="invitation-greeting" className="studio-label">
          Lời Mời Đầu Thiệp
        </label>
        <input
          id="invitation-greeting"
          type="text"
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          maxLength={200}
          className="studio-input"
        />
      </div>

      <div>
        <label htmlFor="invitation-message" className="studio-label">
          Nội Dung Lời Nhắn
        </label>
        <textarea
          id="invitation-message"
          rows={3}
          value={message}
          onChange={(e) => setMessageText(e.target.value)}
          maxLength={1000}
          className="studio-textarea"
        />
      </div>

      <div>
        <label htmlFor="invitation-footer" className="studio-label">
          Chân Thiệp (Ghi Chú Chung)
        </label>
        <input
          id="invitation-footer"
          type="text"
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          maxLength={300}
          className="studio-input"
        />
      </div>

      {/* Attached Images Chips */}
      {derivedAssetIds.length > 0 && (
        <div className="studio-attached-images">
          <label className="studio-label">
            Hình Ảnh Đính Kèm Trong Thiệp ({derivedAssetIds.length})
          </label>
          <div className="studio-chip-group">
            {derivedAssetIds.map((id) => {
              const mediaItem = uploadedMediaList.find((m) => m.derivedAssetId === id);
              const previewSrc = assetPreviewMap[id];
              return (
                <span key={id} className="studio-chip">
                  {previewSrc ? (
                    <Image
                      src={previewSrc}
                      alt="Ảnh đính kèm"
                      width={24}
                      height={24}
                      className="studio-chip-thumb"
                      unoptimized
                    />
                  ) : null}
                  <span className="studio-chip-text" title={mediaItem?.altText ?? id}>
                    {mediaItem?.altText ? mediaItem.altText.slice(0, 20) : id.slice(0, 8)}...
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveImageFromDesign(id)}
                    className="studio-chip-remove"
                    title="Bỏ ảnh này khỏi thiệp"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="studio-form-actions">
        <button type="submit" disabled={saving} className="studio-btn">
          {saving ? 'Đang lưu...' : 'Lưu Bản Thiết Kế'}
        </button>
        {designDirty && <span className="studio-unsaved-badge">● Có thay đổi chưa lưu</span>}
      </div>
    </form>
  );
}

