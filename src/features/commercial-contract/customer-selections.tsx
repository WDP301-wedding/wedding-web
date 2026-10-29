'use client';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { InlineError } from '../../design-system/inline-error';
import { formatVnd } from '../couple-workspace/use-couple-workspace';
import { currentRevision, type ContractList } from './contract-api';
import type { CustomerSelection } from './selection-wire';
import { ContractLinesTable, categoryLabels, unitLabel } from './contract-lines-table';
import { useSelectionCatalog } from './use-selection-catalog';
import { selectionKey, useCustomerSelection } from './use-customer-selection';
import styles from './customer-selections.module.css';

type Props = {
  contracts: ContractList;
  bookingId: string;
  onChanged: () => void;
  onDirtyChange: (value: boolean) => void;
  onWritingChange: (value: boolean) => void;
};
export function CustomerSelections(props: Readonly<Props>) {
  const catalog = useSelectionCatalog(Boolean(props.contracts.capabilities?.canEditSelections));
  const selection = props.contracts.customerSelection;
  if (!selection) return null;
  const current = currentRevision(props.contracts);
  const changes =
    selection.status === 'SUBMITTED' && current
      ? changedLines(selection, current.document.lines)
      : [];
  return (
    <section className="cw-card" aria-labelledby="customer-selection-heading">
      <div className="cw-card-header">
        <h2 id="customer-selection-heading">Lựa chọn thực đơn & dịch vụ</h2>
        <span className="status status-champagne">
          {selection.status === 'SUBMITTED'
            ? 'Đã gửi nhà hàng'
            : selection.status === 'DRAFT'
              ? 'Bản nháp của bạn'
              : 'Chưa gửi lựa chọn'}
        </span>
      </div>
      <p>
        Lựa chọn này giúp nhà hàng chuẩn bị hợp đồng. Gửi lựa chọn chưa phải là duyệt hợp đồng hay
        thanh toán.
      </p>
      {props.contracts.capabilities?.canEditSelections ? (
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
          <p className="cw-note">
            {selection.status === 'SUBMITTED'
              ? 'Bạn đã gửi lựa chọn nên không thể tự chỉnh sửa. Nếu cần thay đổi, liên hệ nhà hàng; nội dung hợp đồng do nhà hàng cập nhật được hiển thị phía dưới để bạn kiểm tra lại.'
              : current
                ? 'Nhà hàng đã soạn hợp đồng. Xem nội dung và chi phí hiện tại ở phần Hợp đồng bên dưới.'
                : 'Hồ sơ hiện không cho phép chỉnh sửa lựa chọn. Xem trạng thái hồ sơ hoặc liên hệ nhà hàng để được hỗ trợ.'}
          </p>
        </>
      )}
      {changes.length ? (
        <aside className={styles.changes}>
          <h3>Nhà hàng đã điều chỉnh so với lựa chọn bạn gửi</h3>
          <ul>
            {changes.map((change) => (
              <li key={change.key}>{change.text}</li>
            ))}
          </ul>
          <p>Đọc nội dung hợp đồng hiện tại trước khi duyệt.</p>
        </aside>
      ) : null}
    </section>
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
  const busy = state.command.pending || state.waitingRefresh;
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
      <InlineError error={state.previewError} />
      {state.previewError ? (
        <button
          className="button button-secondary"
          type="button"
          disabled={busy}
          onClick={state.retryPreview}
        >
          Thử tính giá lại
        </button>
      ) : null}
      <InlineError error={state.catalogError} />
      {state.catalogError ? (
        <button className="button button-secondary" type="button" onClick={state.reloadCatalog}>
          Tải lại danh mục
        </button>
      ) : null}
      {state.choices ? (
        <>
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={state.reloadCatalog}
          >
            Cập nhật danh mục đang bán
          </button>
          {state.missing.map((line) => (
            <p className="cw-alert" key={selectionKey(line)}>
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
            <p className="cw-alert">
              Có hạng mục đã đổi phiên bản giá. Kiểm tra đơn giá và chọn “Dùng giá hiện hành” trước
              khi tiếp tục.
            </p>
          ) : null}
          <div className={styles.catalog}>
            <table className="cw-table">
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
                          {categoryLabels[choice.category]} · {choice.description}
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
            <p className="cw-note">
              Có thay đổi chưa lưu. Lưu nháp trước khi gửi lựa chọn cho nhà hàng.
            </p>
          ) : null}
          {state.dirty ? (
            <button
              className="button button-secondary"
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
          <div className="cw-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={
                busy ||
                state.invalid ||
                !state.priced ||
                state.previewPending ||
                (!state.dirty && props.selection.status === 'DRAFT')
              }
              onClick={() => void state.save()}
            >
              Lưu nháp
            </button>
            <button
              className="button"
              type="button"
              disabled={
                busy ||
                state.dirty ||
                props.selection.status !== 'DRAFT' ||
                state.invalid ||
                !state.priced ||
                state.previewPending
              }
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
          <p className="cw-note">
            Lưu nháp để chọn tiếp bất cứ lúc nào. Chỉ “Gửi lựa chọn cho nhà hàng” mới khóa chỉnh sửa
            phía bạn.
          </p>
        </>
      ) : (
        <p role="status">Đang tải danh mục thực đơn, dịch vụ và thiệp in…</p>
      )}
      {dialog}
    </>
  );
}
