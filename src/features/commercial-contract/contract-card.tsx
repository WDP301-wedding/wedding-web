'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import {
  authorizedRead,
  useCommand,
  type Proposal,
} from '../couple-workspace/use-couple-workspace';
import {
  contractApi,
  currentRevision,
  type Catalog,
  type ContractList,
  type CoupleProfile,
} from './contract-api';
import { stateLabels } from './contract-history-card';
import { ContractDetailsView } from './contract-details-view';
import { ContractDraftEditor } from './contract-draft-editor';

export interface ContractCardProps {
  proposal: Proposal;
  contracts: ContractList;
  profile: CoupleProfile;
  onChanged: () => void;
  editing: boolean;
  setEditing: (value: boolean) => void;
  onWritingChange: (value: boolean) => void;
}

export function ContractCard({
  proposal,
  contracts,
  profile,
  onChanged,
  editing,
  setEditing,
  onWritingChange,
}: ContractCardProps) {
  const command = useCommand({ errorPresentation: editing ? 'inline' : 'toast' });
  const { confirm, dialog } = useConfirmDialog();
  useEffect(() => {
    onWritingChange(command.pending);
  }, [command.pending, onWritingChange]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<FriendlyError | null>(null);
  const current = currentRevision(contracts);
  const bookingId = proposal.bookingId;
  const expectedRevision = contracts.bookingRevision;

  // Hợp đồng phải gắn đúng revision timeline đã được hai bên duyệt.
  const timeline = proposal.timeline ?? proposal.effectiveTimeline;
  const timelineApproved = Boolean(timeline?.managerApprovedAt && timeline.coupleApprovedAt);
  const coupleApproved =
    current?.approvals.some((approval) => approval.party === 'COUPLE') ?? false;
  const managerApproved =
    current?.approvals.some((approval) => approval.party === 'MANAGER') ?? false;
  const isPostDeposit = proposal.phase === 'CONFIRMED' || proposal.phase === 'COMPLETED';

  const openEditor = () => {
    command.setError(null);
    setEditing(true);
    if (catalog) return;
    authorizedRead((token) => contractApi.catalog(token))
      .then(setCatalog)
      .catch((error: unknown) => setCatalogError(describeApiError(error)));
  };

  const after = (result: unknown) => {
    if (result) {
      setEditing(false);
      onChanged();
    }
  };

  if (contracts.modelVersion === 'LEGACY_PROPOSAL_V1' && current === null && isPostDeposit) {
    return (
      <section className="cw-card">
        <h2>Hợp đồng</h2>
        <p className="cw-note">
          Tiệc này được xác nhận theo đề xuất cũ (trước khi có hợp đồng nhiều hạng mục). Các khoản
          đã thanh toán được giữ nguyên; xem chi tiết ở trang Thanh toán.
        </p>
      </section>
    );
  }

  return (
    <section className="cw-card" aria-labelledby="contract-heading">
      <div className="cw-card-header">
        <h2 id="contract-heading">
          {current ? `Hợp đồng · bản số ${current.revisionNumber}` : 'Chưa có hợp đồng'}
        </h2>
        {current ? (
          <span className="status status-champagne">{stateLabels[current.state]}</span>
        ) : null}
      </div>

      {!timelineApproved && !isPostDeposit ? (
        <p className="cw-note">
          Kịch bản tiệc chưa được cả hai bên duyệt. Hợp đồng gắn với đúng phiên bản kịch bản, nên
          hãy{' '}
          <Link href={`/khong-gian/thoa-thuan/kich-ban?bookingId=${bookingId}`}>
            hoàn tất duyệt kịch bản
          </Link>{' '}
          trước khi đặt cọc.
        </p>
      ) : null}

      {current ? (
        <ContractDetailsView
          current={current}
          contracts={contracts}
          profile={profile}
          bookingId={bookingId}
          expectedRevision={expectedRevision}
          managerApproved={managerApproved}
          coupleApproved={coupleApproved}
          isPostDeposit={isPostDeposit}
          command={command}
          confirm={confirm}
          openEditor={openEditor}
          after={after}
        />
      ) : (
        <>
          <p>
            Hợp đồng gồm một hoặc nhiều thực đơn (theo số bàn), dịch vụ đi kèm và thiệp in. Sau khi
            lưu bản nháp, hệ thống tính giá và hai bên lần lượt duyệt.
          </p>
          {!editing ? (
            <div className="cw-actions">
              <button className="button" type="button" disabled={!timeline} onClick={openEditor}>
                Lập hợp đồng
              </button>
              {!timeline ? <small>Cần có kịch bản tiệc trước.</small> : null}
            </div>
          ) : null}
        </>
      )}

      {editing ? (
        <ContractDraftEditor
          proposal={proposal}
          current={current}
          catalog={catalog}
          catalogError={catalogError}
          command={command}
          bookingId={bookingId}
          expectedRevision={expectedRevision}
          onCancel={() => setEditing(false)}
          after={after}
        />
      ) : null}
      {dialog}
    </section>
  );
}
