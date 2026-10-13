'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { CommandFeedback, CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import { authorizedRead, useCommand, type Proposal } from '../couple-workspace/use-couple-workspace';
import { guestApi, type GuestGroup } from '../guest-management/guest-api';
import {
  readPlanId,
  rememberPlanId,
  seatingApi,
  viewBoxOf,
  type LayoutOptions,
  type SeatingPlan,
  type SeatingTable,
} from './seating-api';

const statusLabels: Record<SeatingPlan['status'], string> = {
  DRAFT: 'Bản nháp',
  CONFIRMED: 'Đã xác nhận',
  REQUIRES_REVIEW: 'Cần xác nhận lại',
};

export function SeatingPage() {
  return (
    <CouplePage
      active="seating"
      eyebrow="Sau đặt cọc"
      title="Sơ đồ bàn"
      description="Chọn mẫu sơ đồ của sảnh và gắn nhóm khách cho từng bàn. Không cần xếp từng người vào ghế."
      requireFull
    >
      {(proposal, reloadBooking) => <SeatingWorkspace proposal={proposal} reloadBooking={reloadBooking} />}
    </CouplePage>
  );
}

function SeatingWorkspace({ proposal, reloadBooking }: Readonly<{ proposal: Proposal; reloadBooking: () => void }>) {
  const bookingId = proposal.bookingId;
  const [options, setOptions] = useState<LayoutOptions | null>(null);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const command = useCommand();
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const storedPlanId = readPlanId(bookingId);
    authorizedRead(async (token) => {
      const [layoutOptions, guestGroups] = await Promise.all([
        seatingApi.options(token, bookingId),
        guestApi.groups(token, bookingId),
      ]);
      const current = storedPlanId ? await seatingApi.plan(token, bookingId, storedPlanId).catch(() => null) : null;
      return { layoutOptions, guestGroups, current };
    })
      .then(({ layoutOptions, guestGroups, current }) => {
        if (!active) return;
        setOptions(layoutOptions);
        setGroups(guestGroups.filter((group) => group.status === 'ACTIVE'));
        setPlan(current);
        setPlanId(current ? current.seatingPlanId : null);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(describeApiError(error));
      });
    return () => {
      active = false;
    };
  }, [bookingId, reloadKey]);

  const accept = (next: SeatingPlan | undefined) => {
    if (!next) return;
    rememberPlanId(bookingId, next.seatingPlanId);
    setPlanId(next.seatingPlanId);
    setPlan(next);
  };

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!options) return <p role="status">Đang tải sơ đồ…</p>;

  return (
    <>
      <section className="cw-card">
        <div className="cw-card-header">
          <h2>{plan ? `Mẫu đang dùng: ${plan.layoutName}` : 'Chọn mẫu sơ đồ'}</h2>
          <span className="muted">Số khách dự kiến: {options.planningHeadcount}</span>
        </div>
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
                      {option.name}
                      {option.warning ? (
                        <>
                          <br />
                          <small className="muted">{option.warning}</small>
                        </>
                      ) : null}
                    </td>
                    <td>{option.compatible ? 'Phù hợp' : 'Ngoài khoảng'}</td>
                    <td className="num">
                      {option.minGuests}–{option.maxGuests}
                    </td>
                    <td className="num">{option.totalSeatCapacity}</td>
                    <td>
                      <button
                        className="cw-text-button"
                        type="button"
                        disabled={command.pending || plan?.layoutTemplateVersionId === option.layoutTemplateVersionId}
                        onClick={() =>
                          void command
                            .run(
                              (token, key) =>
                                plan && planId
                                  ? seatingApi.revise(token, key, bookingId, planId, {
                                      expectedRevision: plan.revisionNumber,
                                      layoutTemplateVersionId: option.layoutTemplateVersionId,
                                    })
                                  : seatingApi.create(token, key, bookingId, option.layoutTemplateVersionId, proposal.revision),
                              plan ? 'Đã đổi mẫu. Nhãn trên các bàn trùng mã được giữ lại.' : 'Đã tạo sơ đồ nháp.',
                              {
                                SEATING_PLAN_EXISTS:
                                  'Tiệc đã có sơ đồ được tạo từ thiết bị khác. Hãy mở sơ đồ bằng mã bên dưới (hỏi nhà hàng nếu cần).',
                              },
                            )
                            .then(accept)
                        }
                      >
                        {plan?.layoutTemplateVersionId === option.layoutTemplateVersionId ? 'Đang dùng' : plan ? 'Đổi sang mẫu này' : 'Dùng mẫu này'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!plan ? (
          <form
            className="cw-form"
            onSubmit={(event) => {
              event.preventDefault();
              const id = String(new FormData(event.currentTarget).get('planId') ?? '').trim();
              if (!id) return;
              void command.run((token) => seatingApi.plan(token, bookingId, id)).then(accept);
            }}
          >
            <details>
              <summary>Đã có sơ đồ? Mở bằng mã sơ đồ</summary>
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
        <CommandFeedback error={command.error} notice={command.notice} />
      </section>

      {plan && planId ? (
        <PlanEditor
          bookingId={bookingId}
          plan={plan}
          groups={groups}
          onChanged={(next) => {
            accept(next);
            reloadBooking();
          }}
        />
      ) : null}
    </>
  );
}

function PlanEditor({
  bookingId,
  plan,
  groups,
  onChanged,
}: Readonly<{ bookingId: string; plan: SeatingPlan; groups: GuestGroup[]; onChanged: (plan: SeatingPlan) => void }>) {
  const command = useCommand();
  // Nhãn đang chỉnh: bàn → nhóm. Khởi tạo từ snapshot backend trả về.
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(plan.labels.map((label) => [label.layoutTableId, label.guestGroupId])),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const groupById = useMemo(() => new Map(groups.map((group) => [group.guestGroupId, group])), [groups]);
  const dirty =
    JSON.stringify(Object.entries(labels).sort()) !==
    JSON.stringify(plan.labels.map((label) => [label.layoutTableId, label.guestGroupId]).sort());
  const selectedTable = plan.renderSnapshot.find((table) => table.layoutTableId === selected);

  const colorOf = (table: SeatingTable) => {
    const groupId = labels[table.layoutTableId];
    return groupId ? (groupById.get(groupId)?.color ?? table.color ?? '#FFFFFF') : '#FFFFFF';
  };

  return (
    <section className="cw-card">
      <div className="cw-card-header">
        <h2>
          Sơ đồ · bản {plan.revisionNumber}
        </h2>
        <span className="status status-champagne">{statusLabels[plan.status]}</span>
      </div>
      <dl className="cw-stats">
        <div>
          <dt>Số khách dự kiến hiện tại</dt>
          <dd>{plan.currentPlanningHeadcount}</dd>
        </div>
        <div>
          <dt>Khoảng của mẫu</dt>
          <dd>
            {plan.minGuests}–{plan.maxGuests}
          </dd>
        </div>
        <div>
          <dt>Tổng ghế</dt>
          <dd>{plan.totalSeatCapacity}</dd>
        </div>
      </dl>
      {plan.warnings.length > 0 ? (
        <ul className="cw-alert">
          {plan.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {plan.droppedTableIds.length > 0 ? (
        <p className="cw-note">{plan.droppedTableIds.length} nhãn không giữ được khi đổi mẫu; hãy gán lại.</p>
      ) : null}
      {plan.managerException ? (
        <p className="cw-note">Nhà hàng đã duyệt ngoại lệ sức chứa: {plan.managerException.reason}</p>
      ) : null}

      <svg
        className="cw-seating"
        viewBox={viewBoxOf(plan.renderSnapshot)}
        role="img"
        aria-label={`Sơ đồ ${plan.renderSnapshot.length} bàn. Chọn một bàn để gắn nhóm.`}
      >
        {plan.renderSnapshot.map((table) => {
          const cx = table.x + table.width / 2;
          const cy = table.y + table.height / 2;
          const isSelected = table.layoutTableId === selected;
          return (
            <g
              key={table.layoutTableId}
              transform={`translate(${cx} ${cy}) rotate(${table.rotationDegrees})`}
              tabIndex={0}
              role="button"
              aria-label={`Bàn ${table.tableLabel}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(table.layoutTableId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setSelected(table.layoutTableId);
              }}
            >
              {table.shape === 'ROUND' ? (
                <ellipse rx={table.width / 2} ry={table.height / 2} fill={colorOf(table)} stroke={isSelected ? '#C5A880' : '#342a29'} strokeWidth={isSelected ? 4 : 1.5} />
              ) : (
                <rect x={-table.width / 2} y={-table.height / 2} width={table.width} height={table.height} fill={colorOf(table)} stroke={isSelected ? '#C5A880' : '#342a29'} strokeWidth={isSelected ? 4 : 1.5} />
              )}
              <text
                transform={`rotate(${-table.rotationDegrees})`}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(10, Math.min(table.width, table.height) / 4)}
                fill="#232321"
                stroke="#ffffff"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {table.tableLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {selectedTable ? (
        <div className="cw-actions">
          <label>
            Nhóm cho bàn <strong>{selectedTable.tableLabel}</strong>{' '}
            <select
              value={labels[selectedTable.layoutTableId] ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                setLabels((previous) => {
                  const next = { ...previous };
                  if (value) next[selectedTable.layoutTableId] = value;
                  else delete next[selectedTable.layoutTableId];
                  return next;
                });
              }}
            >
              <option value="">— Để trống —</option>
              {groups.map((group) => (
                <option key={group.guestGroupId} value={group.guestGroupId}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <p className="muted">Chọn một bàn trên sơ đồ để gắn nhóm. Một nhóm có thể dùng nhiều bàn.</p>
      )}

      <ul className="cw-actions" aria-label="Chú thích nhóm">
        {groups.map((group) => (
          <li key={group.guestGroupId} style={{ listStyle: 'none' }}>
            <span className="cw-swatch" style={{ background: group.color }} aria-hidden="true" />
            {group.name} ({Object.values(labels).filter((id) => id === group.guestGroupId).length} bàn)
          </li>
        ))}
      </ul>

      <div className="cw-actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={command.pending || !dirty}
          onClick={() =>
            void command
              .run(
                (token, key) =>
                  seatingApi.revise(token, key, bookingId, plan.seatingPlanId, {
                    expectedRevision: plan.revisionNumber,
                    labels: Object.entries(labels).map(([layoutTableId, guestGroupId]) => ({ layoutTableId, guestGroupId })),
                  }),
                'Đã lưu nhãn bàn (bản nháp mới, cần xác nhận lại).',
              )
              .then((next) => next && onChanged(next))
          }
        >
          Lưu nhãn bàn
        </button>
        <button
          className="button"
          type="button"
          disabled={command.pending || dirty || plan.status === 'CONFIRMED'}
          title={dirty ? 'Lưu nhãn trước khi xác nhận' : undefined}
          onClick={() =>
            void command
              .run(
                (token, key) =>
                  seatingApi.confirm(token, key, bookingId, plan.seatingPlanId, plan.revisionNumber, plan.currentBookingRevision),
                'Đã xác nhận sơ đồ bàn. Sơ đồ sẽ được dùng cho file in.',
              )
              .then((next) => next && onChanged(next))
          }
        >
          Xác nhận sơ đồ
        </button>
      </div>
      <p className="muted">
        Mã sơ đồ: <code>{plan.seatingPlanId}</code>
      </p>
      <CommandFeedback error={command.error} notice={command.notice} />
    </section>
  );
}
