'use client';

import React from 'react';
import type { CollaborationGateway, ProposalView } from './collaboration-api';
import { Approval, field } from './proposal-workspace-components';

export function ProposalDecisionsSection({
  proposal,
  pending,
  gateway,
  command,
}: Readonly<{
  proposal: ProposalView;
  pending: boolean;
  gateway: CollaborationGateway;
  command: (operation: (token: string) => Promise<void>, success: string) => Promise<void>;
}>) {
  const timeline = proposal.timeline;

  return (
    <section className="collab-decisions" aria-label="Phê duyệt kịch bản">
      <p className="collab-kicker">Quyết định của hai bên</p>
      <h2>Phê duyệt</h2>
      <Approval label="Nhà hàng" value={timeline?.managerApprovedAt ?? null} />
      <Approval label="Hai bạn" value={timeline?.coupleApprovedAt ?? null} />
      {timeline === null ? (
        <p className="collab-hint">Chưa có kịch bản để duyệt.</p>
      ) : (
        <>
          <button
            className="collab-approve"
            disabled={pending || !proposal.capabilities.canApproveTimeline}
            type="button"
            onClick={() =>
              void command(
                (token) =>
                  gateway.approve(token, {
                    bookingId: proposal.bookingId,
                    revisionId: timeline.revisionId,
                    expectedRevision: proposal.revision,
                  }),
                'Đã ghi nhận phê duyệt revision hiện tại.',
              )
            }
          >
            Phê duyệt revision này
          </button>
          <details className="collab-more">
            <summary>Rút lại phê duyệt</summary>
            <form
              className="collab-withdraw"
              onSubmit={(event) => {
                event.preventDefault();
                const reason = field(new FormData(event.currentTarget), 'reason');
                void command(
                  (token) =>
                    gateway.withdraw(token, {
                      bookingId: proposal.bookingId,
                      revisionId: timeline.revisionId,
                      expectedRevision: proposal.revision,
                      reason,
                    }),
                  'Đã rút phê duyệt.',
                );
              }}
            >
              <label>
                Lý do rút phê duyệt
                <textarea name="reason" required maxLength={500} rows={2} />
              </label>
              <button
                className="collab-secondary"
                disabled={pending || !proposal.capabilities.canWithdrawApproval}
                type="submit"
              >
                Rút phê duyệt
              </button>
            </form>
          </details>
        </>
      )}
    </section>
  );
}

