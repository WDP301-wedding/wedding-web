import { CommandFeedback } from '../couple-workspace/couple-page';
import { useCommand } from '../couple-workspace/use-couple-workspace';
import { guestApi, type GuestPlan } from './guest-api';

export function PlanCard({
  bookingId,
  plan,
  maxGuests,
  onSaved,
}: Readonly<{
  bookingId: string;
  plan: GuestPlan;
  maxGuests: number;
  onSaved: (nextPlan?: GuestPlan) => void;
}>) {
  const command = useCommand();
  return (
    <section className="cw-card">
      <h2>Số khách dự kiến</h2>
      <form
        className="cw-form"
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
        <div className="cw-form-row">
          <label>
            Số khách dự kiến
            <input
              name="planningHeadcount"
              type="number"
              min={0}
              max={maxGuests}
              defaultValue={plan.planningHeadcount}
              required
            />
            <small>
              Sảnh chứa tối đa {maxGuests} khách. Thêm/xoá tên khách không làm đổi con số này.
            </small>
          </label>
        </div>
        <div className="cw-actions">
          <button className="button" type="submit" disabled={command.pending}>
            Lưu số khách
          </button>
        </div>
      </form>
      <CommandFeedback error={command.error} notice={command.notice} />
    </section>
  );
}
