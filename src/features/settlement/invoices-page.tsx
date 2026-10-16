'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import type { ApiData } from '../../lib/api/types';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import {
  authorizedRead,
  bearer,
  coupleApi,
  formatDateTime,
  formatVnd,
  unwrap,
  type Proposal,
} from '../couple-workspace/use-couple-workspace';
import { ContractLinesTable } from '../commercial-contract/contract-lines';
import { Skeleton } from '../../design-system/skeleton';

type Expenses = ApiData<'/bookings/{bookingId}/incidental-expenses', 'get'>;
type InvoiceList = ApiData<'/bookings/{bookingId}/final-invoices', 'get'>;
type Invoice = InvoiceList['revisions'][number];
type Billing = ApiData<'/bookings/{bookingId}/billing', 'get'>;

const settlementApi = {
  async expenses(token: string, bookingId: string) {
    return unwrap<Expenses>(
      await coupleApi().GET('/bookings/{bookingId}/incidental-expenses', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
  async invoices(token: string, bookingId: string) {
    return unwrap<InvoiceList>(
      await coupleApi().GET('/bookings/{bookingId}/final-invoices', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
  async billing(token: string, bookingId: string) {
    return unwrap<Billing>(
      await coupleApi().GET('/bookings/{bookingId}/billing', {
        headers: bearer(token),
        params: { path: { bookingId }, query: { limit: 1 } },
        cache: 'no-store',
      }),
    );
  },
};

export function InvoicesPage() {
  return (
    <CouplePage
      active="invoices"
      eyebrow="Quyết toán"
      title="Chi phí phát sinh & hoá đơn"
      description="Nhà hàng ghi nhận chi phí phát sinh sau khi tiệc kết thúc và chốt hoá đơn cuối. Hai bạn xem chi tiết và thanh toán phần còn lại."
      requireFull
    >
      {(proposal) => <SettlementWorkspace proposal={proposal} />}
    </CouplePage>
  );
}

function SettlementWorkspace({ proposal }: Readonly<{ proposal: Proposal }>) {
  const bookingId = proposal.bookingId;
  const [data, setData] = useState<{
    expenses: Expenses;
    invoices: InvoiceList;
    billing: Billing;
  } | null>(null);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    authorizedRead(async (token) => {
      const [expenses, invoices, billing] = await Promise.all([
        settlementApi.expenses(token, bookingId),
        settlementApi.invoices(token, bookingId),
        settlementApi.billing(token, bookingId),
      ]);
      return { expenses, invoices, billing };
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
  if (!data) return <Skeleton label="Đang tải quyết toán…" />;

  const current =
    data.invoices.revisions.find(
      (revision) => revision.invoiceRevisionId === data.invoices.currentRevisionId,
    ) ?? null;
  const totals = data.billing.totals;

  return (
    <>
      <section className="cw-card" aria-label="Công nợ hiện tại">
        <dl className="cw-stats">
          <div>
            <dt>Tổng phải thanh toán (đã ghi nhận)</dt>
            <dd>{formatVnd(totals.acceptedChargesVnd)}</dd>
          </div>
          <div>
            <dt>Đã thanh toán (sau hoàn)</dt>
            <dd>{formatVnd(totals.netPaidVnd)}</dd>
          </div>
          <div>
            <dt>Còn phải thanh toán</dt>
            <dd>{formatVnd(totals.outstandingVnd)}</dd>
          </div>
          <div>
            <dt>Thanh toán thừa (credit)</dt>
            <dd>{formatVnd(totals.creditVnd)}</dd>
          </div>
        </dl>
        <div className="cw-actions">
          <Link className="button" href={`/billing?bookingId=${bookingId}`}>
            {totals.outstandingVnd > 0 ? 'Thanh toán phần còn lại' : 'Xem lịch sử thanh toán'}
          </Link>
        </div>
        {totals.creditVnd > 0 ? (
          <p className="cw-note">
            Hai bạn đã thanh toán thừa. Nhà hàng sẽ duyệt và hoàn tiền thủ công kèm chứng từ (không
            hoàn tự động qua VNPay).
          </p>
        ) : null}
      </section>

      <section className="cw-card">
        <div className="cw-card-header">
          <h2>Chi phí phát sinh</h2>
          <span className="status status-muted">
            {data.expenses.finalized ? 'Đã chốt' : 'Nhà hàng đang ghi nhận'}
          </span>
        </div>
        {data.expenses.lines.length === 0 ? (
          <p className="cw-note">Chưa có chi phí phát sinh nào.</p>
        ) : (
          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead>
                <tr>
                  <th scope="col">Khoản</th>
                  <th scope="col" className="num">
                    Số lượng
                  </th>
                  <th scope="col" className="num">
                    Đơn giá
                  </th>
                  <th scope="col" className="num">
                    Thành tiền
                  </th>
                  <th scope="col">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.name}</td>
                    <td className="num">
                      {line.quantity} {line.unit}
                    </td>
                    <td className="num">{formatVnd(line.unitPriceVnd)}</td>
                    <td className="num">{formatVnd(line.totalVnd)}</td>
                    <td>{line.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Tổng phát sinh</td>
                  <td className="num">{formatVnd(data.expenses.totalVnd)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="cw-note">
          Chi phí phát sinh do nhà hàng nhập; hai bạn chỉ xem, không cần duyệt.
        </p>
      </section>

      {current ? (
        <InvoiceCard invoice={current} />
      ) : (
        <section className="cw-card cw-empty">
          <h2>Chưa có hoá đơn cuối</h2>
          <p>Nhà hàng sẽ chốt hoá đơn sau khi tiệc kết thúc và đã ghi nhận đủ chi phí phát sinh.</p>
        </section>
      )}

      {data.invoices.revisions.length > 1 ? (
        <section className="cw-card">
          <h2>Các phiên bản hoá đơn</h2>
          <ul className="cw-list">
            {data.invoices.revisions.map((revision) => (
              <li key={revision.invoiceRevisionId}>
                {revision.invoiceNumber} · bản {revision.revisionNumber} ·{' '}
                {formatDateTime(revision.issuedAt)} · {formatVnd(revision.document.totalVnd)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function InvoiceCard({ invoice }: Readonly<{ invoice: Invoice }>) {
  const document = invoice.document;
  return (
    <section className="cw-card">
      <div className="cw-card-header">
        <h2>Hoá đơn {invoice.invoiceNumber}</h2>
        <span className="muted">
          Bản {invoice.revisionNumber} · chốt lúc {formatDateTime(invoice.issuedAt)}
        </span>
      </div>
      <h3>Hợp đồng gốc</h3>
      <ContractLinesTable
        lines={document.contract.document.lines}
        totalVnd={document.contract.document.contractTotalVnd}
      />
      {document.appendices.length > 0 ? (
        <>
          <h3>Phụ lục đã duyệt</h3>
          <ul>
            {document.appendices.map((appendix) => (
              <li key={appendix.revisionId}>
                {appendix.document.reason}: {appendix.document.deltaVnd > 0 ? '+' : ''}
                {formatVnd(appendix.document.deltaVnd)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {document.adjustments.length > 0 ? (
        <>
          <h3>Điều chỉnh sau khi chốt</h3>
          <ul>
            {document.adjustments.map((adjustment) => (
              <li key={adjustment.id}>
                {formatDateTime(adjustment.occurredAt)} · {adjustment.reason}:{' '}
                {adjustment.deltaVnd > 0 ? '+' : ''}
                {formatVnd(adjustment.deltaVnd)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <dl className="cw-stats">
        <div>
          <dt>Tổng thoả thuận (hợp đồng + phụ lục)</dt>
          <dd>{formatVnd(document.commercialTotalVnd)}</dd>
        </div>
        <div>
          <dt>Chi phí phát sinh</dt>
          <dd>{formatVnd(document.incidentalTotalVnd)}</dd>
        </div>
        <div>
          <dt>Tổng hoá đơn</dt>
          <dd>{formatVnd(document.totalVnd)}</dd>
        </div>
      </dl>
      <p className="cw-note">
        Hoá đơn đã chốt không bị sửa; mọi thay đổi sau đó được ghi thành bản điều chỉnh có lý do.
      </p>
    </section>
  );
}
