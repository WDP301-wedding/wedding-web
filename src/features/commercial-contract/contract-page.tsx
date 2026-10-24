'use client';

import Link from 'next/link';
import { previewContract } from './contract-preview-api';
import { useCallback, useEffect, useState } from 'react';

import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { openBlob } from '../../lib/api/download';
import { CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import {
  authorizedRead,
  formatDateTime,
  formatVnd,
  useCommand,
  type Proposal,
  formText,
} from '../couple-workspace/use-couple-workspace';
import {
  contractApi,
  currentRevision,
  type Catalog,
  type ContractList,
  type ContractRevision,
  type CoupleProfile,
} from './contract-api';
import { ContractLinesTable } from './contract-lines';
import { LineSelector } from './contract-lines';
import { Celebrate } from '../../design-system/celebrate';
import { Skeleton } from '../../design-system/skeleton';
import { routes, withBooking } from '../../routes';

const stateLabels: Record<ContractRevision['state'], string> = {
  DRAFT: 'Bản nháp',
  AWAITING_APPROVAL: 'Chờ hai bên duyệt',
  APPROVED: 'Đã duyệt',
  SUPERSEDED: 'Đã được thay thế',
};

/** `names` / `contract`: web v2 tách "Tên cô dâu chú rể" và "Hợp đồng" thành 2 bước của Thoả thuận. */
export type ContractSection = 'all' | 'names' | 'contract';

const sectionCopy: Record<ContractSection, { title: string; description: string }> = {
  all: {
    title: 'Hợp đồng tiệc cưới',
    description:
      'Chọn thực đơn, dịch vụ và thiệp in; hai bên cùng duyệt một phiên bản trước khi đặt cọc.',
  },
  names: {
    title: 'Tên cô dâu & chú rể',
    description: 'Tên được in trên hợp đồng và thiệp cưới. Cần có trước khi gửi duyệt hợp đồng.',
  },
  contract: {
    title: 'Hợp đồng tiệc cưới',
    description: 'Hai bên cùng duyệt một phiên bản hợp đồng trước khi đặt cọc.',
  },
};

export function ContractPage({ section = 'all' }: Readonly<{ section?: ContractSection }> = {}) {
  return (
    <CouplePage
      active="contract"
      eyebrow="Thống nhất"
      title={sectionCopy[section].title}
      description={sectionCopy[section].description}
    >
      {(proposal, reload) => (
        <ContractWorkspace proposal={proposal} reloadBooking={reload} section={section} />
      )}
    </CouplePage>
  );
}

function ContractWorkspace({
  proposal,
  reloadBooking,
  section,
}: Readonly<{ proposal: Proposal; reloadBooking: () => void; section: ContractSection }>) {
  const [contracts, setContracts] = useState<ContractList | null>(null);
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      authorizedRead((token) => contractApi.list(token, proposal.bookingId)),
      authorizedRead((token) => contractApi.profile(token, proposal.consultationId)),
    ])
      .then(([list, coupleProfile]) => {
        if (!active) return;
        setContracts(list);
        setProfile(coupleProfile);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(describeApiError(error));
      });
    return () => {
      active = false;
    };
  }, [proposal.bookingId, proposal.consultationId, reloadKey]);

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!contracts || !profile) return <Skeleton label="Đang tải hợp đồng…" />;

  const showNames = section !== 'contract';
  const showContract = section !== 'names';
  const namesMissing = !profile.brideName || !profile.groomName;
  return (
    <>
      {showNames ? (
        <CoupleNamesCard
          profile={profile}
          onSaved={(next) => {
            setProfile(next);
          }}
        />
      ) : null}
      {section === 'names' ? (
        <div className="cw-next-step cw-next-step-stack">
          <p>{namesMissing ? 'Lưu đủ tên hai bạn để tiếp tục.' : 'Tên đã sẵn sàng.'}</p>
          <Link className="button" href={withBooking(routes.contract, proposal.bookingId)}>
            Tiếp tục tới Hợp đồng
          </Link>
        </div>
      ) : null}
      {section === 'contract' && namesMissing ? (
        <p className="cw-next-step" role="note">
          Hợp đồng cần tên cô dâu và chú rể.{' '}
          <Link href={withBooking(routes.names, proposal.bookingId)}>Nhập tên →</Link>
        </p>
      ) : null}
      {showContract ? (
        <ContractCard
          proposal={proposal}
          contracts={contracts}
          profile={profile}
          onChanged={() => {
            // Mỗi lệnh hợp đồng làm tăng revision của Booking → nạp lại cả booking lẫn hợp đồng.
            reload();
            reloadBooking();
          }}
        />
      ) : null}
      {showContract ? <HistoryCard contracts={contracts} bookingId={proposal.bookingId} /> : null}
    </>
  );
}

