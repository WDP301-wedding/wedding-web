import React from 'react';
import { formatVnd } from '../couple-workspace/use-couple-workspace';
import type { ContractLine } from './contract-api';
import { cx } from './contract-classes';

export const categoryLabels: Record<ContractLine['category'], string> = {
  MENU: 'Thực đơn',
  PRINT: 'In thiệp',
  SERVICE: 'Dịch vụ',
};

const unitLabels: Record<string, string> = { table: 'bàn', copy: 'bản' };
export const unitLabel = (unit: string) => unitLabels[unit] ?? unit;
// BE ghép mã mẫu (UUID) vào cuối mô tả dòng thiệp in; không hiện mã kỹ thuật này cho người dùng.
export const lineDescription = (text: string) =>
  text.replace(/ · [0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/iu, '');

/** Bảng các dòng hợp đồng/phụ lục. Thành tiền và tổng lấy NGUYÊN từ backend. */
export function ContractLinesTable({
  lines,
  totalVnd,
  totalLabel = 'Tổng hợp đồng',
}: Readonly<{ lines: readonly ContractLine[]; totalVnd: number; totalLabel?: string }>) {
  return (
    <div className={cx.tableWrap} tabIndex={0} role="region" aria-label="Các hạng mục hợp đồng">
      <table className={cx.table}>
        <thead>
          <tr>
            <th scope="col">Hạng mục</th>
            <th scope="col">Tên</th>
            <th scope="col" className={cx.num}>
              Số lượng
            </th>
            <th scope="col" className={cx.num}>
              Đơn giá
            </th>
            <th scope="col" className={cx.num}>
              Thành tiền
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={`${line.category}:${line.sourceId}`}>
              <td>{categoryLabels[line.category]}</td>
              <td>
                <div className="flex flex-wrap items-center gap-1.5">
                  <strong>{line.name}</strong>
                </div>
                {line.description ? (
                  <p className={cx.muted}>{lineDescription(line.description)}</p>
                ) : null}
              </td>
              <td className={cx.num}>
                {line.quantity} {unitLabel(line.unit)}
              </td>
              <td className={cx.num}>{formatVnd(line.unitPriceVnd)}</td>
              <td className={cx.num}>{formatVnd(line.lineTotalVnd)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>{totalLabel}</td>
            <td className={cx.num}>{formatVnd(totalVnd)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
