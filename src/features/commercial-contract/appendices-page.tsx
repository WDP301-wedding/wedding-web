'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ApiBody, ApiData } from '../../lib/api/types';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { CommandFeedback, CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import {
  authorizedRead,
  bearer,
  coupleApi,
  formatDateTime,
  formatVnd,
  unwrap,
  useCommand,
  type Proposal,
  formText,
} from '../couple-workspace/use-couple-workspace';
import { contractApi, type Catalog, type ContractLine, type ContractList } from './contract-api';
import { ContractLinesTable, LineSelector } from './contract-lines';
import { Skeleton } from '../../design-system/skeleton';

type AppendixList = ApiData<'/bookings/{bookingId}/contract-appendices', 'get'>;
type Appendix = AppendixList['revisions'][number];
type AppendixResult = ApiData<'/bookings/{bookingId}/contract-appendices', 'post'>;
const idem = (key: string) => ({ 'Idempotency-Key': key });

const appendixApi = {
  async list(token: string, bookingId: string) {
    return unwrap<AppendixList>(
      await coupleApi().GET('/bookings/{bookingId}/contract-appendices', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
  async create(
    token: string,
    key: string,
    bookingId: string,
    body: ApiBody<'/bookings/{bookingId}/contract-appendices', 'post'>,
  ) {
    return unwrap<AppendixResult>(
      await coupleApi().POST('/bookings/{bookingId}/contract-appendices', {
        headers: bearer(token),
        params: { path: { bookingId }, header: idem(key) },
        body,
      }),
    );
  },
  async submit(
    token: string,
    key: string,
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
  ) {
    return unwrap<AppendixResult>(
      await coupleApi().POST('/bookings/{bookingId}/contract-appendices/{revisionId}/submissions', {
        headers: bearer(token),
        params: { path: { bookingId, revisionId }, header: idem(key) },
        body: { expectedRevision },
      }),
    );
  },
  async approve(
    token: string,
    key: string,
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
  ) {
    return unwrap<AppendixResult>(
      await coupleApi().POST('/bookings/{bookingId}/contract-appendices/{revisionId}/approvals', {
        headers: bearer(token),
        params: { path: { bookingId, revisionId }, header: idem(key) },
        body: { expectedRevision },
      }),
    );
  },
};

const stateLabels: Record<Appendix['state'], string> = {
  DRAFT: 'Bản nháp',
  AWAITING_APPROVAL: 'Chờ hai bên duyệt',
  APPROVED: 'Đã duyệt',
  SUPERSEDED: 'Đã được thay thế',
};

export function AppendicesPage() {
  return (
    <CouplePage
      active="appendices"
      eyebrow="Sau đặt cọc"
      title="Phụ lục hợp đồng"
      description="Thay đổi thực đơn, số bàn, dịch vụ hoặc số thiệp in sau khi đã cọc. Hợp đồng gốc không bị sửa; mỗi thay đổi là một phụ lục có lý do và hai bên cùng duyệt."
      requireFull
    >
      {(proposal, reloadBooking) => (
        <AppendicesWorkspace proposal={proposal} reloadBooking={reloadBooking} />
      )}
    </CouplePage>
  );
}

/** Các dòng của thoả thuận đang hiệu lực: phụ lục đã duyệt gần nhất, hoặc hợp đồng gốc. */
function effectiveLines(
  appendices: AppendixList,
  contracts: ContractList,
): readonly ContractLine[] {
  const appendix = appendices.revisions.find(
    (revision) => revision.revisionId === appendices.effectiveRevisionId,
  );
  if (appendix) return appendix.document.afterLines;
  const contract = contracts.revisions.find(
    (revision) => revision.revisionId === appendices.effectiveRevisionId,
  );
  return contract?.document.lines ?? [];
}

function AppendicesWorkspace({
  proposal,
  reloadBooking,
}: Readonly<{ proposal: Proposal; reloadBooking: () => void }>) {
  const bookingId = proposal.bookingId;
  const [data, setData] = useState<{ appendices: AppendixList; contracts: ContractList } | null>(
    null,
  );
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const command = useCommand();
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    authorizedRead(async (token) => {
      const [appendices, contracts] = await Promise.all([
        appendixApi.list(token, bookingId),
        contractApi.list(token, bookingId),
      ]);
      return { appendices, contracts };
    })
      .then((next) => {
        if (!active) return;
        setData(next);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(describeApiError(error));
      });
    return () => {
      active = false;
    };
  }, [bookingId, reloadKey]);

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!data) return <Skeleton label="Đang tải phụ lục…" />;

  const { appendices } = data;
  const lines = effectiveLines(appendices, data.contracts);
  const current =
    appendices.revisions.find((revision) => revision.revisionId === appendices.currentRevisionId) ??
    null;
  const open =
    current !== null && (current.state === 'DRAFT' || current.state === 'AWAITING_APPROVAL');
  const after = (result: unknown) => {
    if (!result) return;
    setCreating(false);
    reload();
    reloadBooking();
  };

  return (
    <>
      <section className="cw-card">
        <div className="cw-card-header">
          <h2>Thoả thuận đang hiệu lực</h2>
          <strong>{formatVnd(appendices.effectiveTotalVnd)}</strong>
        </div>
        <ContractLinesTable
          lines={lines}
          totalVnd={appendices.effectiveTotalVnd}
          totalLabel="Tổng thoả thuận"
        />
        <p className="cw-note">
          Phụ lục không thu thêm tiền cọc; chênh lệch được cộng/trừ vào số tiền còn phải thanh toán.
          Chi phí phát sinh trong tiệc do nhà hàng ghi nhận riêng sau khi tiệc kết thúc.
        </p>
        {!open && !creating ? (
          <div className="cw-actions">
            <button
              className="button"
              type="button"
              onClick={() => {
                setCreating(true);
                if (!catalog)
                  void authorizedRead((token) => contractApi.catalog(token))
                    .then(setCatalog)
                    .catch((error: unknown) => command.setError(describeApiError(error)));
              }}
            >
              Tạo phụ lục thay đổi
            </button>
          </div>
        ) : null}
        {creating ? (
          catalog ? (
            <LineSelector
              catalog={catalog}
              initialLines={lines}
              frozenLines={lines}
              maxGuests={proposal.proposal.hall.maxGuests}
              planningHeadcount={proposal.planningHeadcount}
              pending={command.pending}
              submitLabel="Lưu phụ lục nháp"
              extraFields={
                <label>
                  Lý do thay đổi
                  <textarea
                    name="reason"
                    required
                    maxLength={500}
                    rows={2}
                    placeholder="Ví dụ: Bổ sung 2 bàn theo thoả thuận ngày 20/10"
                  />
                </label>
              }
              onSubmit={(nextLines, form) =>
                void command
                  .run(
                    (token, key) =>
                      appendixApi.create(token, key, bookingId, {
                        expectedRevision: appendices.bookingRevision,
                        predecessorRevisionId: appendices.effectiveRevisionId,
                        reason: formText(form, 'reason'),
                        lines: nextLines,
                      }),
                    'Đã lưu phụ lục nháp. Kiểm tra chênh lệch rồi gửi duyệt.',
                  )
                  .then(after)
              }
            />
          ) : (
            <Skeleton label="Đang tải danh mục…" variant="card" />
          )
        ) : null}
        <CommandFeedback error={command.error} notice={command.notice} />
      </section>

      {current ? (
        <section className="cw-card">
          <div className="cw-card-header">
            <h2>Phụ lục số {current.revisionNumber}</h2>
            <span className="status status-champagne">{stateLabels[current.state]}</span>
          </div>
          <p>
            <strong>Lý do:</strong> {current.document.reason}
          </p>
          <div className="cw-grid">
            <div>
              <h3>Trước</h3>
              <ContractLinesTable
                lines={current.document.beforeLines}
                totalVnd={current.document.beforeTotalVnd}
                totalLabel="Tổng trước"
              />
            </div>
            <div>
              <h3>Sau</h3>
              <ContractLinesTable
                lines={current.document.afterLines}
                totalVnd={current.document.afterTotalVnd}
                totalLabel="Tổng sau"
              />
            </div>
          </div>
          <p className="cw-note">
            Chênh lệch:{' '}
            <strong>
              {current.document.deltaVnd > 0 ? '+' : ''}
              {formatVnd(current.document.deltaVnd)}
            </strong>{' '}
            · Nhà hàng duyệt:{' '}
            {current.approvals.some((a) => a.party === 'MANAGER') ? 'rồi' : 'chưa'} · Hai bạn duyệt:{' '}
            {current.approvals.some((a) => a.party === 'COUPLE') ? 'rồi' : 'chưa'}
          </p>
          <div className="cw-actions">
            {current.state === 'DRAFT' ? (
              <button
                className="button"
                type="button"
                disabled={command.pending}
                onClick={() =>
                  void command
                    .run(
                      (token, key) =>
                        appendixApi.submit(
                          token,
                          key,
                          bookingId,
                          current.revisionId,
                          appendices.bookingRevision,
                        ),
                      'Đã gửi phụ lục để hai bên duyệt.',
                    )
                    .then(after)
                }
              >
                Gửi duyệt
              </button>
            ) : null}
            {current.state === 'AWAITING_APPROVAL' &&
            !current.approvals.some((a) => a.party === 'COUPLE') ? (
              <button
                className="button"
                type="button"
                disabled={command.pending}
                onClick={() => {
                  if (!window.confirm('Xác nhận hai bạn đồng ý với phụ lục này?')) return;
                  void command
                    .run(
                      (token, key) =>
                        appendixApi.approve(
                          token,
                          key,
                          bookingId,
                          current.revisionId,
                          appendices.bookingRevision,
                        ),
                      'Đã duyệt phụ lục.',
                    )
                    .then(after);
                }}
              >
                Duyệt phụ lục
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {appendices.revisions.length > 0 ? (
        <section className="cw-card">
          <h2>Lịch sử phụ lục</h2>
          <ul className="cw-list">
            {appendices.revisions.map((revision) => (
              <li key={revision.revisionId}>
                #{revision.revisionNumber} · {stateLabels[revision.state]} ·{' '}
                {formatDateTime(revision.createdAt)} · {revision.document.deltaVnd > 0 ? '+' : ''}
                {formatVnd(revision.document.deltaVnd)} · {revision.document.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
