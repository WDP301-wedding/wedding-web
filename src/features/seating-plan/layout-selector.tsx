import { formText, useCommand } from '../couple-workspace/use-couple-workspace';
import {
  viewBoxOf,
  seatingApi,
  type SeatingTable,
  type LayoutOptions,
  type SeatingPlan,
} from './seating-api';
import { layoutWarnings } from './use-seating-workspace';
import styles from './seating.module.css';

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
        <div>
          <h2>{plan ? `Mẫu sơ đồ sảnh: ${plan.layoutName}` : 'Chọn mẫu bố trí không gian bàn tiệc'}</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            Số khách dự kiến: <strong>{options.planningHeadcount} khách</strong>
          </span>
        </div>
      </div>

      {disabled ? (
        <p className="cw-alert" role="status" style={{ margin: '12px 0' }}>
          Bạn đang có thay đổi chưa lưu trên sơ đồ hiện tại. Hãy bấm <strong>Lưu nhãn bàn</strong> hoặc{' '}
          <strong>Khôi phục</strong> ở phía dưới trước khi chuyển sang mẫu khác.
        </p>
      ) : null}

      {options.items.length === 0 ? (
        <p className="cw-note">Sảnh chưa có mẫu sơ đồ nào được xuất bản. Hãy liên hệ nhà hàng.</p>
      ) : (
        <div className={styles.layoutGrid}>
          {options.items.map((option) => {
            const isActive = plan?.layoutTemplateVersionId === option.layoutTemplateVersionId;
            return (
              <div
                key={option.layoutTemplateVersionId}
                className={`${styles.layoutCard} ${isActive ? styles.layoutCardActive : ''}`}
              >
                <div className={styles.layoutCardHeader}>
                  <h3 className={styles.layoutCardTitle}>{option.name}</h3>
                  <span
                    className={`status ${
                      isActive
                        ? 'status-wine'
                        : option.compatible
                          ? 'status-champagne'
                          : 'status-neutral'
                    }`}
                  >
                    {isActive
                      ? 'Đang dùng'
                      : option.compatible
                        ? 'Phù hợp'
                        : option.warning === 'EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY'
                          ? 'Không đủ chỗ'
                          : 'Ngoài khoảng'}
                  </span>
                </div>

                {option.description ? (
                  <p style={{ fontSize: 13, color: 'var(--hy-ink-muted)', margin: 0 }}>
                    {option.description}
                  </p>
                ) : null}

                {/* Khung hình xem trước sơ đồ */}
                {option.tables ? (
                  <div className={styles.layoutThumbnailWrap}>
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
                      width="100%"
                      height="100%"
                      style={{ maxHeight: 140 }}
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
                              fill={isActive ? 'var(--hy-wine-soft, #f4e8ea)' : 'var(--paper, #fff)'}
                              stroke={isActive ? 'var(--hy-wine, #7a1f3d)' : 'var(--hy-outline-strong, #888)'}
                              strokeWidth={1.5}
                            />
                          ) : (
                            <rect
                              x={-table.width / 2}
                              y={-table.height / 2}
                              width={table.width}
                              height={table.height}
                              fill={isActive ? 'var(--hy-wine-soft, #f4e8ea)' : 'var(--paper, #fff)'}
                              stroke={isActive ? 'var(--hy-wine, #7a1f3d)' : 'var(--hy-outline-strong, #888)'}
                              strokeWidth={1.5}
                            />
                          )}
                        </g>
                      ))}
                    </svg>
                  </div>
                ) : (
                  <div className={styles.layoutThumbnailWrap}>
                    <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                      Bản xem trước chưa được máy chủ cung cấp.
                    </p>
                  </div>
                )}

                {/* Thông số kỹ thuật của mẫu */}
                <div className={styles.layoutCardSpecs}>
                  <div>
                    <strong>{option.tables?.length ?? '—'}</strong> bàn
                  </div>
                  <div>
                    <strong>{option.totalSeatCapacity}</strong> ghế
                  </div>
                  <div>
                    Khoảng khách: <strong>{option.minGuests}–{option.maxGuests}</strong>
                  </div>
                </div>

                {option.warning ? (
                  <small style={{ color: 'var(--hy-warning, #8a5300)', fontSize: 12 }}>
                    ⚠ {layoutWarnings[option.warning] ?? 'Mẫu cần được nhà hàng kiểm tra lại.'}
                  </small>
                ) : null}

                {/* Nút hành động */}
                <div style={{ marginTop: 'auto' }}>
                  <button
                    className={`button ${isActive ? 'button-secondary' : ''}`}
                    style={{ width: '100%' }}
                    type="button"
                    disabled={disabled || command.pending || isActive}
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
                    {isActive ? 'Đang áp dụng mẫu này' : plan ? 'Đổi sang mẫu này' : 'Dùng mẫu này'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {options.items.length > 0 && !options.items.some((option) => option.compatible) ? (
        <p className="cw-note" style={{ marginTop: 16 }}>
          Sảnh hiện chưa có mẫu phù hợp với {options.planningHeadcount} khách dự kiến. Hãy liên hệ
          nhà hàng để bổ sung mẫu phù hợp hoặc kiểm tra khoảng khách cho phép của mẫu; ngoại lệ
          không được vượt sức chứa thực tế.
        </p>
      ) : null}

      {!plan && command.error?.code === 'SEATING_PLAN_EXISTS' ? (
        <form
          className="cw-form"
          style={{ marginTop: 16 }}
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
