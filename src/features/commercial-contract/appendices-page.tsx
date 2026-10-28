'use client';

import { LiveUpdateNotice } from '../realtime/use-live-refresh';
import { CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import { formatVnd, type Proposal } from '../couple-workspace/use-couple-workspace';
import { ContractLinesTable, LineSelector } from './contract-lines';
import { Skeleton } from '../../design-system/skeleton';
import { useAppendicesWorkspace } from './use-appendices-workspace';
import { AppendixCurrentCard, AppendixHistoryCard } from './appendix-cards';

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
        <AppendicesWorkspace
          key={proposal.bookingId}
          proposal={proposal}
          reloadBooking={reloadBooking}
        />
      )}
    </CouplePage>
  );
}

function AppendicesWorkspace({
  proposal,
  reloadBooking,
}: Readonly<{ proposal: Proposal; reloadBooking: () => void }>) {
  const {
    appendices,
    lines,
    current,
    open,
    isClosed,
    catalog,
    creating,
    catalogError,
    loadError,
    command,
    dialog,
    live,
    reload,
    loadCatalog,
    handleStartCreate,
    handleCancelCreate,
    handleCreateDraft,
    handleSubmitAppendix,
    handleApproveAppendix,
  } = useAppendicesWorkspace(proposal, reloadBooking);

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!appendices) return <Skeleton label="Đang tải phụ lục…" />;

  return (
    <>
      <LiveUpdateNotice waiting={live.waiting} />
      {creating && command.error ? <ErrorPanel error={command.error} /> : null}
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
        {isClosed ? (
          <p className="cw-note">
            Tiệc cưới đã hoàn thành tất toán. Hợp đồng gốc và các phụ lục đã được chốt và lưu trữ.
          </p>
        ) : null}
        {!open && !creating && !isClosed ? (
          <div className="cw-actions">
            <button className="button" type="button" onClick={handleStartCreate}>
              Tạo phụ lục thay đổi
            </button>
          </div>
        ) : null}
        {creating ? (
          <button
            className="button button-secondary"
            type="button"
            disabled={command.pending}
            onClick={handleCancelCreate}
          >
            Hủy chỉnh sửa
          </button>
        ) : null}
        {creating ? (
          catalogError ? (
            <ErrorPanel error={catalogError} onRetry={() => void loadCatalog()} />
          ) : catalog ? (
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
              onSubmit={handleCreateDraft}
            />
          ) : (
            <Skeleton label="Đang tải danh mục…" variant="card" />
          )
        ) : null}
      </section>

      {current ? (
        <AppendixCurrentCard
          current={current}
          isClosed={isClosed}
          pending={command.pending}
          onSubmit={handleSubmitAppendix}
          onApprove={(curr) => void handleApproveAppendix(curr)}
        />
      ) : null}

      <AppendixHistoryCard appendices={appendices} />
      {dialog}
    </>
  );
}
