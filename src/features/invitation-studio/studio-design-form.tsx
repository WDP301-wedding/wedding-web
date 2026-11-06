'use client';

import { parentNameGroups } from './invitation-family';
import React from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { InvitationStudioState } from './use-invitation-studio';
import { px } from './studio-panel-classes';
import { ix } from './studio-classes';

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
      className={ix.form}
      onChange={() => studio.setDesignDirty(true)}
    >
      <fieldset disabled={studio.writing} className="contents" aria-label="Nội dung thiệp">
        <div>
          <label htmlFor="invitation-title" className={ix.label}>
            Tên thiệp
          </label>
          <input
            id="invitation-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            className={ix.input}
          />
        </div>

        <fieldset disabled={saving}>
          <label>
            <input
              type="checkbox"
              checked={studio.includesSeating}
              onChange={(e) => {
                studio.setIncludesSeating(e.target.checked);
                studio.setDesignDirty(true);
              }}
            />{' '}
            Kèm sơ đồ bàn đã xác nhận vào thiệp và bản in
          </label>
          <p className={ix.hint}>
            Chỉ hiển thị vị trí bàn và nhóm, không công khai danh sách hay thông tin liên hệ khách.
          </p>
          {studio.includesSeating && studio.seating.error ? (
            <div role="alert">
              <p>{studio.seating.error}</p>
              <button type="button" onClick={() => void studio.seating.refresh()}>
                Tải lại sơ đồ
              </button>
            </div>
          ) : null}
        </fieldset>
        <div className={ix.fieldRow}>
          <div>
            <label htmlFor="groom-name" className={ix.label}>
              Tên chú rể
            </label>
            <input
              id="groom-name"
              type="text"
              value={groomName}
              onChange={(e) => setGroomName(e.target.value)}
              placeholder="Nhập tên chú rể..."
              className={ix.input}
            />
          </div>
          <div>
            <label htmlFor="bride-name" className={ix.label}>
              Tên cô dâu
            </label>
            <input
              id="bride-name"
              type="text"
              value={brideName}
              onChange={(e) => setBrideName(e.target.value)}
              placeholder="Nhập tên cô dâu..."
              className={ix.input}
            />
          </div>
        </div>

        <div className={ix.fieldRow}>
          {parentNameGroups.map(({ label, fields }) => (
            <fieldset
              key={label}
              className="grid min-w-0 gap-2 rounded-lg border border-border p-3"
            >
              <legend className={ix.label}>{label} (tùy chọn)</legend>
              {fields.map(({ key, label: fieldLabel }) => (
                <label key={key} className={ix.label}>
                  {fieldLabel}
                  <input
                    type="text"
                    maxLength={120}
                    className={ix.input}
                    value={studio.parentNames[key]}
                    onChange={(event) =>
                      studio.setParentNames({ ...studio.parentNames, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
            </fieldset>
          ))}
        </div>

        <div>
          <label htmlFor="invitation-greeting" className={ix.label}>
            Lời mời đầu thiệp
          </label>
          <input
            id="invitation-greeting"
            type="text"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            maxLength={200}
            className={ix.input}
          />
        </div>

        <div>
          <label htmlFor="invitation-message" className={ix.label}>
            Lời nhắn
          </label>
          <textarea
            id="invitation-message"
            rows={3}
            value={message}
            onChange={(e) => setMessageText(e.target.value)}
            maxLength={1000}
            className={ix.textarea}
          />
        </div>

        <div>
          <label htmlFor="invitation-footer" className={ix.label}>
            Ghi chú cuối thiệp
          </label>
          <input
            id="invitation-footer"
            type="text"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            maxLength={300}
            className={ix.input}
          />
        </div>

        {/* Attached Images Chips */}
        {derivedAssetIds.length > 0 && (
          <div className={px.attached}>
            <label className={ix.label}>Ảnh trên thiệp ({derivedAssetIds.length})</label>
            <div className={px.chipGroup}>
              {derivedAssetIds.map((id) => {
                const mediaItem = uploadedMediaList.find((m) => m.derivedAssetId === id);
                const previewSrc = assetPreviewMap[id];
                return (
                  <span key={id} className={px.chip}>
                    {previewSrc ? (
                      <Image
                        src={previewSrc}
                        alt="Ảnh đính kèm"
                        width={24}
                        height={24}
                        className={px.chipThumb}
                        unoptimized
                      />
                    ) : null}
                    <span className={px.chipText} title={mediaItem?.altText ?? id}>
                      {mediaItem?.altText ? mediaItem.altText.slice(0, 20) : id.slice(0, 8)}...
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImageFromDesign(id)}
                      className={px.chipRemove}
                      title="Bỏ ảnh này khỏi thiệp"
                      aria-label="Bỏ ảnh này khỏi thiệp"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className={ix.formActions}>
          <button type="submit" disabled={saving} className={ix.btn}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          {designDirty && (
            <span className={ix.unsaved}>
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
              Có thay đổi chưa lưu
            </span>
          )}
        </div>
      </fieldset>
    </form>
  );
}
