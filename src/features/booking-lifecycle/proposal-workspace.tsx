'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from 'cn';

import { card, cardTitle, hint, meta, summary } from './collab-classes';
import { TimelineEditor } from './timeline-editor';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import type { CollaborationGateway, ProposalView } from './collaboration-api';
import {
  Approval,
  EmptyState,
  NextStep,
  ProposalCancelSection,
  ProposalSummarySection,
  field,
  money,
} from './proposal-workspace-components';
import { ProposalDecisionsSection } from './proposal-decisions-section';

export { Approval, EmptyState, NextStep, field, money };

export interface ProposalWorkspaceProps {
  access: 'restricted' | 'full';
  proposal: ProposalView;
  pending: boolean;
  gateway: CollaborationGateway;
  command: (operation: (token: string) => Promise<void>, success: string) => Promise<void>;
}

export function ProposalWorkspace({
  access,
  command,
  gateway,
  pending,
  proposal,
}: ProposalWorkspaceProps) {
  const { confirm, dialog } = useConfirmDialog();
  const timeline = proposal.timeline;
  const billingHref = `/khong-gian/thanh-toan?bookingId=${proposal.bookingId}`;
  const bothApproved = Boolean(timeline?.managerApprovedAt && timeline?.coupleApprovedAt);
  const confirmed = proposal.phase === 'CONFIRMED';

  // Bước tiếp theo theo giai đoạn: giữ đúng câu chữ cũ để người dùng (và test) nhận ra.
  const next =
    proposal.phase === 'CANCELLED' ? (
      <NextStep
        tone="muted"
        title="Hồ sơ tiệc đã hủy"
        body="Hồ sơ tiệc cưới này đã kết thúc hoặc bị hủy."
      />
    ) : proposal.phase === 'COMPLETED' ? (
      <NextStep
        tone="done"
        title="Tiệc cưới đã hoàn tất"
        body="Sự kiện đã diễn ra thành công. Bạn có thể kiểm tra lịch sử quyết toán tại trang công nợ."
        href={billingHref}
        action="Xem quyết toán công nợ →"
      />
    ) : confirmed ? (
      <NextStep
        tone="done"
        title="Tiệc cưới đã xác nhận chính thức"
        body="Hồ sơ đã được đặt cọc. Mọi điều chỉnh kịch bản lúc này sẽ gửi dưới dạng yêu cầu thay đổi để nhà hàng duyệt."
        href={billingHref}
        action="Xem công nợ & thanh toán số dư →"
      />
    ) : proposal.phase === 'AWAITING_DEPOSIT' || (proposal.phase === 'DRAFT' && bothApproved) ? (
      <NextStep
        tone="done"
        title="Đã thống nhất kịch bản"
        body="Kịch bản đã được cả hai bên phê duyệt. Hồ sơ đủ điều kiện để tiến hành đặt cọc giữ sảnh chính thức."
        href={billingHref}
        action="Chuyển sang đặt cọc →"
      />
    ) : (
      <NextStep
        tone="muted"
        title="Đang chờ thống nhất kịch bản"
        body="Khi nhà hàng và hai bạn cùng duyệt một bản kịch bản, bạn có thể lập hợp đồng và đặt cọc."
      />
    );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <ProposalSummarySection proposal={proposal} />

        <article className={cn(card, 'flex flex-col gap-4')}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col">
              <p className={meta}>Kịch bản hiện tại · Bản {timeline?.revisionNumber ?? 0}</p>
              <h2 className={cardTitle}>Dòng thời gian</h2>
            </div>
            <span className={cn(meta, 'tabular-nums')}>
              Giờ hợp lệ: {proposal.proposal.shift.startTime}–{proposal.proposal.shift.endTime}
            </span>
          </div>
          {timeline === null || timeline.items.length === 0 ? (
            <EmptyState
              title="Chưa có mốc chương trình"
              body="Thêm mốc đầu tiên để hai bên cùng xem và phê duyệt."
            />
          ) : (
            <ol className="flex flex-col">
              {timeline.items.map((item, index) => (
                <li
                  key={item.itemId}
                  className="grid animate-in grid-cols-[56px_14px_minmax(0,1fr)] gap-x-3 duration-300 fade-in fill-mode-backwards slide-in-from-left-1 motion-reduce:animate-none"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <time className="text-sm leading-6 font-bold tabular-nums">{item.startTime}</time>
                  <span className="flex flex-col items-center" aria-hidden="true">
                    <span className="mt-2 size-2.5 rounded-full bg-primary" />
                    <span className="w-0.5 flex-1 bg-border" />
                  </span>
                  <span className="flex flex-col pb-4">
                    <strong className="text-sm leading-6">{item.title}</strong>
                    {item.description ? (
                      <small className="text-xs text-muted-foreground">{item.description}</small>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {/* Form sửa chỉ mở khi cần, để trang gọn; mở sẵn khi chưa có mốc nào. */}
          {proposal.capabilities.canEditTimeline ? (
            <details
              className="group border-t border-border pt-2"
              open={timeline === null || timeline.items.length === 0}
            >
              <summary className={summary}>
                <ChevronRight aria-hidden="true" />
                {confirmed ? 'Đề xuất thay đổi kịch bản' : 'Chỉnh sửa kịch bản'}
              </summary>
              <p className={cn(hint, 'mb-3')}>
                Giờ bắt đầu mỗi mốc phải từ {proposal.proposal.shift.startTime} đến trước{' '}
                {proposal.proposal.shift.endTime} theo ca tiệc đã chọn.
                {confirmed ? ' Tiệc đã cọc nên thay đổi cần nhà hàng duyệt.' : ''}
              </p>
              <TimelineEditor
                key={proposal.bookingId + ':' + (timeline?.revisionId ?? 'empty')}
                disabled={pending || !proposal.capabilities.canEditTimeline}
                initialItems={timeline?.items ?? []}
                needsReason={confirmed}
                onSave={(items, reason) => {
                  const input = {
                    bookingId: proposal.bookingId,
                    expectedRevision: proposal.revision,
                    predecessorRevisionId: timeline?.revisionId ?? null,
                    items,
                  };
                  return command(
                    (token) =>
                      confirmed
                        ? gateway.requestChange(token, { ...input, reason })
                        : gateway.saveTimeline(token, input),
                    confirmed
                      ? 'Đã gửi yêu cầu thay đổi kịch bản.'
                      : 'Đã lưu revision kịch bản mới.',
                  );
                }}
              />
            </details>
          ) : (
            <p className={cn(hint, 'border-t border-border pt-3')}>
              Kịch bản đã được duyệt hoặc có giao dịch cọc đang xử lý. Nếu muốn thay đổi trước cọc,
              rút phê duyệt ở mục Quyết định của hai bên. Giao dịch chưa rõ kết quả cần được xác
              minh trước.
            </p>
          )}
        </article>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        <ProposalDecisionsSection
          proposal={proposal}
          pending={pending}
          gateway={gateway}
          command={command}
        />

        <section
          className="flex flex-col gap-2 rounded-xl bg-muted p-5"
          aria-label="Bước tiếp theo"
        >
          <h2 className="text-sm font-bold">Bước tiếp theo</h2>
          {next}
        </section>

        {access === 'full' && proposal.capabilities.canRequestCancellation ? (
          <ProposalCancelSection
            proposal={proposal}
            pending={pending}
            gateway={gateway}
            command={command}
            confirm={confirm}
          />
        ) : null}
      </aside>
      {dialog}
    </div>
  );
}
