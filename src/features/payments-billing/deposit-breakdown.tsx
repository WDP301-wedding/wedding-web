'use client';

import type { BillingContext } from './billing-api';
import { money } from './billing-display';
import { formatEventDate } from '../couple-workspace/workspace-helpers';
import { ContractLinesTable } from '../commercial-contract/contract-lines-table';
import styles from './deposit.module.css';

/** Display the exact server snapshots used for the deposit; do not recalculate prices here. */
export function DepositBreakdown({ context }: Readonly<{ context: BillingContext }>) {
  const details = context.depositDetails;
  if (!details)
    return (
      <div className={styles.breakdown}>
        <h3>Chi phí làm căn cứ đặt cọc</h3>
        <p>
          Chưa có chi tiết chi phí trong dữ liệu thanh toán hiện tại. Xem thỏa thuận hoặc liên hệ
          nhà hàng để đối chiếu trước khi thanh toán.
        </p>
      </div>
    );
  const proposal = details.proposal;
  const document = details.approvedContract?.document;
  const eventDate = document?.eventDate ?? proposal.eventDate;
  const hallName = document?.hallName ?? proposal.proposal.hall.name;
  const startTime = document?.shiftStartTime ?? proposal.proposal.shift.startTime;
  const endTime = document?.shiftEndTime ?? proposal.proposal.shift.endTime;
  const menus = proposal.proposal.menus ?? [];
  return (
    <div className={styles.breakdown}>
      <header>
        <h3>Tiệc đang đặt cọc</h3>
        <p className={styles.venue}>{hallName}</p>
        <dl className={styles.event}>
          <div>
            <dt>Ngày tổ chức</dt>
            <dd>{formatEventDate(eventDate)}</dd>
          </div>
          <div>
            <dt>Ca tiệc</dt>
            <dd>
              {startTime}–{endTime}
            </dd>
          </div>
          <div>
            <dt>Số bàn</dt>
            <dd>{document?.tableCount ?? proposal.proposal.tableCount} bàn</dd>
          </div>
          <div>
            <dt>Khách dự kiến</dt>
            <dd>{document?.planningHeadcount ?? proposal.planningHeadcount} khách</dd>
          </div>
        </dl>
      </header>
      <div>
        <h3>{document ? 'Hạng mục trong hợp đồng đã duyệt' : 'Chi phí trong đề xuất'}</h3>
        <p className={styles.note}>
          {document
            ? `Theo bản hợp đồng số ${details.approvedContract.revisionNumber}. Các số tiền dưới đây do nhà hàng xác định cho đúng bản đã duyệt.`
            : 'Đây là các hạng mục đã ghi nhận trong đề xuất, chưa thay thế hợp đồng được hai bên duyệt.'}
        </p>
      </div>
      {document ? (
        <ContractLinesTable lines={document.lines} totalVnd={document.contractTotalVnd} />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.costTable}>
            <caption>Chi tiết thực đơn theo đề xuất</caption>
            <thead>
              <tr>
                <th scope="col">Thực đơn</th>
                <th scope="col">Số bàn</th>
                <th scope="col">Đơn giá/bàn</th>
                <th scope="col">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((menu) => (
                <tr key={`${menu.packageId}:${menu.versionId}`}>
                  <th scope="row">{menu.name}</th>
                  <td>{menu.tableCount}</td>
                  <td>{money(menu.priceVndPerTable)}</td>
                  <td>{money(menu.lineTotalVnd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3}>
                  Tổng theo đề xuất
                </th>
                <td>{money(proposal.proposal.baseChargeVnd)}</td>
              </tr>
            </tfoot>
          </table>
          {menus.length === 0 && (
            <p>
              Phiên bản dữ liệu này chưa có chi tiết từng dòng thực đơn. Thực đơn đã chọn:{' '}
              {proposal.proposal.menu.name}.
            </p>
          )}
        </div>
      )}
      {document && (
        <p className={styles.note}>
          {document.incidentalClause}. Tổng trên chỉ bao gồm các hạng mục đã ghi nhận trong hợp đồng
          này.
        </p>
      )}
      <p className={styles.note}>
        Khoản cọc áp dụng chung cho tiệc theo hồ sơ này, không chia thành khoản cọc riêng cho từng
        hạng mục. Chi tiết trên giúp hai bạn đối chiếu những chi phí đã được ghi nhận.
      </p>
    </div>
  );
}
