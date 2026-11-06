'use client';
import { useEffect, useMemo } from 'react';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { InlineError } from '../../design-system/inline-error';
import { formatVnd } from '../couple-workspace/use-couple-workspace';
import { currentRevision, type ContractList } from './contract-api';
import type { CustomerSelection, SelectionResult } from './selection-wire';
import { SelectionAccessNotice } from './selection-access-notice';
import {
  ContractLinesTable,
  categoryLabels,
  isPriceGuarantee,
  lineDescription,
  unitLabel,
} from './contract-lines-table';
import { useSelectionCatalog } from './use-selection-catalog';
import { selectionKey, useCustomerSelection } from './use-customer-selection';
import type { SelectionChoice } from './selection-catalog';
import type { ContractLineInput } from './contract-api';
import { cx } from './contract-classes';

type Props = {
  contracts: ContractList;
  bookingId: string;
  onChanged: (result?: SelectionResult) => void;
  onDirtyChange: (value: boolean) => void;
  onWritingChange: (value: boolean) => void;
};
export function CustomerSelections(props: Readonly<Props>) {
  const canEdit =
    props.contracts.customerSelection?.status !== 'SUBMITTED' &&
    props.contracts.selectionAccess?.canEdit === true &&
    props.contracts.capabilities?.canEditSelections === true;
  const catalog = useSelectionCatalog(canEdit);
  const selection = props.contracts.customerSelection;
  if (!selection) return null;
  const current = currentRevision(props.contracts);
  const changes =
    selection.status === 'SUBMITTED' && current
      ? changedLines(selection, current.document.lines)
      : [];
  return (
    <section className={cx.card} aria-labelledby="customer-selection-heading">
      <div className={cx.cardHeader}>
        <h2 id="customer-selection-heading">Lựa chọn thực đơn & dịch vụ</h2>
        <span className={cx.status}>
          {selection.status === 'SUBMITTED'
            ? 'Đã gửi nhà hàng'
            : selection.status === 'DRAFT'
              ? 'Bản nháp của bạn'
              : canEdit
                ? 'Chưa gửi lựa chọn'
                : 'Chỉ xem'}
        </span>
      </div>
      <p>
        Lựa chọn này giúp nhà hàng chuẩn bị hợp đồng. Gửi lựa chọn chưa phải là duyệt hợp đồng hay
        thanh toán.
      </p>
      {canEdit ? (
        <SelectionEditor
          key={selection.revisionId ?? 'initial'}
          {...props}
          catalog={catalog}
          selection={selection}
        />
      ) : (
        <>
          <ContractLinesTable
            lines={selection.lines}
            totalVnd={selection.totalVnd}
            totalLabel={
              selection.status === 'SUBMITTED'
                ? 'Tổng lựa chọn đã gửi'
                : 'Tổng theo đề xuất ban đầu'
            }
          />
          <SelectionAccessNotice
            access={props.contracts.selectionAccess}
            bookingId={props.bookingId}
            onRefresh={props.onChanged}
          />
        </>
      )}
      {changes.length ? (
        <aside className={cx.changes}>
          <h3>Nhà hàng đã điều chỉnh so với lựa chọn bạn gửi</h3>
          <ul>
            {changes.map((change) => (
              <li key={change.key}>{change.text}</li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="m-0">Đọc nội dung hợp đồng hiện tại trước khi duyệt.</p>
            <button
              type="button"
              className={cx.buttonOutline}
              onClick={() => {
                const target = document.getElementById('contract-heading');
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              Xem hợp đồng bên dưới ↓
            </button>
          </div>
        </aside>
      ) : null}
    </section>
  );
}

function PriceGuaranteeCard({
  choices,
  lines,
  busy,
  onUpdate,
  onRemove,
}: {
  choices: readonly SelectionChoice[];
  lines: readonly ContractLineInput[];
  busy: boolean;
  onUpdate: (choice: SelectionChoice, quantity: number) => void;
  onRemove: (line: ContractLineInput) => void;
}) {
  const guaranteeChoice = useMemo(
    () => choices.find((c) => isPriceGuarantee(c)),
    [choices],
  );
  const selectedGuaranteeLine = useMemo(
    () => lines.find((l) => guaranteeChoice && selectionKey(l) === selectionKey(guaranteeChoice)),
    [lines, guaranteeChoice],
  );
  const isGuaranteeActive = Boolean(selectedGuaranteeLine);

  // Tính tổng số bàn của các thực đơn đang chọn
  const hasMenu = lines.some((l) => l.category === 'MENU');
  const totalMenuTables = useMemo(
    () =>
      lines
        .filter((l) => l.category === 'MENU')
        .reduce((sum, l) => sum + (l.quantity || 0), 0),
    [lines],
  );

  // Nếu dịch vụ tính theo bàn (unit === 'table') thì gán bằng số bàn, ngược lại tính 1 gói
  const targetQuantity = guaranteeChoice?.unit === 'table' ? Math.max(1, totalMenuTables) : 1;

  // Tự động đồng bộ số lượng bàn bảo đảm giá khi khách thay đổi số bàn thực đơn
  // Hoặc tự động gỡ bỏ nếu khách xóa hết thực đơn khỏi hợp đồng
  useEffect(() => {
    if (!busy && guaranteeChoice && selectedGuaranteeLine) {
      if (!hasMenu) {
        onRemove(selectedGuaranteeLine);
      } else if (
        guaranteeChoice.unit === 'table' &&
        selectedGuaranteeLine.quantity !== targetQuantity &&
        targetQuantity > 0
      ) {
        onUpdate(guaranteeChoice, targetQuantity);
      }
    }
  }, [busy, hasMenu, guaranteeChoice, selectedGuaranteeLine, targetQuantity, onUpdate, onRemove]);

  return (
    <div className="my-4 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-1.5 text-base text-amber-900">
            <span>🛡️ Chính sách thực đơn theo thời giá &amp; Bảo đảm giá</span>
          </div>
          <p className="mt-1 text-xs text-amber-800 leading-relaxed max-w-2xl">
            Đơn giá thực đơn có thể biến động theo thời giá thị trường tại ngày tổ chức tiệc cưới. Hai bạn có thể đăng ký <strong>Gói phí bảo đảm giá thực đơn (+5%)</strong> để chốt cố định 100% đơn giá thực đơn, không lo biến động.
          </p>
        </div>
        {guaranteeChoice ? (
          <label
            className={`flex items-center gap-2 rounded-lg border border-amber-400 bg-white px-3 py-2 shadow-sm font-medium text-xs transition-colors ${
              (!hasMenu && !selectedGuaranteeLine) || busy
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer hover:bg-amber-50'
            }`}
            title={
              !hasMenu && !selectedGuaranteeLine
                ? 'Vui lòng chọn thực đơn trước khi đăng ký bảo đảm giá'
                : undefined
            }
          >
            <input
              type="checkbox"
              className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              checked={isGuaranteeActive}
              disabled={busy || (!hasMenu && !selectedGuaranteeLine)}
              onChange={(e) => {
                if (e.target.checked && hasMenu) {
                  onUpdate(guaranteeChoice, targetQuantity);
                } else if (selectedGuaranteeLine) {
                  onRemove(selectedGuaranteeLine);
                }
              }}
            />
            <span>
              {selectedGuaranteeLine
                ? `✅ Đã chọn Bảo đảm giá (${selectedGuaranteeLine.quantity} ${unitLabel(guaranteeChoice.unit)})`
                : !hasMenu
                  ? '➕ Chọn thực đơn trước để bảo đảm giá'
                  : '➕ Đăng ký Bảo đảm giá (+5%)'}
            </span>
          </label>
        ) : (
          <div className="rounded bg-amber-100/80 px-2.5 py-1.5 text-xs text-amber-800 font-medium">
            💡 Hai bạn có thể chọn gói <em>Bảo đảm giá thực đơn</em> trong danh sách dịch vụ bên dưới để khóa giá.
          </div>
        )}
      </div>
    </div>
  );
}

function changedLines(
  selection: CustomerSelection,
  current: readonly CustomerSelection['lines'][number][],
) {
  const before = new Map(selection.lines.map((line) => [selectionKey(line), line]));
  const after = new Map(current.map((line) => [selectionKey(line), line]));
  const changes: { key: string; text: string }[] = [];
  for (const [key, line] of before) {
    const next = after.get(key);
    if (!next) changes.push({ key, text: line.name + ': đã bỏ khỏi hợp đồng.' });
    else if (
      next.quantity !== line.quantity ||
      next.unitPriceVnd !== line.unitPriceVnd ||
      next.name !== line.name ||
      next.description !== line.description ||
      next.unit !== line.unit ||
      next.sourceRevisionId !== line.sourceRevisionId
    )
      changes.push({
        key,
        text:
          line.name +
          ': ' +
          line.quantity +
          ' ' +
          unitLabel(line.unit) +
          ' × ' +
          formatVnd(line.unitPriceVnd) +
          ' → ' +
          next.quantity +
          ' ' +
          unitLabel(next.unit) +
          ' × ' +
          formatVnd(next.unitPriceVnd) +
          (next.name !== line.name ? ' (' + next.name + ')' : '') +
          '. Nội dung hoặc phiên bản hạng mục đã được cập nhật.',
      });
  }
  for (const [key, line] of after)
    if (!before.has(key))
      changes.push({
        key,
        text:
          'Thêm ' +
          line.name +
          ': ' +
          line.quantity +
          ' ' +
          unitLabel(line.unit) +
          ' × ' +
          formatVnd(line.unitPriceVnd) +
          '.',
      });
  return changes;
}
function SelectionEditor(
  props: Readonly<
    Props & { selection: CustomerSelection; catalog: ReturnType<typeof useSelectionCatalog> }
  >,
) {
  const state = useCustomerSelection({
    ...props,
    bookingRevision: props.contracts.bookingRevision,
  });
  const { confirm, dialog } = useConfirmDialog();
  const busy = state.command.pending || Boolean(state.blockedAccess);
  const saveDisabledReason = busy
    ? state.command.pending
      ? 'Đang xử lý yêu cầu. Vui lòng chờ hoàn tất.'
      : 'Quyền chỉnh sửa đã thay đổi. Xem hướng dẫn cập nhật hồ sơ ở trên.'
    : state.validationMessage;
  const saveDisabled =
    saveDisabledReason !== null || (!state.dirty && props.selection.status === 'DRAFT');
  const submitDisabledReason = busy
    ? saveDisabledReason
    : (state.validationMessage ??
      (state.dirty || props.selection.status !== 'DRAFT'
        ? 'Nhấn “Lưu nháp” trước. Sau khi lưu thành công, bạn có thể gửi lựa chọn cho nhà hàng.'
        : state.previewError
          ? 'Chưa xác nhận được giá cho bản nháp. Hãy thử tính giá lại.'
          : !state.priced || state.previewPending
            ? 'Đang xác nhận giá bản nháp trên máy chủ.'
            : null));
  return (
    <>
      <ContractLinesTable
        lines={state.priced?.selection.lines ?? props.selection.lines}
        totalVnd={state.priced?.selection.totalVnd ?? props.selection.totalVnd}
        totalLabel={
          state.priced ? 'Tổng lựa chọn đang xem trước' : 'Tổng bản đang lưu / đề xuất ban đầu'
        }
      />
      {state.previewPending ? <p role="status">Đang tính lại chi phí trên máy chủ…</p> : null}
      <InlineError error={state.command.error} />
      {state.blockedAccess ? (
        <SelectionAccessNotice
          access={state.blockedAccess}
          bookingId={props.bookingId}
          hideNavigation={state.dirty}
          onRefresh={() =>
            void (async () => {
              if (
                state.dirty &&
                !(await confirm({
                  title: 'Bỏ thay đổi chưa lưu và cập nhật?',
                  description:
                    'Các lựa chọn chưa lưu trên màn hình sẽ bị bỏ. Nội dung đã lưu trên máy chủ được giữ nguyên.',
                  confirmLabel: 'Bỏ thay đổi & cập nhật',
                }))
              )
                return;
              state.discard();
            })()
          }
        />
      ) : null}
      <InlineError error={state.previewError} />
      {state.previewError ? (
        <button
          className={cx.buttonOutline}
          type="button"
          disabled={busy}
          onClick={state.retryPreview}
        >
          Thử tính giá lại
        </button>
      ) : null}
      <InlineError error={state.catalogError} />
      {state.catalogError ? (
        <button className={cx.buttonOutline} type="button" onClick={state.reloadCatalog}>
          Tải lại danh mục
        </button>
      ) : null}
      {state.choices ? (
        <>
          <PriceGuaranteeCard
            choices={state.choices ?? []}
            lines={state.lines}
            busy={busy}
            onUpdate={state.update}
            onRemove={state.remove}
          />
          {state.missing.map((line) => (
            <p className={cx.alert} key={selectionKey(line)}>
              Hạng mục{' '}
              {props.selection.lines.find((value) => selectionKey(value) === selectionKey(line))
                ?.name ?? line.sourceId}{' '}
              không còn được bán. Thông tin đã chọn vẫn hiển thị ở trên.{' '}
              <button type="button" disabled={busy} onClick={() => state.remove(line)}>
                Bỏ để chọn hạng mục thay thế
              </button>
            </p>
          ))}
          {state.stale ? (
            <p className={cx.alert}>
              Có hạng mục đã đổi phiên bản giá. Kiểm tra đơn giá và chọn “Dùng giá hiện hành” trước
              khi tiếp tục.
            </p>
          ) : null}
          <div className={cx.catalog}>
            <table className={cx.table}>
              <thead>
                <tr>
                  <th>Hạng mục</th>
                  <th>Đơn giá hiện hành</th>
                  <th>Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {state.choices.map((choice) => {
                  const selected = state.lines.find(
                    (line) => selectionKey(line) === selectionKey(choice),
                  );
                  return (
                    <tr key={selectionKey(choice)}>
                      <td>
                        <strong>{choice.name}</strong>
                        <small>
                          {categoryLabels[choice.category]} · {lineDescription(choice.description)}
                        </small>
                      </td>
                      <td>
                        {formatVnd(choice.unitPriceVnd)}/{unitLabel(choice.unit)}
                        {selected && selected.sourceRevisionId !== choice.sourceRevisionId ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => state.update(choice, selected.quantity)}
                          >
                            Dùng giá hiện hành
                          </button>
                        ) : null}
                      </td>
                      <td>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={choice.category === 'MENU' ? 500 : 10000}
                          step={1}
                          value={selected?.quantity ?? 0}
                          aria-label={'Số lượng ' + choice.name}
                          disabled={busy}
                          onFocus={(event) => event.currentTarget.select()}
                          onClick={(event) => {
                            if (event.currentTarget.value === '0') event.currentTarget.select();
                          }}
                          onChange={(event) => state.update(choice, Number(event.target.value))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {state.dirty ? (
            <p className={cx.note}>
              Có thay đổi chưa lưu. Lưu nháp trước khi gửi lựa chọn cho nhà hàng.
            </p>
          ) : null}
          {state.dirty ? (
            <button
              className={cx.buttonOutline}
              type="button"
              disabled={busy}
              onClick={() =>
                void (async () => {
                  if (
                    await confirm({
                      title: 'Bỏ thay đổi chưa lưu?',
                      description:
                        'Các lựa chọn đã lưu trên máy chủ vẫn được giữ. Chỉ những thay đổi chưa lưu trong trang này được bỏ.',
                      confirmLabel: 'Bỏ thay đổi & làm mới',
                    })
                  )
                    state.discard();
                })()
              }
            >
              Bỏ thay đổi chưa lưu
            </button>
          ) : null}
          <div className={cx.actions}>
            <button
              className={cx.buttonOutline}
              type="button"
              disabled={saveDisabled}
              aria-describedby={saveDisabledReason ? 'selection-save-status' : undefined}
              onClick={() => void state.save()}
            >
              Lưu nháp
            </button>
            <button
              className={cx.button}
              type="button"
              disabled={submitDisabledReason !== null}
              aria-describedby={submitDisabledReason ? 'selection-submit-status' : undefined}
              onClick={() =>
                void (async () => {
                  if (
                    await confirm({
                      title: 'Gửi lựa chọn cho nhà hàng?',
                      description:
                        'Sau khi gửi, bạn không thể tự thay đổi lựa chọn. Chỉ nhà hàng được điều chỉnh khi soạn hợp đồng; bạn vẫn phải xem và duyệt hợp đồng sau đó.',
                      confirmLabel: 'Gửi & khóa lựa chọn',
                    })
                  )
                    await state.submit();
                })()
              }
            >
              Gửi lựa chọn cho nhà hàng
            </button>
          </div>
          {saveDisabledReason ? (
            <p id="selection-save-status" className={cx.note} role="status">
              {saveDisabledReason}
            </p>
          ) : null}
          {submitDisabledReason ? (
            <p id="selection-submit-status" className={cx.note} role="status">
              {submitDisabledReason}
            </p>
          ) : null}
        </>
      ) : (
        <p role="status">Đang tải thực đơn và dịch vụ…</p>
      )}
      {dialog}
    </>
  );
}
