import React from 'react';
import { formatVnd } from '../couple-workspace/use-couple-workspace';
import type { ContractLine } from './contract-api';

export const categoryLabels: Record<ContractLine['category'], string> = {
  MENU: 'Thực đơn',
  PRINT: 'In thiệp',
  SERVICE: 'Dịch vụ',
};

const unitLabels: Record<string, string> = { table: 'bàn', copy: 'bản' };
export const unitLabel = (unit: string) => unitLabels[unit] ?? unit;

/** Bảng các dòng hợp đồng/phụ lục. Thành tiền và tổng lấy NGUYÊN từ backend. */
export function ContractLinesTable({
  lines,
  totalVnd,
  totalLabel = 'Tổng hợp đồng',
}: Readonly<{ lines: readonly ContractLine[]; totalVnd: number; totalLabel?: string }>) {
  return (
    <div className="cw-table-wrap">
      <table className="cw-table">
        <thead>
          <tr>
            <th scope="col">Hạng mục</th>
            <th scope="col">Tên</th>
            <th scope="col" className="num">
              Số lượng
            </th>
            <th scope="col" className="num">
              Đơn giá
            </th>
            <th scope="col" className="num">
              Thành tiền
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={`${line.category}:${line.sourceId}`}>
              <td>{categoryLabels[line.category]}</td>
              <td>
                <strong>{line.name}</strong>
                {line.description ? <p className="muted">{line.description}</p> : null}
              </td>
              <td className="num">
                {line.quantity} {unitLabel(line.unit)}
              </td>
              <td className="num">{formatVnd(line.unitPriceVnd)}</td>
              <td className="num">{formatVnd(line.lineTotalVnd)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>{totalLabel}</td>
            <td className="num">{formatVnd(totalVnd)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
