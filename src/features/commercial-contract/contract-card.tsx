'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { useCommand, type Proposal } from '../couple-workspace/use-couple-workspace';
import { currentRevision, type ContractList } from './contract-api';
import { stateLabels } from './contract-history-card';
import { ContractDetailsView } from './contract-details-view';
import { cx } from './contract-classes';

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
      <section className={cx.card}>
        <h2>Hợp đồng</h2>
        <p className={cx.note}>
          Tiệc này được xác nhận theo đề xuất cũ. Các khoản đã thanh toán được giữ nguyên; xem chi
          tiết ở trang Thanh toán.
        </p>
      </section>
    );
  }
  const selectionReason = contracts.selectionAccess?.blockReason;
  if (
    !current &&
    (proposal.phase === 'CANCELLED' ||
      [
        'LEGACY_COMMERCIAL_CONVERSION_BLOCKED',
        'FINANCIAL_REVIEW_REQUIRED',
        'DEPOSIT_IN_PROGRESS',
        'PAYMENT_OUTCOME_UNKNOWN',
        'DEPOSIT_SETTLED',
        'BOOKING_NOT_EDITABLE',
        'BOOKING_CLOSED',
      ].includes(selectionReason ?? ''))
  )
    return null;
  return (
    <section className={cx.card} aria-labelledby="contract-heading">
      <div className={cx.cardHeader}>
        <h2 id="contract-heading" className="scroll-mt-16">
          {current
            ? 'Hợp đồng · bản số ' + current.revisionNumber
            : contracts.customerSelection?.status === 'SUBMITTED'
              ? 'Nhà hàng đang chuẩn bị hợp đồng'
              : 'Hợp đồng được lập sau khi chốt lựa chọn'}
        </h2>
        {current ? <span className={cx.status}>{stateLabels[current.state]}</span> : null}
      </div>
      {!timelineApproved && !isPostDeposit ? (
        <p className={cx.note}>
          Cần duyệt đúng phiên bản kịch bản trước khi đặt cọc.{' '}
          <Link href={'/khong-gian/thoa-thuan/kich-ban?bookingId=' + proposal.bookingId}>
            Xem kịch bản tiệc
          </Link>
        </p>
      ) : null}
      {current ? (
        <ContractDetailsView
          key={current.revisionId}
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
          {contracts.customerSelection?.status === 'SUBMITTED'
            ? 'Nhà hàng sẽ soạn hợp đồng từ lựa chọn đã gửi. Khi có bản hợp đồng, hai bạn kiểm tra nội dung, chi phí và các điều chỉnh trước khi duyệt.'
            : 'Hoàn thiện lựa chọn thực đơn và dịch vụ ở trên, lưu nháp để kiểm tra, sau đó gửi cho nhà hàng. Hợp đồng sẽ được soạn từ lựa chọn đã chốt; bạn không cần nhập lại thông tin đặt tiệc.'}
        </p>
      )}
      {dialog}
    </section>
  );
}
