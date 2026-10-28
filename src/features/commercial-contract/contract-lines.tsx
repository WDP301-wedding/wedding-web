'use client';

import React from 'react';
import { formatVnd } from '../couple-workspace/use-couple-workspace';
import type { ContractPreview } from './contract-preview-api';
import type { Catalog, ContractLine, ContractLineInput } from './contract-api';
import {
  categoryLabels,
  ContractLinesTable,
  unitLabel,
} from './contract-lines-table';
import { SelectorTable } from './line-selector-table';
import { LineSelectorPreview } from './line-selector-preview';
import { keyOf, useLineSelector } from './use-line-selector';

export { categoryLabels, ContractLinesTable, unitLabel };

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
  onPreview,
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
  onPreview?: (lines: ContractLineInput[]) => Promise<ContractPreview>;
}>) {
  const {
    selection,
    setItemQuantity,
    frozen,
    frozenOnly,
    missing,
    tableCount,
    preview,
    previewCurrent,
    previewPending,
    previewError,
    localError,
    requestPreview,
    handleSubmit,
  } = useLineSelector({
    catalog,
    initialLines,
    frozenLines,
    onPreview,
    onSubmit,
  });

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
          setItemQuantity(key, value);
        }}
      />
    );
  };

  return (
    <form className="cw-form" onSubmit={handleSubmit}>
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

      {onPreview ? (
        <LineSelectorPreview
          preview={preview}
          previewCurrent={previewCurrent}
          previewPending={previewPending}
          previewError={previewError}
          pending={pending}
          onRequestPreview={() => void requestPreview()}
        />
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
