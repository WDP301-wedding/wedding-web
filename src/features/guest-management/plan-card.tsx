import { useState } from 'react';
import { tableCapacityMessage } from '../../lib/table-capacity';
import { InlineError } from '../../design-system/inline-error';
import { useCommand } from '../couple-workspace/use-couple-workspace';
import { guestApi, type GuestPlan } from './guest-api';
import { cx } from '../commercial-contract/contract-classes';
import { gx } from './guest-classes';

export function PlanCard({
  bookingId,
  plan,
  maxGuests,
  tableCount,
  maximumTables,
  readOnly = false,
  onSaved,
}: Readonly<{
  bookingId: string;
  plan: GuestPlan;
  maxGuests: number;
  tableCount?: number;
  maximumTables?: number | undefined;
  readOnly?: boolean;
  onSaved: (nextPlan?: GuestPlan) => void;
}>) {
  const command = useCommand({ errorPresentation: 'inline' });
  const [headcount, setHeadcount] = useState(plan.planningHeadcount);
  const capacityError =
    tableCount === undefined
      ? null
      : tableCapacityMessage(
          headcount,
          Math.min(tableCount, maximumTables ?? tableCount),
          maximumTables,
          maxGuests,
        );
  const maximumHeadcount = Math.min(
    maxGuests,
    (tableCount ?? 1000) * 10,
    (maximumTables ?? 1000) * 10,
  );
  return (
    <section className={gx.card}>
      <InlineError error={command.error} />
      <h2>Số khách dự kiến</h2>
      {capacityError ? (
        <p role="alert" className="text-sm text-destructive">
          {capacityError}
        </p>
      ) : null}
      {readOnly ? (
        <p>{plan.planningHeadcount.toLocaleString('vi-VN')} khách</p>
      ) : (
        <form
          className={gx.compactForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (capacityError) return;
            const value = Number(new FormData(event.currentTarget).get('planningHeadcount'));
            void command
              .run(
                (token, key) => guestApi.updatePlan(token, key, bookingId, plan.revision, value),
                'Đã cập nhật số khách dự kiến. Nếu đã có sơ đồ bàn, hãy xác nhận lại sơ đồ.',
              )
              .then((result) => result && onSaved(result));
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="w-36">
              Số khách
              <input
                name="planningHeadcount"
                type="number"
                min={0}
                max={maximumHeadcount}
                value={headcount}
                onChange={(event) => setHeadcount(Number(event.target.value))}
                required
              />
            </label>
            <button
              className={cx.button}
              type="submit"
              disabled={command.pending || capacityError !== null}
            >
              Lưu số khách
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {tableCount !== undefined ? `${tableCount} bàn đã chốt · ` : ''}tối đa 10 người/bàn.
            Hiện có thể nhập tối đa {maximumHeadcount} khách. Muốn tăng thêm, cần chốt thêm bàn qua
            phụ lục trước.
          </p>
        </form>
      )}
    </section>
  );
}
