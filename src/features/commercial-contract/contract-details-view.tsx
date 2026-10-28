'use client';

import Link from 'next/link';
import React from 'react';
import { Celebrate } from '../../design-system/celebrate';
import { openBlob } from '../../lib/api/download';
import { formatVnd, type useCommand } from '../couple-workspace/use-couple-workspace';
import { contractApi } from './contract-api';
import type { currentRevision, ContractList, CoupleProfile } from './contract-api';
import { ContractLinesTable } from './contract-lines';
import { WithdrawForm } from './contract-withdraw-form';

export function ContractDetailsView({
  current,
  contracts,
  profile,
  bookingId,
  expectedRevision,
  managerApproved,
  coupleApproved,
  isPostDeposit,
  command,
  confirm,
  openEditor,
  after,
}: Readonly<{
  current: NonNullable<ReturnType<typeof currentRevision>>;
  contracts: ContractList;
  profile: CoupleProfile;
  bookingId: string;
  expectedRevision: number;
  managerApproved: boolean;
  coupleApproved: boolean;
  isPostDeposit: boolean;
  command: ReturnType<typeof useCommand>;
  confirm: (options: {
    title: string;
    description: string;
    confirmLabel?: string;
  }) => Promise<boolean>;
  openEditor: () => void;
  after: (result: unknown) => void;
}>) {
  return (
    <>
      <ContractLinesTable
        lines={current.document.lines}
        totalVnd={current.document.contractTotalVnd}
      />
      <p className="cw-note">
        Tổng dưới đây do nhà hàng tính trên máy chủ cho đúng phiên bản đang xem. Bao gồm các hạng
        mục trong bảng; chi phí phát sinh chưa ghi nhận không nằm trong tổng này. Kiểm tra toàn bộ
        trước khi gửi hoặc xác nhận duyệt.
      </p>
      <dl className="cw-stats">
        <div>
          <dt>Tổng hợp đồng</dt>
          <dd>{formatVnd(current.document.contractTotalVnd)}</dd>
        </div>
        <div>
          <dt>Tiền cọc (30%, làm tròn lên)</dt>
          <dd>{formatVnd(current.document.depositAmountVnd)}</dd>
        </div>
        <div>
          <dt>Nhà hàng duyệt</dt>
          <dd>{managerApproved ? 'Đã duyệt' : 'Chưa'}</dd>
        </div>
        <div>
          <dt>Hai bạn duyệt</dt>
          <dd>{coupleApproved ? 'Đã duyệt' : 'Chưa'}</dd>
        </div>
      </dl>
      <p className="cw-note">
        Cô dâu: <strong>{current.document.brideName ?? 'chưa có'}</strong> · Chú rể:{' '}
        <strong>{current.document.groomName ?? 'chưa có'}</strong> ·{' '}
        {current.document.incidentalClause}
      </p>

      <div className="cw-actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={command.pending}
          onClick={() =>
            void command.run(async (token) => {
              const blob = await contractApi.pdf(token, bookingId, current.revisionId);
              openBlob(blob, `hop-dong-ban-${current.revisionNumber}.pdf`);
            })
          }
        >
          Xem PDF
        </button>

        {current.state === 'DRAFT' ? (
          <button
            className="button"
            type="button"
            disabled={command.pending || !profile.brideName || !profile.groomName}
            title={
              !profile.brideName || !profile.groomName
                ? 'Cần nhập đủ tên cô dâu và chú rể'
                : undefined
            }
            onClick={() =>
              void command
                .run(
                  (token, key) =>
                    contractApi.submit(
                      token,
                      key,
                      bookingId,
                      current.revisionId,
                      expectedRevision,
                    ),
                  'Đã gửi hợp đồng để hai bên duyệt.',
                )
                .then(after)
            }
          >
            Gửi duyệt
          </button>
        ) : null}

        {current.state === 'AWAITING_APPROVAL' && !coupleApproved ? (
          <button
            className="button"
            type="button"
            disabled={command.pending}
            onClick={() =>
              void (async () => {
                const agreed = await confirm({
                  title: 'Duyệt hợp đồng này?',
                  description:
                    'Xác nhận hai bạn đã đọc và đồng ý với toàn bộ nội dung hợp đồng. Sau khi cả hai bên duyệt, muốn sửa phải rút duyệt và tạo bản mới.',
                  confirmLabel: 'Đồng ý & duyệt',
                });
                if (!agreed) return;
                await command
                  .run(
                    (token, key) =>
                      contractApi.approve(
                        token,
                        key,
                        bookingId,
                        current.revisionId,
                        expectedRevision,
                      ),
                    'Đã ghi nhận hai bạn duyệt hợp đồng.',
                  )
                  .then(after);
              })()
            }
          >
            Duyệt hợp đồng
          </button>
        ) : null}

        {current.state === 'APPROVED' ? (
          <Celebrate onceKey={'contract-' + current.revisionId} />
        ) : null}
        {current.state === 'APPROVED' && contracts.eligibleForDeposit ? (
          <Link className="button" href={`/khong-gian/thanh-toan?bookingId=${bookingId}`}>
            Đặt cọc {formatVnd(current.document.depositAmountVnd)}
          </Link>
        ) : null}

        {!isPostDeposit &&
        (current.state === 'DRAFT' || current.state === 'AWAITING_APPROVAL') ? (
          <button
            className="button button-secondary"
            type="button"
            disabled={command.pending}
            onClick={openEditor}
          >
            Chỉnh sửa (tạo bản mới)
          </button>
        ) : null}

        {isPostDeposit ? (
          <Link
            className="button button-secondary"
            href={`/khong-gian/chuan-bi/phu-luc?bookingId=${bookingId}`}
          >
            Thay đổi sau cọc → Phụ lục
          </Link>
        ) : null}
      </div>

      {current.state === 'APPROVED' && !contracts.eligibleForDeposit && !isPostDeposit ? (
        <p className="cw-note">
          Hợp đồng đã duyệt nhưng chưa đủ điều kiện đặt cọc (kịch bản, giữ chỗ sảnh hoặc giao dịch
          đang chờ). Liên hệ nhà hàng nếu cần.
        </p>
      ) : null}

      {(current.state === 'AWAITING_APPROVAL' && coupleApproved) ||
      current.state === 'APPROVED' ? (
        !isPostDeposit ? (
          <WithdrawForm
            pending={command.pending}
            onSubmit={(reason) =>
              void command
                .run(
                  (token, key) =>
                    contractApi.withdraw(
                      token,
                      key,
                      bookingId,
                      current.revisionId,
                      expectedRevision,
                      reason,
                    ),
                  'Đã rút duyệt. Hệ thống tạo bản nháp mới để chỉnh sửa.',
                )
                .then(after)
            }
          />
        ) : null
      ) : null}
    </>
  );
}

