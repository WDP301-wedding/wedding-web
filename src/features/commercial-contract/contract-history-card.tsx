'use client';

import React from 'react';
import { openBlob } from '../../lib/api/download';
import {
  formatDateTime,
  formatVnd,
  useCommand,
} from '../couple-workspace/use-couple-workspace';
import {
  contractApi,
  type ContractList,
  type ContractRevision,
} from './contract-api';

export const stateLabels: Record<ContractRevision['state'], string> = {
  DRAFT: 'Bản nháp',
  AWAITING_APPROVAL: 'Chờ hai bên duyệt',
  APPROVED: 'Đã duyệt',
  SUPERSEDED: 'Đã được thay thế',
};

export interface HistoryCardProps {
  contracts: ContractList;
  bookingId: string;
}

export function HistoryCard({ contracts, bookingId }: HistoryCardProps) {
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
