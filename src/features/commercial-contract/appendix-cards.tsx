'use client';

import React from 'react';
import { formatDateTime, formatVnd } from '../couple-workspace/use-couple-workspace';
import { ContractLinesTable } from './contract-lines';
import {
  appendixStateLabels,
  type Appendix,
  type AppendixList,
} from './appendix-api';

export function AppendixCurrentCard({
  current,
  isClosed,
  pending,
  onSubmit,
  onApprove,
}: Readonly<{
  current: Appendix;
  isClosed: boolean;
  pending: boolean;
  onSubmit: (current: Appendix) => void;
  onApprove: (current: Appendix) => void;
}>) {
  return (
    <section className="cw-card">
      <div className="cw-card-header">
        <h2>Phụ lục số {current.revisionNumber}</h2>
        <span className="status status-champagne">{appendixStateLabels[current.state]}</span>
      </div>
      <p>
        <strong>Lý do:</strong> {current.document.reason}
      </p>
      <div className="cw-grid">
        <div>
          <h3>Trước</h3>
          <ContractLinesTable
            lines={current.document.beforeLines}
            totalVnd={current.document.beforeTotalVnd}
            totalLabel="Tổng trước"
          />
        </div>
        <div>
          <h3>Sau</h3>
          <ContractLinesTable
            lines={current.document.afterLines}
            totalVnd={current.document.afterTotalVnd}
            totalLabel="Tổng sau"
          />
        </div>
      </div>
      <p className="cw-note">
        Chênh lệch:{' '}
        <strong>
          {current.document.deltaVnd > 0 ? '+' : ''}
          {formatVnd(current.document.deltaVnd)}
        </strong>{' '}
        · Nhà hàng duyệt: {current.approvals.some((a) => a.party === 'MANAGER') ? 'rồi' : 'chưa'} · Hai bạn
        duyệt: {current.approvals.some((a) => a.party === 'COUPLE') ? 'rồi' : 'chưa'}
      </p>
      <div className="cw-actions">
        {current.state === 'DRAFT' && !isClosed ? (
          <button
            className="button"
            type="button"
            disabled={pending}
            onClick={() => onSubmit(current)}
          >
            Gửi duyệt
          </button>
        ) : null}
        {current.state === 'AWAITING_APPROVAL' &&
        !isClosed &&
        !current.approvals.some((a) => a.party === 'COUPLE') ? (
          <button
            className="button"
            type="button"
            disabled={pending}
            onClick={() => onApprove(current)}
          >
            Duyệt phụ lục
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function AppendixHistoryCard({
  appendices,
}: Readonly<{
  appendices: AppendixList;
}>) {
  if (appendices.revisions.length === 0) return null;
  return (
    <section className="cw-card">
      <h2>Lịch sử phụ lục</h2>
      <ul className="cw-list">
        {appendices.revisions.map((revision) => (
          <li key={revision.revisionId}>
            #{revision.revisionNumber} · {appendixStateLabels[revision.state]} ·{' '}
            {formatDateTime(revision.createdAt)} · {revision.document.deltaVnd > 0 ? '+' : ''}
            {formatVnd(revision.document.deltaVnd)} · {revision.document.reason}
          </li>
        ))}
      </ul>
    </section>
  );
}

