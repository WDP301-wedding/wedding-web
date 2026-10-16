'use client';

import { useState } from 'react';

import { formatVnd } from '../couple-workspace/use-couple-workspace';
import type { Catalog, ContractLine, ContractLineInput } from './contract-api';

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
              <td>{line.name}</td>
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

type Selection = Record<string, number>; // key = `${category}:${sourceId}` → số lượng (0 = không chọn)

const keyOf = (category: ContractLineInput['category'], sourceId: string) =>
  `${category}:${sourceId}`;

/**
 * Bộ chọn hạng mục cho hợp đồng/phụ lục.
 *
 * Chỉ gửi lên `sourceId`, `sourceRevisionId` (phiên bản giá đang bán) và `quantity`.
 * KHÔNG tính tổng ở client: backend tra giá chính thức và trả về thành tiền. Nếu giá trong danh mục
 * thay đổi giữa chừng, backend trả `COMMERCIAL_PRICE_REVISION_STALE` và người dùng chọn lại.
 */
export function LineSelector({
  catalog,
  initialLines,
  maxGuests,
  planningHeadcount,
  submitLabel,
  pending,
  extraFields,
  frozenLines,
  onSubmit,
}: Readonly<{
  catalog: Catalog;
  /**
   * Chỉ dùng cho PHỤ LỤC: các dòng của thoả thuận đang hiệu lực. Dòng nào giữ lại sẽ gửi đúng
   * `sourceRevisionId` đã chốt (giá cũ được giữ), kể cả hạng mục nay đã ngừng bán.
   */
  frozenLines?: readonly ContractLine[];
  initialLines: readonly {
    category: ContractLineInput['category'];
    sourceId: string;
    quantity: number;
  }[];
  maxGuests: number;
  planningHeadcount: number;
  submitLabel: string;
  pending: boolean;
  extraFields?: React.ReactNode;
  onSubmit: (lines: ContractLineInput[], form: FormData) => void;
}>) {
  const [selection, setSelection] = useState<Selection>(() =>
    Object.fromEntries(
      initialLines.map((line) => [keyOf(line.category, line.sourceId), line.quantity]),
    ),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  // Dòng cũ có sourceId không còn trong danh mục đang bán → báo để người dùng biết phải chọn lại.
  const sellable = new Set([
    ...catalog.menus.map((item) => keyOf('MENU', item.id)),
    ...catalog.services.map((item) => keyOf('SERVICE', item.serviceId)),
    ...catalog.prints.map((item) => keyOf('PRINT', item.offeringId)),
  ]);
  const missing = frozenLines
    ? []
    : initialLines.filter((line) => !sellable.has(keyOf(line.category, line.sourceId)));
  const frozen = new Map(
    (frozenLines ?? []).map((line) => [keyOf(line.category, line.sourceId), line]),
  );
  const frozenOnly = (frozenLines ?? []).filter(
    (line) => !sellable.has(keyOf(line.category, line.sourceId)),
  );
  /** Ưu tiên phiên bản giá đã chốt (phụ lục), nếu không thì dùng phiên bản đang bán. */
  const revisionFor = (
    category: ContractLineInput['category'],
    sourceId: string,
    current: string,
  ) => frozen.get(keyOf(category, sourceId))?.sourceRevisionId ?? current;

  const quantityInput = (
    category: ContractLineInput['category'],
    sourceId: string,
    label: string,
  ) => {
    const key = keyOf(category, sourceId);
    return (
      <input
        aria-label={`Số lượng ${label}`}
        className="cw-inline-input"
        inputMode="numeric"
        min={0}
        max={10000}
        type="number"
        value={selection[key] ?? 0}
        onChange={(event) => {
          const value = Number.parseInt(event.target.value || '0', 10);
          setSelection((previous) => ({
            ...previous,
            [key]: Number.isNaN(value) ? 0 : Math.max(0, value),
          }));
        }}
      />
    );
  };

  const buildLines = (): ContractLineInput[] => {
    const lines: ContractLineInput[] = [];
    for (const menu of catalog.menus) {
      const quantity = selection[keyOf('MENU', menu.id)] ?? 0;
      if (quantity > 0)
        lines.push({
          category: 'MENU',
          sourceId: menu.id,
          sourceRevisionId: revisionFor('MENU', menu.id, menu.versionId),
          quantity,
        });
    }
    for (const service of catalog.services) {
      const quantity = selection[keyOf('SERVICE', service.serviceId)] ?? 0;
      if (quantity > 0)
        lines.push({
          category: 'SERVICE',
          sourceId: service.serviceId,
          sourceRevisionId: revisionFor('SERVICE', service.serviceId, service.sourceRevisionId),
          quantity,
        });
    }
    for (const print of catalog.prints) {
      const quantity = selection[keyOf('PRINT', print.offeringId)] ?? 0;
      if (quantity > 0)
        lines.push({
          category: 'PRINT',
          sourceId: print.offeringId,
          sourceRevisionId: revisionFor('PRINT', print.offeringId, print.sourceRevisionId),
          quantity,
        });
    }
    for (const line of frozenOnly) {
      const quantity = selection[keyOf(line.category, line.sourceId)] ?? 0;
      if (quantity > 0)
        lines.push({
          category: line.category,
          sourceId: line.sourceId,
          sourceRevisionId: line.sourceRevisionId,
          quantity,
        });
    }
    return lines;
  };

  const tableCount =
    catalog.menus.reduce((sum, menu) => sum + (selection[keyOf('MENU', menu.id)] ?? 0), 0) +
    frozenOnly
      .filter((line) => line.category === 'MENU')
      .reduce((sum, line) => sum + (selection[keyOf('MENU', line.sourceId)] ?? 0), 0);

  return (
    <form
      className="cw-form"
      onSubmit={(event) => {
        event.preventDefault();
        const lines = buildLines();
        // Kiểm tra nhanh ở client để báo sớm; backend vẫn kiểm tra lại đầy đủ (sức chứa, giá…).
        if (!lines.some((line) => line.category === 'MENU')) {
          setLocalError('Cần chọn ít nhất một thực đơn (số bàn > 0).');
          return;
        }
        if (tableCount > 500) {
          setLocalError('Tổng số bàn tối đa là 500.');
          return;
        }
        setLocalError(null);
        onSubmit(lines, new FormData(event.currentTarget));
      }}
    >
      <p className="cw-note">
        Sảnh chứa tối đa {maxGuests} khách · số khách dự kiến hiện tại {planningHeadcount}. Đơn giá
        lấy theo danh mục đang bán; thành tiền và tổng do hệ thống tính sau khi lưu.
      </p>
      {missing.length > 0 ? (
        <p className="cw-alert">
          Có {missing.length} hạng mục trong bản trước không còn trong danh mục đang bán (hoặc đã
          đổi giá). Hãy chọn lại hạng mục thay thế.
        </p>
      ) : null}

      <SelectorTable title="Thực đơn (số bàn)" emptyText="Nhà hàng chưa mở thực đơn nào.">
        {catalog.menus.map((menu) => (
          <tr key={menu.id}>
            <td>
              <strong>{menu.name}</strong>
              <br />
              <small>{menu.description}</small>
            </td>
            <td className="num">
              {formatVnd(frozen.get(keyOf('MENU', menu.id))?.unitPriceVnd ?? menu.priceVndPerTable)}{' '}
              / bàn
            </td>
            <td className="num">{quantityInput('MENU', menu.id, menu.name)}</td>
          </tr>
        ))}
      </SelectorTable>
      <p className="cw-note">Tổng số bàn đang chọn: {tableCount}</p>

      <SelectorTable title="Dịch vụ đi kèm" emptyText="Chưa có dịch vụ đi kèm.">
        {catalog.services.map((service) => (
          <tr key={service.serviceId}>
            <td>
              <strong>{service.name}</strong>
              <br />
              <small>{service.description}</small>
            </td>
            <td className="num">
              {formatVnd(
                frozen.get(keyOf('SERVICE', service.serviceId))?.unitPriceVnd ??
                  service.unitPriceVnd,
              )}{' '}
              / {unitLabel(service.unit)}
            </td>
            <td className="num">{quantityInput('SERVICE', service.serviceId, service.name)}</td>
          </tr>
        ))}
      </SelectorTable>

      <SelectorTable title="In thiệp (số bản)" emptyText="Chưa có mẫu in nào.">
        {catalog.prints.map((print) => (
          <tr key={print.offeringId}>
            <td>
              <strong>{print.name}</strong>
              <br />
              <small>
                Mẫu {print.templateTitle} · {print.printType} · {print.material}
              </small>
            </td>
            <td className="num">
              {formatVnd(
                frozen.get(keyOf('PRINT', print.offeringId))?.unitPriceVnd ?? print.unitPriceVnd,
              )}{' '}
              / bản
            </td>
            <td className="num">{quantityInput('PRINT', print.offeringId, print.name)}</td>
          </tr>
        ))}
      </SelectorTable>

      {frozenOnly.length > 0 ? (
        <SelectorTable title="Hạng mục đã chốt (nay không còn bán)" emptyText="">
          {frozenOnly.map((line) => (
            <tr key={keyOf(line.category, line.sourceId)}>
              <td>
                <strong>{line.name}</strong>
                <br />
                <small>{categoryLabels[line.category]} · giữ giá đã chốt</small>
              </td>
              <td className="num">
                {formatVnd(line.unitPriceVnd)} / {unitLabel(line.unit)}
              </td>
              <td className="num">{quantityInput(line.category, line.sourceId, line.name)}</td>
            </tr>
          ))}
        </SelectorTable>
      ) : null}
      {frozenLines ? (
        <p className="cw-note">Hạng mục đã có trong thoả thuận được giữ nguyên đơn giá đã chốt.</p>
      ) : null}
      {extraFields}
      {localError ? (
        <p className="cw-alert" role="alert">
          {localError}
        </p>
      ) : null}
      <div className="cw-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? 'Đang lưu…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function SelectorTable({
  title,
  emptyText,
  children,
}: Readonly<{ title: string; emptyText: string; children: React.ReactNode[] }>) {
  return (
    <fieldset className="cw-card" style={{ padding: 16 }}>
      <legend>
        <strong>{title}</strong>
      </legend>
      {children.length === 0 ? (
        <p className="cw-note">{emptyText}</p>
      ) : (
        <div className="cw-table-wrap">
          <table className="cw-table">
            <thead>
              <tr>
                <th scope="col">Hạng mục</th>
                <th scope="col" className="num">
                  Đơn giá
                </th>
                <th scope="col" className="num">
                  Số lượng
                </th>
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </fieldset>
  );
}