/** Tên cô dâu và chú rể là 2 trường riêng, bắt buộc trước khi gửi duyệt hợp đồng. */
function CoupleNamesCard({
  profile,
  onSaved,
}: Readonly<{ profile: CoupleProfile; onSaved: (profile: CoupleProfile) => void }>) {
  const command = useCommand();
  const missing = !profile.brideName || !profile.groomName;
  return (
    <section className="cw-card" aria-labelledby="names-heading">
      <div className="cw-card-header">
        <h2 id="names-heading">Tên cô dâu & chú rể</h2>
        {missing ? (
          <span className="status status-danger">Cần bổ sung trước khi gửi duyệt</span>
        ) : null}
      </div>
      <form
        className="cw-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const brideName = formText(data, 'brideName');
          const groomName = formText(data, 'groomName');
          void command
            .run(
              (token, key) =>
                contractApi.updateProfile(token, key, profile.consultationId, {
                  expectedRevision: profile.revision,
                  brideName,
                  groomName,
                }),
              'Đã lưu tên cô dâu và chú rể.',
            )
            .then((next) => {
              if (next) onSaved(next);
            });
        }}
      >
        <div className="cw-form-row">
          <label>
            Tên cô dâu
            <input
              name="brideName"
              defaultValue={profile.brideName ?? ''}
              required
              maxLength={120}
            />
          </label>
          <label>
            Tên chú rể
            <input
              name="groomName"
              defaultValue={profile.groomName ?? ''}
              required
              maxLength={120}
            />
          </label>
        </div>
        <small>
          Tên sẽ được in vào hợp đồng. Sửa tên sau khi hợp đồng đã duyệt không làm thay đổi bản đã
          duyệt.
        </small>
        <div className="cw-actions">
          <button className="button" disabled={command.pending} type="submit">
            {command.pending ? 'Đang lưu…' : 'Lưu tên'}
          </button>
        </div>
      </form>
    </section>
  );
}

function ContractCard({
  proposal,
  contracts,
  profile,
  onChanged,
}: Readonly<{
  proposal: Proposal;
  contracts: ContractList;
  profile: CoupleProfile;
  onChanged: () => void;
}>) {
  const command = useCommand();
  const { confirm, dialog } = useConfirmDialog();
  const [editing, setEditing] = useState(false);
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
        <>
          <ContractLinesTable
            lines={current.document.lines}
            totalVnd={current.document.contractTotalVnd}
          />
          <p className="cw-note">
            Tổng dưới đây do nhà hàng tính trên máy chủ cho đúng phiên bản đang xem. Bao gồm các
            hạng mục trong bảng; chi phí phát sinh chưa ghi nhận không nằm trong tổng này. Kiểm tra
            toàn bộ trước khi gửi hoặc xác nhận duyệt.
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
              Hợp đồng đã duyệt nhưng chưa đủ điều kiện đặt cọc (kịch bản, giữ chỗ sảnh hoặc giao
              dịch đang chờ). Liên hệ nhà hàng nếu cần.
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
        catalogError ? (
          <ErrorPanel error={catalogError} />
        ) : !catalog ? (
          <Skeleton label="Đang tải danh mục…" variant="card" />
        ) : !timeline ? (
          <p className="cw-note">Cần có kịch bản tiệc trước khi lập hợp đồng.</p>
        ) : (
          <LineSelector
            key={bookingId + ':' + expectedRevision}
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
        )
      ) : null}
      {dialog}
    </section>
  );
}

function WithdrawForm({
  pending,
  onSubmit,
}: Readonly<{ pending: boolean; onSubmit: (reason: string) => void }>) {
  return (
    <details>
      <summary>Cần chỉnh sửa? Rút duyệt</summary>
      <form
        className="cw-form"
        onSubmit={(event) => {
          event.preventDefault();
          const reason = formText(new FormData(event.currentTarget), 'reason');
          if (reason) onSubmit(reason);
        }}
      >
        <label>
          Lý do
          <textarea name="reason" required maxLength={500} rows={2} />
        </label>
        <div className="cw-actions">
          <button className="button button-secondary" disabled={pending} type="submit">
            Rút duyệt
          </button>
        </div>
      </form>
    </details>
  );
}

function HistoryCard({
  contracts,
  bookingId,
}: Readonly<{ contracts: ContractList; bookingId: string }>) {
  const command = useCommand();
  if (contracts.revisions.length <= 1) return null;
  return (
    <section className="cw-card">
      <h2>Lịch sử phiên bản</h2>
      <div className="cw-table-wrap">
        <table className="cw-table">
          <thead>
            <tr>
              <th scope="col">Bản</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Tạo lúc</th>
              <th scope="col" className="num">
                Tổng
              </th>
              <th scope="col">PDF</th>
            </tr>
          </thead>
          <tbody>
            {contracts.revisions.map((revision) => (
              <tr key={revision.revisionId}>
                <td>#{revision.revisionNumber}</td>
                <td>{stateLabels[revision.state]}</td>
                <td>{formatDateTime(revision.createdAt)}</td>
                <td className="num">{formatVnd(revision.document.contractTotalVnd)}</td>
                <td>
                  <button
                    className="cw-text-button"
                    type="button"
                    disabled={command.pending}
                    onClick={() =>
                      void command.run(async (token) =>
                        openBlob(
                          await contractApi.pdf(token, bookingId, revision.revisionId),
                          `hop-dong-ban-${revision.revisionNumber}.pdf`,
                        ),
                      )
                    }
                  >
                    Mở
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
