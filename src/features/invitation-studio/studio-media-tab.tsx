'use client';

import React from 'react';
import { InlineError } from '../../design-system/inline-error';
import type { InvitationStudioState } from './use-invitation-studio';

export type StudioMediaTabProps = Readonly<{
  studio: InvitationStudioState;
}>;

export function StudioMediaTab({ studio }: StudioMediaTabProps) {
  const {
    mediaLikelyLocked,
    handleUploadMedia,
    isDragging,
    setIsDragging,
    selectedFile,
    setSelectedFile,
    mediaAltText,
    setMediaAltText,
    isUploadingMedia,
    uploadedMediaList,
    setUploadedMediaList,
    previewingAssetId,
    retryMediaPreview,
    derivedAssetIds,
    handleRemoveImageFromDesign,
    handleInsertImageIntoDesign,
    derivingAssetId,
    handleRetryDerive,
    detachingAssetId,
    handleDetachMedia,
  } = studio;

  return (
    <section aria-labelledby="media-heading" className="studio-stack studio-media-layout">
      <div className="studio-card">
        <h2 id="media-heading" className="studio-title">
          Hình ảnh cho thiệp
        </h2>
        <p className="studio-hint">
          Hạn ngạch: Tối đa 100 ảnh hoặc 1 GiB mỗi tiệc cưới. Hạn chót tải ảnh: 72 giờ trước giờ
          khai tiệc. Định dạng hỗ trợ: JPEG, PNG, WebP (&le; 25MB).
        </p>
        {mediaLikelyLocked && (
          <p className="studio-hint studio-hint-warning" role="note">
            Theo lịch tiệc, hạn chỉnh sửa ảnh (72 giờ trước giờ khai tiệc) đã qua nên nhiều khả năng
            không tạo/tải ảnh mới được nữa. Nếu cần, hãy liên hệ nhà hàng để được gia hạn.
          </p>
        )}

        <form
          onSubmit={(e) => {
            void handleUploadMedia(e);
          }}
          className={`studio-form studio-upload ${isDragging ? 'is-dragover' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              setSelectedFile(file);
              if (!mediaAltText.trim()) {
                const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                setMediaAltText(`Ảnh cưới ${clean}`);
              }
            }
          }}
        >
          <div className="studio-dropzone">
            <label htmlFor="media-file-input" className="studio-label">
              Chọn ảnh
            </label>
            <input
              id="media-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSelectedFile(file);
                if (file && !mediaAltText.trim()) {
                  const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                  setMediaAltText(`Ảnh cưới ${clean}`);
                }
              }}
              required
              className="studio-file"
            />
            <p className="studio-dropzone-hint">
              {selectedFile
                ? `Đã chọn: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)`
                : 'Kéo & thả ảnh cưới vào đây hoặc bấm để chọn tệp (JPEG, PNG, WebP ≤ 25MB)'}
            </p>
          </div>

          <div>
            <label htmlFor="media-alt-input" className="studio-label">
              Mô Tả Hình Ảnh (Alt Text, 1-250 ký tự)
            </label>
            <input
              id="media-alt-input"
              type="text"
              maxLength={250}
              placeholder="Ví dụ: Ảnh cưới chụp tại sân vườn..."
              value={mediaAltText}
              onChange={(e) => setMediaAltText(e.target.value)}
              required
              className="studio-input"
            />
          </div>

          <button
            type="submit"
            disabled={isUploadingMedia || !selectedFile || !mediaAltText.trim()}
            className="studio-btn"
          >
            {isUploadingMedia ? 'Đang tải lên...' : 'Tải ảnh lên'}
          </button>
        </form>
      </div>
      <div className="studio-card">
        <h3 className="studio-subtitle">Ảnh trong phiên làm việc ({uploadedMediaList.length})</h3>
        {uploadedMediaList.length === 0 ? (
          <p className="studio-empty">Chưa có ảnh nào được tải lên trong phiên làm việc này.</p>
        ) : (
          <div className="studio-media-grid">
            {uploadedMediaList.map((item) => (
              <div key={item.mediaAssetId} className="studio-media-item">
                {item.signedUrl ? (
                  <div className="studio-media-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.signedUrl}
                      onError={() =>
                        setUploadedMediaList((current) =>
                          current.map((entry) =>
                            entry.mediaAssetId === item.mediaAssetId
                              ? {
                                  ...entry,
                                  signedUrl: undefined,
                                  previewError: {
                                    message: 'Không tải được ảnh xem trước. Hãy thử lại.',
                                    requestId: null,
                                    code: null,
                                  },
                                }
                              : entry,
                          ),
                        )
                      }
                      alt={item.altText}
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="studio-media-thumb is-empty">Chưa có xem trước</div>
                )}
                <div>
                  <InlineError
                    error={item.previewError}
                    onRetry={
                      previewingAssetId === null
                        ? () => void retryMediaPreview(item.mediaAssetId)
                        : undefined
                    }
                  />
                  {previewingAssetId === item.mediaAssetId ? (
                    <p role="status">Đang tải ảnh xem trước…</p>
                  ) : null}
                  <p className="studio-media-name" title={item.altText}>
                    {item.altText}
                  </p>
                  <p className="studio-meta">
                    Mã: {item.mediaAssetId.slice(0, 8)}... (rev {item.revision})
                  </p>
                </div>

                {/* Derive Status & Actions */}
                <div className="studio-media-status">
                  {item.deriveStatus === 'ready' && item.derivedAssetId ? (
                    <div className="studio-media-state">
                      <span className="hy-chip is-success">
                        {derivedAssetIds.includes(item.derivedAssetId)
                          ? 'Đang dùng trên thiệp'
                          : 'Chưa dùng trên thiệp'}
                      </span>
                      {derivedAssetIds.includes(item.derivedAssetId) ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveImageFromDesign(item.derivedAssetId!)}
                          className="studio-btn is-small is-ghost"
                        >
                          Bỏ khỏi thiệp
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInsertImageIntoDesign(item.derivedAssetId!)}
                          className="studio-btn is-small"
                        >
                          Thêm vào thiệp
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="studio-media-state">
                      <span className="hy-chip is-warning">Chưa sẵn sàng cho thiệp</span>
                      {item.deriveError && (
                        <p className="studio-meta is-warning">{item.deriveError}</p>
                      )}
                      <button
                        type="button"
                        disabled={derivingAssetId === item.mediaAssetId}
                        onClick={() => void handleRetryDerive(item)}
                        className="studio-btn is-small is-ghost"
                      >
                        {derivingAssetId === item.mediaAssetId
                          ? 'Đang chuẩn bị...'
                          : 'Thử lại tạo ảnh cho thiệp'}
                      </button>
                    </div>
                  )}

                  <div className="studio-media-foot">
                    <button
                      type="button"
                      disabled={detachingAssetId === item.mediaAssetId || isUploadingMedia}
                      onClick={() =>
                        void handleDetachMedia(
                          item.mediaAssetId,
                          item.revision,
                          item.derivedAssetId,
                        )
                      }
                      className="studio-link-danger"
                    >
                      {detachingAssetId === item.mediaAssetId
                        ? 'Đang gỡ...'
                        : 'Gỡ ảnh gốc khỏi hồ sơ'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
