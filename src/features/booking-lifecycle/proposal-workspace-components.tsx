'use client';

import Link from 'next/link';
import React from 'react';
import { ProposalMenus } from '../couple-workspace/proposal-menus';
import type { CollaborationGateway, ProposalView } from './collaboration-api';
import { phaseLabels } from './collaboration-utils';

export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

export function money(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function Approval({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div className="approval-row">
      <span>{label}</span>
      <strong>
        {value === null
          ? 'Chờ duyệt'
          : `Đã duyệt · ${new Intl.DateTimeFormat('vi-VN').format(new Date(value))}`}
      </strong>
    </div>
  );
}

export function EmptyState({
  body,
  children,
  title,
}: Readonly<{ body: string; title: string; children?: React.ReactNode }>) {
  return (
    <div className="collab-empty">
      <strong>{title}</strong>
      <p>{body}</p>
      {children}
    </div>
  );
}

/** Thẻ "Bước tiếp theo" ở cột phải – nội dung tuỳ giai đoạn của tiệc. */
export function NextStep({
  tone,
  title,
  body,
  href,
  action,
}: Readonly<{
  tone: 'done' | 'muted';
  title: string;
  body: string;
  href?: string;
  action?: string;
}>) {
  return (
    <div className={'collab-next collab-next-' + tone}>
      <strong>{title}</strong>
      <p>{body}</p>
      {href && action ? (
        <Link className="button" href={href}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function ProposalSummarySection({
  proposal,
}: Readonly<{
  proposal: ProposalView;
}>) {
  return (
    <section className="collab-proposal" aria-label="Tóm tắt đề xuất">
      <div className="collab-proposal-title">
        <span>{phaseLabels[proposal.phase] ?? proposal.phase}</span>
        <h2>{proposal.proposal.hall.name}</h2>
        <p>
          {proposal.eventDate.split('-').reverse().join('/')} ·{' '}
          {proposal.proposal.shift.code === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}{' '}
          {proposal.proposal.shift.startTime}–{proposal.proposal.shift.endTime}
        </p>
      </div>
      <dl>
        <div>
          <dt>Thực đơn</dt>
          <dd>
            <ProposalMenus offer={proposal.proposal} />
          </dd>
        </div>
        <div>
          <dt>Số bàn</dt>
          <dd>{proposal.proposal.tableCount}</dd>
        </div>
        <div>
          <dt>Khách dự kiến</dt>
          <dd>{proposal.planningHeadcount}</dd>
        </div>
        <div>
          <dt>Tổng dự kiến</dt>
          <dd>{money(proposal.proposal.baseChargeVnd)}</dd>
        </div>
        <div>
          <dt>Tiền cọc (30%)</dt>
          <dd>{money(proposal.proposal.depositAmountVnd)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function ProposalCancelSection({
  proposal,
  pending,
  gateway,
  command,
  confirm,
}: Readonly<{
  proposal: ProposalView;
  pending: boolean;
  gateway: CollaborationGateway;
  command: (operation: (token: string) => Promise<void>, success: string) => Promise<void>;
  confirm: (options: {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'default';
  }) => Promise<boolean>;
}>) {
  return (
    <details className="collab-more collab-cancel-box">
      <summary>Cần đổi hoặc huỷ tiệc?</summary>
      <p className="collab-hint">
        Muốn đổi giờ hay nội dung chương trình, hãy dùng “Đề xuất thay đổi kịch bản”. Yêu cầu huỷ sẽ
        được Quản lý xem xét theo chính sách đã ký.
      </p>
      <form
        className="collab-cancel"
        onSubmit={(event) => {
          event.preventDefault();
          const reason = field(new FormData(event.currentTarget), 'reason');
          void (async () => {
            const agreed = await confirm({
              title: 'Gửi yêu cầu huỷ tiệc?',
              description:
                'Quản lý nhà hàng sẽ xem xét yêu cầu theo chính sách huỷ trong hợp đồng đã ký (có thể phát sinh phí). Hãy chắc chắn trước khi gửi.',
              confirmLabel: 'Gửi yêu cầu huỷ',
              cancelLabel: 'Quay lại',
              tone: 'danger',
            });
            if (!agreed) return;
            await command(
              (token) =>
                gateway.requestCancellation(token, {
                  bookingId: proposal.bookingId,
                  expectedRevision: proposal.revision,
                  reason,
                }),
              'Đã gửi yêu cầu hủy để Quản lý xem xét.',
            );
          })();
        }}
      >
        <h3>Yêu cầu hủy</h3>
        <label>
          Lý do
          <textarea name="reason" required maxLength={500} rows={3} />
        </label>
        <button disabled={pending} type="submit">
          Gửi yêu cầu hủy
        </button>
      </form>
    </details>
  );
}

