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

/**
 * Nhận diện hạng mục bảo đảm giá thực đơn.
 *
 * TODO(BE): Khi BE bổ sung trường `priceGuarantee: boolean` trên contract line,
 * FE chỉ cần đọc `line.priceGuarantee === true` và loại bỏ toàn bộ string matching.
 */
export function isPriceGuarantee(line: {
  name: string;
  description?: string | null;
  priceGuarantee?: boolean | null;
}): boolean {
  if (typeof line.priceGuarantee === 'boolean') return line.priceGuarantee;
  const text = `${line.name} ${line.description || ''}`.toLowerCase();
  return (
    text.includes('bảo đảm giá') ||
    text.includes('bao dam gia') ||
    text.includes('bảo hiểm giá') ||
    text.includes('giữ giá') ||
    text.includes('khóa giá') ||
    text.includes('price guarantee') ||
    text.includes('price lock')
  );
}

/** Bảng các dòng hợp đồng/phụ lục. Thành tiền và tổng lấy NGUYÊN từ backend. */
export function ContractLinesTable({
  lines,
  totalVnd,
  totalLabel = 'Tổng hợp đồng',
}: Readonly<{ lines: readonly ContractLine[]; totalVnd: number; totalLabel?: string }>) {
  const hasPriceGuarantee = lines.some((l) => isPriceGuarantee(l));

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
                  {line.category === 'MENU' ? (
                    hasPriceGuarantee ? (
                      <span
                        className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-2xs font-semibold text-emerald-800"
                        title="Đã thanh toán phí bảo đảm để giữ nguyên giá thực đơn không thay đổi theo thời giá"
                      >
                        Đã bảo đảm giá
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-2xs font-semibold text-amber-800"
                        title="Giá thực đơn áp dụng theo thời giá tại thời điểm tổ chức tiệc"
                      >
                        Theo thời giá
                      </span>
                    )
                  ) : null}
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
