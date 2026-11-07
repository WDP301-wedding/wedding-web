'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import React, { useState } from 'react';
import { Celebrate } from '../../design-system/celebrate';
import { formatVnd, type useCommand } from '../couple-workspace/use-couple-workspace';
import { contractApi } from './contract-api';
import type { currentRevision, ContractList } from './contract-api';
import { ContractLinesTable } from './contract-lines';
import { WithdrawForm } from './contract-withdraw-form';
import { cx } from './contract-classes';
import { ContractPdfViewer } from './contract-pdf-viewer';

export function ContractDetailsView({
  current,
  contracts,
  bookingId,
  expectedRevision,
  managerApproved,
  coupleApproved,
  isPostDeposit,
  command,
  confirm,
  after,
}: Readonly<{
  current: NonNullable<ReturnType<typeof currentRevision>>;
  contracts: ContractList;
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
  after: (result: unknown) => void;
}>) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const standard = current.document.standardTerms;
  const isLocked = current.state === 'APPROVED' && Boolean(standard);
  const canViewPdf = !standard || current.submittedAt !== null;
  const canRequestChanges =
    current.state === 'AWAITING_APPROVAL' && contracts.capabilities?.canRequestChanges;
  return (
    <>
      <ContractLinesTable
        lines={current.document.lines}
        totalVnd={current.document.contractTotalVnd}
      />
      <p className={cx.note}>
        {standard
          ? 'Giá đã bao gồm thuế GTGT. Hóa đơn cuối sẽ đối soát phụ lục và các khoản phát sinh.'
          : 'Tổng tiền áp dụng cho các hạng mục trong phiên bản này.'}
      </p>
      <dl className={cx.stats}>
        <div>
          <dt>Tổng hợp đồng</dt>
          <dd>{formatVnd(current.document.contractTotalVnd)}</dd>
        </div>
        <div>
          <dt>
            Tiền cọc (
            {(current.document as any).depositRate ??
              (current.document.contractTotalVnd > 0
                ? Math.round(
                    (current.document.depositAmountVnd / current.document.contractTotalVnd) * 100,
                  )
                : 30)}
            %, làm tròn lên)
          </dt>
          <dd>{formatVnd(current.document.depositAmountVnd)}</dd>
        </div>
        {standard ? (
          <div>
            <dt>Tất toán sau tiệc (tạm tính)</dt>
            <dd>
              {formatVnd(current.document.contractTotalVnd - current.document.depositAmountVnd)}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Nhà hàng duyệt</dt>
          <dd>{managerApproved ? 'Đã duyệt' : 'Chưa'}</dd>
        </div>
        <div>
          <dt>Hai bạn duyệt</dt>
          <dd>{coupleApproved ? 'Đã duyệt' : 'Chưa'}</dd>
        </div>
      </dl>
      <p className={cx.note}>
        Cô dâu: <strong>{current.document.brideName ?? 'chưa có'}</strong> · Chú rể:{' '}
        <strong>{current.document.groomName ?? 'chưa có'}</strong> ·{' '}
        {current.document.incidentalClause}
      </p>
      {standard ? (
        <p className={cx.note}>
          Tối đa 02 bàn dự phòng miễn phí kèm thực đơn <strong>{standard.reserveMenu.name}</strong>.
        </p>
      ) : null}
      {isLocked ? (
        <p className={cx.note}>
          Hai bên đã duyệt và khóa phiên bản này. Tải bản chính thức để in và ký tay ở Điều 10.
        </p>
      ) : null}

      <div className={cx.actions}>
        {canViewPdf ? (
          <button
            className={cx.buttonOutline}
            type="button"
            disabled={command.pending}
            onClick={() => setPreviewOpen(true)}
          >
            {current.state === 'APPROVED' ? 'Xem PDF đã duyệt' : 'Xem trước hợp đồng (PDF)'}
          </button>
        ) : null}

        {current.state === 'DRAFT' ? (
          <p className={cx.note}>
            {contracts.changeRequestReason
              ? 'Đã gửi yêu cầu chỉnh sửa. Nhà hàng đang chuẩn bị phiên bản mới.'
              : 'Nhà hàng đang soạn bản nháp. Bản PDF và nút duyệt sẽ có khi nhà hàng gửi hợp đồng.'}
          </p>
        ) : null}

        {current.state === 'AWAITING_APPROVAL' &&
        !coupleApproved &&
        contracts.capabilities?.canApprove ? (
          <button
            className={cx.button}
            type="button"
            disabled={command.pending}
            onClick={() =>
              void (async () => {
                const agreed = await confirm({
                  title: 'Duyệt hợp đồng này?',
                  description: standard
                    ? 'Xác nhận hai bạn đã đọc và đồng ý với bản hợp đồng này. Hệ thống khóa bản chính thức khi cả hai bên đã duyệt.'
                    : 'Xác nhận hai bạn đã đọc và đồng ý với toàn bộ nội dung hợp đồng.',
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
          <Link className={cx.button} href={`/khong-gian/thanh-toan?bookingId=${bookingId}`}>
            Đặt cọc {formatVnd(current.document.depositAmountVnd)}
          </Link>
        ) : null}

        {isPostDeposit ? (
          <Link
            className={cx.buttonOutline}
            href={`/khong-gian/chuan-bi/phu-luc?bookingId=${bookingId}`}
          >
            Thay đổi sau cọc
            <ArrowRight aria-hidden="true" />
            Phụ lục
          </Link>
        ) : null}
      </div>
      {previewOpen && canViewPdf ? (
        <ContractPdfViewer
          key={current.revisionId + ':' + current.state}
          bookingId={bookingId}
          revisionId={current.revisionId}
          revisionNumber={current.revisionNumber}
          mode={current.state === 'APPROVED' ? 'official' : 'preview'}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      {current.state === 'APPROVED' && !contracts.eligibleForDeposit && !isPostDeposit ? (
        <p className={cx.note}>
          Hợp đồng đã duyệt nhưng chưa đủ điều kiện đặt cọc (kịch bản, giữ chỗ sảnh hoặc giao dịch
          đang chờ). Liên hệ nhà hàng nếu cần.
        </p>
      ) : null}

      {canRequestChanges ? (
        <WithdrawForm
          requestChanges
          pending={command.pending}
          onSubmit={(reason) => {
            void command
              .run(
                (token, key) =>
                  contractApi.requestChanges(
                    token,
                    key,
                    bookingId,
                    current.revisionId,
                    expectedRevision,
                    reason,
                  ),
                'Đã gửi yêu cầu chỉnh sửa cho nhà hàng.',
              )
              .then(after);
          }}
        />
      ) : (current.state === 'AWAITING_APPROVAL' && coupleApproved) ||
        current.state === 'APPROVED' ? (
        !isPostDeposit && contracts.capabilities?.canWithdrawApproval ? (
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
                  'Đã rút duyệt và gửi lý do cho nhà hàng chuẩn bị lại hợp đồng.',
                )
                .then(after)
            }
          />
        ) : null
      ) : null}
    </>
  );
}
