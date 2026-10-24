import { formText, useCommand } from '../couple-workspace/use-couple-workspace';
import {
  viewBoxOf,
  seatingApi,
  type SeatingTable,
  type LayoutOptions,
  type SeatingPlan,
} from './seating-api';
import { layoutWarnings } from './use-seating-workspace';

export function LayoutSelector({
  disabled = false,
  bookingId,
  options,
  plan,
  planId,
  onSelect,
  onStale,
}: Readonly<{
  disabled?: boolean;
  bookingId: string;
  options: LayoutOptions;
  plan: SeatingPlan | null;
  planId: string | null;
  onSelect: (next: SeatingPlan | undefined) => void;
  /** Dữ liệu trên trang đã cũ so với backend → tải lại mẫu + sơ đồ hiện tại. */
  onStale: () => void;
}>) {
  const command = useCommand();

  return (
    <section className="cw-card">
      <div className="cw-card-header">
        <h2>{plan ? `Mẫu đang dùng: ${plan.layoutName}` : 'Chọn mẫu sơ đồ'}</h2>
        <span className="muted">Số khách dự kiến: {options.planningHeadcount}</span>
      </div>
      {disabled ? (
        <p role="status">Lưu hoặc khôi phục nhãn bàn trước khi đổi mẫu để tránh mất thay đổi.</p>
      ) : null}
      {options.items.length === 0 ? (
        <p className="cw-note">Sảnh chưa có mẫu sơ đồ nào được xuất bản. Hãy liên hệ nhà hàng.</p>
      ) : (
        <div className="cw-table-wrap">
          <table className="cw-table">
            <thead>
              <tr>
                <th scope="col">Mẫu</th>
                <th scope="col">Phù hợp</th>
                <th scope="col" className="num">
                  Khoảng khách
                </th>
                <th scope="col" className="num">
                  Tổng ghế
                </th>
                <th scope="col">Chọn</th>
              </tr>
            </thead>
            <tbody>
              {options.items.map((option) => (
                <tr key={option.layoutTemplateVersionId}>
                  <td>
                    <strong>{option.name}</strong>
                    {option.description ? <p>{option.description}</p> : null}
                    {option.tables ? (
                      <>
                        <p>
                          {option.tables.length} bàn · {option.totalSeatCapacity} ghế
                        </p>
                        <svg
                          viewBox={viewBoxOf(
                            option.tables.map(
                              (table) =>
                                ({
                                  ...table,
                                  guestGroupId: null,
                                  guestGroupName: null,
                                  color: null,
                                }) satisfies SeatingTable,
                            ),
                          )}
                          width="240"
                          height="160"
                          style={{ maxWidth: '100%' }}
                          role="img"
                          aria-label={'Xem trước mẫu ' + option.name}
                        >
                          {option.tables.map((table) => (
                            <g
                              key={table.layoutTableId}
                              transform={
                                'translate(' +
                                (table.x + table.width / 2) +
                                ' ' +
                                (table.y + table.height / 2) +
                                ') rotate(' +
                                table.rotationDegrees +
                                ')'
                              }
                            >
                              <title>
                                {table.tableLabel} · {table.seatCapacity} ghế
                              </title>
                              {table.shape === 'ROUND' ? (
                                <ellipse
                                  rx={table.width / 2}
                                  ry={table.height / 2}
                                  fill="var(--paper)"
                                  stroke="currentColor"
                                />
                              ) : (
                                <rect
                                  x={-table.width / 2}
                                  y={-table.height / 2}
                                  width={table.width}
                                  height={table.height}
                                  fill="var(--paper)"
                                  stroke="currentColor"
                                />
                              )}
                            </g>
                          ))}
                        </svg>
                      </>
                    ) : (
                      <p className="muted">Bản xem trước chưa được máy chủ cung cấp.</p>
                    )}
                    {option.warning ? (
                      <>
                        <br />
                        <small className="muted">
                          {layoutWarnings[option.warning] ?? 'Mẫu cần được nhà hàng kiểm tra lại.'}
                        </small>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {option.compatible
                      ? 'Phù hợp'
                      : option.warning === 'EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY'
                        ? 'Không đủ chỗ'
                        : 'Ngoài khoảng'}
                  </td>
                  <td className="num">
                    {option.minGuests}–{option.maxGuests}
                  </td>
                  <td className="num">{option.totalSeatCapacity}</td>
                  <td>
                    <button
                      className="cw-text-button"
                      type="button"
                      disabled={
                        disabled ||
                        command.pending ||
                        plan?.layoutTemplateVersionId === option.layoutTemplateVersionId
                      }
                      onClick={() =>
                        void command
                          .run(
                            (token, key) =>
                              plan && planId
                                ? seatingApi.revise(token, key, bookingId, planId, {
                                    expectedRevision: plan.revisionNumber,
                                    layoutTemplateVersionId: option.layoutTemplateVersionId,
                                  })
                                : seatingApi.create(
                                    token,
                                    key,
                                    bookingId,
                                    option.layoutTemplateVersionId,
                                    // Revision tiệc lấy từ danh sách mẫu vừa tải (luôn mới), KHÔNG
                                    // dùng proposal.revision trong cache: cache chỉ tải một lần nên
                                    // sau khi đổi số khách sẽ lệch → 409 SEATING_REVISION_STALE.
                                    options.bookingRevision,
                                  ),
                            plan
                              ? 'Đã đổi mẫu. Nhãn trên các bàn trùng mã được giữ lại.'
                              : 'Đã tạo sơ đồ nháp.',
                            {
                              SEATING_PLAN_EXISTS:
                                'Tiệc đã có sơ đồ (có thể vừa tạo ở thiết bị khác). Đã tải lại sơ đồ hiện tại.',
                              SEATING_REVISION_STALE:
                                'Thông tin tiệc vừa thay đổi (vd. số khách). Đã tải lại danh sách mẫu — hãy chọn lại.',
                            },
                            (error) => {
                              if (
                                error.code === 'SEATING_REVISION_STALE' ||
                                error.code === 'SEATING_PLAN_EXISTS'
                              )
                                onStale();
                            },
                          )
                          .then(onSelect)
                      }
                    >
                      {plan?.layoutTemplateVersionId === option.layoutTemplateVersionId
                        ? 'Đang dùng'
                        : plan
                          ? 'Đổi sang mẫu này'
                          : 'Dùng mẫu này'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {options.items.length > 0 && !options.items.some((option) => option.compatible) ? (
        <p className="cw-note">
          Sảnh hiện chưa có mẫu phù hợp với {options.planningHeadcount} khách dự kiến. Hãy liên hệ
          nhà hàng để bổ sung mẫu phù hợp hoặc kiểm tra khoảng khách cho phép của mẫu; ngoại lệ
          không được vượt sức chứa thực tế.
        </p>
      ) : null}
      {/*
        Backend chưa có API liệt kê sơ đồ của tiệc: mã sơ đồ được nhớ trong trình duyệt đã tạo nó.
        Chỉ khi tạo sơ đồ bị báo "đã có sơ đồ" (tạo từ thiết bị khác) mới hiện ô nhập mã dự phòng;
        luồng bình thường không bao giờ hỏi mã.
      */}
      {!plan && command.error?.code === 'SEATING_PLAN_EXISTS' ? (
        <form
          className="cw-form"
          onSubmit={(event) => {
            event.preventDefault();
            const id = formText(new FormData(event.currentTarget), 'planId');
            if (!id) return;
            void command.run((token) => seatingApi.plan(token, bookingId, id)).then(onSelect);
          }}
        >
          <details open>
            <summary>Mở sơ đồ đã tạo trên thiết bị khác</summary>
            <div className="cw-form-row">
              <label>
                Mã sơ đồ
                <input name="planId" placeholder="xxxxxxxx-xxxx-…" />
              </label>
            </div>
            <button className="button button-secondary" type="submit" disabled={command.pending}>
              Mở sơ đồ
            </button>
          </details>
        </form>
      ) : null}
    </section>
  );
}
