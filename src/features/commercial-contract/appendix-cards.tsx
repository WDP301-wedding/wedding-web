'use client';
import { routes, withBooking } from '../../routes';

import React from 'react';
import Link from 'next/link';
import { formatDateTime, formatVnd } from '../couple-workspace/use-couple-workspace';
import { ContractLinesTable } from './contract-lines';
import { appendixStateLabels, type Appendix, type AppendixList } from './appendix-api';
import { cx } from './contract-classes';

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
    <section className={cx.card}>
      <div className={cx.cardHeader}>
        <h2>Phụ lục số {current.revisionNumber}</h2>
        <span className={cx.status}>{appendixStateLabels[current.state]}</span>
      </div>
      <p>
        <strong>Lý do:</strong> {current.document.reason}
      </p>
      <div className={cx.grid}>
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
      <p className={cx.note}>
        Chênh lệch:{' '}
        <strong>
          {current.document.deltaVnd > 0 ? '+' : ''}
          {formatVnd(current.document.deltaVnd)}
        </strong>{' '}
        · Nhà hàng duyệt: {current.approvals.some((a) => a.party === 'MANAGER') ? 'rồi' : 'chưa'} ·
        Hai bạn duyệt: {current.approvals.some((a) => a.party === 'COUPLE') ? 'rồi' : 'chưa'}
      </p>
      {current.printOrderId ? (
        <p className={cx.note}>
          Phụ lục này gắn với đơn in. Xác nhận của hai bạn đã được lưu khi đặt in; nhà hàng duyệt
          cùng đơn.{' '}
          <Link href={withBooking(routes.card + '?tab=print', current.document.bookingId)}>
            Theo dõi tại Thiệp & in
          </Link>
        </p>
      ) : null}
      <div className={cx.actions}>
        {!current.printOrderId && current.state === 'DRAFT' && !isClosed ? (
          <button
            className={cx.button}
            type="button"
            disabled={pending}
            onClick={() => onSubmit(current)}
          >
            Gửi duyệt
          </button>
        ) : null}
        {!current.printOrderId &&
        current.state === 'AWAITING_APPROVAL' &&
        !isClosed &&
        !current.approvals.some((a) => a.party === 'COUPLE') ? (
          <button
            className={cx.button}
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
    <section className={cx.card}>
      <h2>Lịch sử phụ lục</h2>
      <ul className={cx.list}>
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
