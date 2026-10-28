'use client';

import React from 'react';
import { InlineError } from '../../design-system/inline-error';
import { Skeleton } from '../../design-system/skeleton';
import { ErrorPanel } from '../couple-workspace/couple-page';
import { authorizedRead, type Proposal, type useCommand } from '../couple-workspace/use-couple-workspace';
import type { FriendlyError } from '../../lib/api/api-errors';
import { contractApi } from './contract-api';
import type { currentRevision, Catalog } from './contract-api';
import { LineSelector } from './contract-lines';
import { previewContract } from './contract-preview-api';

export function ContractDraftEditor({
  proposal,
  current,
  catalog,
  catalogError,
  command,
  bookingId,
  expectedRevision,
  onCancel,
  after,
}: Readonly<{
  proposal: Proposal;
  current: ReturnType<typeof currentRevision>;
  catalog: Catalog | null;
  catalogError: FriendlyError | null;
  command: ReturnType<typeof useCommand>;
  bookingId: string;
  expectedRevision: number;
  onCancel: () => void;
  after: (result: unknown) => void;
}>) {
  const timeline = proposal.timeline ?? proposal.effectiveTimeline;

  return (
    <>
      <InlineError error={command.error} />
      <button
        className="button button-secondary"
        type="button"
        disabled={command.pending}
        onClick={onCancel}
      >
        Hủy chỉnh sửa
      </button>

      {catalogError ? (
        <ErrorPanel error={catalogError} />
      ) : !catalog ? (
        <Skeleton label="Đang tải danh mục…" variant="card" />
      ) : !timeline ? (
        <p className="cw-note">Cần có kịch bản tiệc trước khi lập hợp đồng.</p>
      ) : (
        <LineSelector
          key={bookingId + ':' + (current?.revisionId ?? 'new')}
          catalog={catalog}
          initialLines={current?.document.lines ?? []}
          maxGuests={proposal.proposal.hall.maxGuests}
          planningHeadcount={proposal.planningHeadcount}
          pending={command.pending}
          submitLabel={current ? 'Lưu bản hợp đồng mới' : 'Lưu bản nháp'}
          onPreview={(lines) =>
            authorizedRead((token) =>
              previewContract(token, bookingId, {
                expectedRevision,
                predecessorRevisionId: current?.revisionId ?? null,
                timelineRevisionId: timeline.revisionId,
                lines,
              }),
            )
          }
          onSubmit={(lines) =>
            void command
              .run(
                (token, key) =>
                  contractApi.createDraft(token, key, bookingId, {
                    expectedRevision,
                    predecessorRevisionId: current?.revisionId ?? null,
                    timelineRevisionId: timeline.revisionId,
                    lines,
                  }),
                'Đã lưu bản nháp hợp đồng. Kiểm tra lại rồi gửi duyệt.',
              )
              .then(after)
          }
        />
      )}
    </>
  );
}

