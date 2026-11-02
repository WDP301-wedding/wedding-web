'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from 'cn';

import { Button } from '../../components/ui/button';
import { control, field as fieldClass } from '../public-website/public-classes';
import type { CollaborationGateway, ProposalView } from './collaboration-api';
import { card, cardTitle, hint, summary } from './collab-classes';
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
    <section className={cn(card, 'flex flex-col gap-3')} aria-label="Phê duyệt kịch bản">
      <h2 className={cardTitle}>Quyết định của hai bên</h2>
      <Approval label="Nhà hàng" value={timeline?.managerApprovedAt ?? null} />
      <Approval label="Hai bạn" value={timeline?.coupleApprovedAt ?? null} />
      {timeline === null ? (
        <p className={hint}>Chưa có kịch bản để duyệt.</p>
      ) : (
        <>
          <Button
            className="mt-1"
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
                'Đã ghi nhận phê duyệt bản kịch bản hiện tại.',
              )
            }
          >
            Phê duyệt bản này
          </Button>
          <details className="group border-t border-border pt-1">
            <summary className={summary}>
              <ChevronRight aria-hidden="true" />
              Rút lại phê duyệt
            </summary>
            <form
              className="mt-1 flex flex-col gap-3"
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
              <label className={fieldClass}>
                Lý do rút phê duyệt
                <textarea
                  className={cn(control, 'h-auto py-2.5')}
                  name="reason"
                  required
                  maxLength={500}
                  rows={2}
                />
              </label>
              <Button
                className="self-start"
                variant="outline"
                disabled={pending || !proposal.capabilities.canWithdrawApproval}
                type="submit"
              >
                Rút phê duyệt
              </Button>
            </form>
          </details>
        </>
      )}
    </section>
  );
}
