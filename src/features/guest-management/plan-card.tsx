import { InlineError } from '../../design-system/inline-error';
import { useCommand } from '../couple-workspace/use-couple-workspace';
import { guestApi, type GuestPlan } from './guest-api';
import { cx } from '../commercial-contract/contract-classes';
import { gx } from './guest-classes';

export function PlanCard({
  bookingId,
  plan,
  maxGuests,
  readOnly = false,
  onSaved,
}: Readonly<{
  bookingId: string;
  plan: GuestPlan;
  maxGuests: number;
  readOnly?: boolean;
  onSaved: (nextPlan?: GuestPlan) => void;
}>) {
  const command = useCommand({ errorPresentation: 'inline' });
  return (
    <section className={gx.card}>
      <InlineError error={command.error} />
      <h2>Số khách dự kiến</h2>
      {readOnly ? (
        <p>{plan.planningHeadcount.toLocaleString('vi-VN')} khách</p>
      ) : (
        <form
          className={gx.compactForm}
          onSubmit={(event) => {
            event.preventDefault();
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
                max={maxGuests}
                defaultValue={plan.planningHeadcount}
                required
              />
            </label>
            <button className={cx.button} type="submit" disabled={command.pending}>
              Lưu số khách
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sảnh tối đa {maxGuests} khách. Thêm hoặc xóa tên không thay đổi số khách dự kiến.
          </p>
        </form>
      )}
    </section>
  );
}
