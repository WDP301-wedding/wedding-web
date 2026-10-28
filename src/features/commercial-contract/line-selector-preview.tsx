'use client';

import React from 'react';
import { InlineError } from '../../design-system/inline-error';
import { formatVnd } from '../couple-workspace/use-couple-workspace';
import type { FriendlyError } from '../../lib/api/api-errors';
import type { ContractPreview } from './contract-preview-api';
import { ContractLinesTable } from './contract-lines-table';

export function LineSelectorPreview({
  preview,
  previewCurrent,
  previewPending,
  previewError,
  pending,
  onRequestPreview,
}: Readonly<{
  preview: { signature: string; data: ContractPreview } | null;
  previewCurrent: boolean;
  previewPending: boolean;
  previewError: FriendlyError | null;
  pending: boolean;
  onRequestPreview: () => void;
}>) {
  return (
    <section className="cw-card" aria-label="Xem trước chi phí" aria-busy={previewPending}>
      <h3>Xem trước chi phí chưa lưu</h3>
      <p>
        Tính từ giá chính thức trên máy chủ. Không tạo bản hợp đồng, không gửi duyệt và không
        ghi nhận thanh toán.
      </p>
      {preview && previewCurrent ? (
        <>
          <ContractLinesTable
            lines={preview.data.document.lines}
            totalVnd={preview.data.document.contractTotalVnd}
            totalLabel="Tổng dự kiến cho lựa chọn này"
          />
          <p>
            Tiền cọc theo hợp đồng:{' '}
            <strong>{formatVnd(preview.data.document.depositAmountVnd)}</strong>
          </p>
          <p>{preview.data.document.incidentalClause}</p>
          <p className="muted">
            Giá, quyền và revision được kiểm tra lại khi lưu. Phát sinh tương lai chưa ghi nhận
            không nằm trong tổng này.
          </p>
        </>
      ) : (
        <p role="status">
          {preview
            ? 'Lựa chọn đã thay đổi. Bấm tính lại để xem tổng mới.'
            : 'Chọn các hạng mục rồi bấm Xem trước chi phí.'}
        </p>
      )}
      <InlineError error={previewError} />
      <button
        className="button button-secondary"
        type="button"
        disabled={pending || previewPending}
        onClick={onRequestPreview}
      >
        {previewPending
          ? 'Đang tính chi phí…'
          : preview
            ? 'Tính lại chi phí'
            : 'Xem trước chi phí'}
      </button>
    </section>
  );
}

