'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from 'cn';

import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { ProposalMenus } from '../couple-workspace/proposal-menus';
import { control, field as fieldClass } from '../public-website/public-classes';
import { formatDate, isEventPast } from '../couple-workspace/workspace-helpers';
import type { CollaborationGateway, ProposalView } from './collaboration-api';
import { card, hint, summary } from './collab-classes';
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
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Badge variant={value === null ? 'warning' : 'success'}>
        {value === null ? 'Chờ duyệt' : `Đã duyệt · ${formatDate(value)}`}
      </Badge>
    </div>
  );
}

export function EmptyState({
  body,
  children,
  title,
}: Readonly<{ body: string; title: string; children?: ReactNode }>) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-input bg-muted/60 p-5 text-sm">
      <strong className="text-base">{title}</strong>
      <p className="text-muted-foreground">{body}</p>
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
    <div className="flex flex-col gap-1.5">
      <strong className={cn('text-sm', tone === 'done' && 'text-hy-success')}>{title}</strong>
      <p className="text-xs text-muted-foreground">{body}</p>
      {href && action ? (
        <Link className={buttonVariants({ size: 'sm', className: 'mt-1 self-start' })} href={href}>
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
  const facts: readonly (readonly [string, ReactNode, boolean?])[] = [
    ['Thực đơn', <ProposalMenus key="menus" offer={proposal.proposal} />],
    ['Số bàn', proposal.proposal.tableCount],
    ['Khách dự kiến', proposal.planningHeadcount],
    ['Tổng dự kiến', money(proposal.proposal.baseChargeVnd), true],
    ['Tiền cọc (30%)', money(proposal.proposal.depositAmountVnd), true],
  ];
  return (
    <section
      className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[220px_minmax(0,1fr)]"
      aria-label="Tóm tắt đề xuất"
    >
      <div className="flex flex-col justify-end gap-1 bg-primary p-5 text-primary-foreground">
        <span className="text-xs text-white/80">
          {(proposal.phase === 'DRAFT' || proposal.phase === 'AWAITING_DEPOSIT') &&
          isEventPast(proposal.eventDate)
            ? 'Quá hạn tổ chức'
            : (phaseLabels[proposal.phase] ?? proposal.phase)}
        </span>
        <h2 className="text-xl font-bold">{proposal.proposal.hall.name}</h2>
        <p className="text-xs text-white/85 tabular-nums">
          {formatDate(proposal.eventDate)} ·{' '}
          {proposal.proposal.shift.code === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}{' '}
          {proposal.proposal.shift.startTime}–{proposal.proposal.shift.endTime}
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2">
        {facts.map(([label, value, strong]) => (
          <div key={label} className={cn('flex flex-col', label === 'Thực đơn' && 'sm:col-span-2')}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn('text-sm tabular-nums', strong ? 'font-bold' : 'font-medium')}>
              {value}
            </dd>
          </div>
        ))}
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
    <details className={cn(card, 'group')}>
      <summary className={summary}>
        <ChevronRight aria-hidden="true" />
        Cần đổi hoặc huỷ tiệc?
      </summary>
      <p className={cn(hint, 'mt-2')}>
        Yêu cầu hủy sẽ được nhà hàng xem xét. Trước khi thu cọc, việc dừng hồ sơ không phát sinh
        hoàn cọc. Sau cọc, mức hoàn được xác định theo hợp đồng và thời điểm nhận yêu cầu.
      </p>
      <form
        className="mt-3 flex flex-col gap-3"
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
        <h3 className="text-sm font-bold">Yêu cầu hủy</h3>
        <label className={fieldClass}>
          Lý do
          <textarea
            className={cn(control, 'h-auto py-2.5')}
            name="reason"
            required
            maxLength={500}
            rows={3}
          />
        </label>
        <Button className="self-start" variant="destructive" disabled={pending} type="submit">
          Gửi yêu cầu hủy
        </Button>
      </form>
    </details>
  );
}
