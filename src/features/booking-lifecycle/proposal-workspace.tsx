'use client';

import React from 'react';
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
    <div className="collab-layout">
      <div className="collab-main">
        <ProposalSummarySection proposal={proposal} />

        <article className="collab-timeline">
          <div className="collab-card-head">
            <div>
              <p className="collab-kicker">
                Kịch bản hiện tại · Bản {timeline?.revisionNumber ?? 0}
              </p>
              <h2>Dòng thời gian</h2>
            </div>
            <span className="collab-shift-note">
              Giờ hợp lệ: {proposal.proposal.shift.startTime}–{proposal.proposal.shift.endTime}
            </span>
          </div>
          {timeline === null || timeline.items.length === 0 ? (
            <EmptyState
              title="Chưa có mốc chương trình"
              body="Thêm mốc đầu tiên để hai bên cùng xem và phê duyệt."
            />
          ) : (
            <ol>
              {timeline.items.map((item) => (
                <li key={item.itemId}>
                  <time>{item.startTime}</time>
                  <span>
                    <strong>{item.title}</strong>
                    {item.description ? <small>{item.description}</small> : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {/* Form sửa chỉ mở khi cần, để trang gọn; mở sẵn khi chưa có mốc nào. */}
          <details className="collab-edit" open={timeline === null || timeline.items.length === 0}>
            <summary>{confirmed ? 'Đề xuất thay đổi kịch bản' : 'Chỉnh sửa kịch bản'}</summary>
            <p className="collab-hint">
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
                  confirmed ? 'Đã gửi yêu cầu thay đổi kịch bản.' : 'Đã lưu revision kịch bản mới.',
                );
              }}
            />
          </details>
        </article>
      </div>

      <aside className="collab-side">
        <ProposalDecisionsSection
          proposal={proposal}
          pending={pending}
          gateway={gateway}
          command={command}
        />

        <section className="collab-next-card" aria-label="Bước tiếp theo">
          <p className="collab-kicker">Bước tiếp theo</p>
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
