'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { useCommand, type Proposal } from '../couple-workspace/use-couple-workspace';
import { currentRevision, type ContractList } from './contract-api';
import { stateLabels } from './contract-history-card';
import { ContractDetailsView } from './contract-details-view';

export interface ContractCardProps {
  proposal: Proposal;
  contracts: ContractList;
  onChanged: () => void;
  onWritingChange: (value: boolean) => void;
}

export function ContractCard({
  proposal,
  contracts,
  onChanged,
  onWritingChange,
}: ContractCardProps) {
  const command = useCommand({ errorPresentation: 'toast' });
  const { confirm, dialog } = useConfirmDialog();
  useEffect(() => {
    onWritingChange(command.pending);
  }, [command.pending, onWritingChange]);
  const current = currentRevision(contracts);
  const timeline = proposal.timeline ?? proposal.effectiveTimeline;
  const timelineApproved = Boolean(timeline?.managerApprovedAt && timeline.coupleApprovedAt);
  const isPostDeposit = proposal.phase === 'CONFIRMED' || proposal.phase === 'COMPLETED';
  const after = (result: unknown) => {
    if (result) onChanged();
  };

  if (contracts.modelVersion === 'LEGACY_PROPOSAL_V1' && current === null && isPostDeposit) {
    return (
      <section className="cw-card">
        <h2>Hợp đồng</h2>
        <p className="cw-note">
          Tiệc này được xác nhận theo đề xuất cũ. Các khoản đã thanh toán được giữ nguyên; xem chi
          tiết ở trang Thanh toán.
        </p>
      </section>
    );
  }
  return (
    <section className="cw-card" aria-labelledby="contract-heading">
      <div className="cw-card-header">
        <h2 id="contract-heading">
          {current
            ? 'Hợp đồng · bản số ' + current.revisionNumber
            : 'Nhà hàng đang chuẩn bị hợp đồng'}
        </h2>
        {current ? (
          <span className="status status-champagne">{stateLabels[current.state]}</span>
        ) : null}
      </div>
      {!timelineApproved && !isPostDeposit ? (
        <p className="cw-note">
          Cần duyệt đúng phiên bản kịch bản trước khi đặt cọc.{' '}
          <Link href={'/khong-gian/thoa-thuan/kich-ban?bookingId=' + proposal.bookingId}>
            Xem kịch bản tiệc
          </Link>
        </p>
      ) : null}
      {current ? (
        <ContractDetailsView
          current={current}
          contracts={contracts}
          bookingId={proposal.bookingId}
          expectedRevision={contracts.bookingRevision}
          managerApproved={current.approvals.some((a) => a.party === 'MANAGER')}
          coupleApproved={current.approvals.some((a) => a.party === 'COUPLE')}
          isPostDeposit={isPostDeposit}
          command={command}
          confirm={confirm}
          after={after}
        />
      ) : (
        <p>
          Nhà hàng sẽ lập hợp đồng từ đề xuất đã thống nhất, gồm thực đơn, số bàn và các hạng mục đi
          kèm. Khi nhà hàng gửi duyệt, hai bạn xem chi tiết và xác nhận tại đây; không cần nhập lại
          thông tin đặt tiệc.
        </p>
      )}
      {dialog}
    </section>
  );
}
