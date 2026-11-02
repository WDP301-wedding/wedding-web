import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { useCommand } from '../couple-workspace/use-couple-workspace';
import { guestApi, type AttendanceSummary, type CheckInSettings } from './guest-api';
import { cx } from '../commercial-contract/contract-classes';
import { groupLabel } from './group-labels';
import { gx } from './guest-classes';

export function CheckInCard({
  bookingId,
  settings,
  attendance,
  onChanged,
}: Readonly<{
  bookingId: string;
  settings: CheckInSettings;
  attendance: AttendanceSummary;
  onChanged: (nextSettings?: CheckInSettings) => void;
}>) {
  const command = useCommand();
  const { confirm, dialog } = useConfirmDialog();
  const enabled = settings.checkInMode === 'BY_GUEST_NAME';
  return (
    <section className={cx.card}>
      <div className={cx.cardHeader}>
        <h2>Check-in theo tên tại tiệc</h2>
        <span className={cx.status}>{enabled ? 'Đang bật' : 'Đang tắt'}</span>
      </div>
      <p>
        Mặc định nhà hàng không ghi nhận ai đã đến. Nếu bật, nhân viên được phân công sẽ tìm và đánh
        dấu từng khách có tên trong danh sách. Sau lần check-in đầu tiên, không thể tắt lại.
      </p>
      {enabled && attendance.byGuestGroup.length > 0 ? (
        <ul className={cx.list}>
          {attendance.byGuestGroup.map((row) => (
            <li key={row.guestGroupId}>
              <span
                className={gx.swatch}
                style={{ background: row.groupColorSnapshot }}
                aria-hidden="true"
              />
              {groupLabel(row.groupNameSnapshot)}: {row.checkedInGuestCount} tên đã check-in
            </li>
          ))}
        </ul>
      ) : null}
      <div className={cx.actions}>
        <button
          className={cx.buttonOutline}
          type="button"
          disabled={command.pending || settings.locked}
          onClick={() =>
            void (async () => {
              const next = enabled ? 'NONE' : 'BY_GUEST_NAME';
              if (
                next === 'BY_GUEST_NAME' &&
                !(await confirm({
                  title: 'Bật check-in theo tên cho tiệc này?',
                  description:
                    'Nhân viên sẽ đánh dấu từng khách có tên trong danh sách khi đến. Sau lần check-in đầu tiên, chế độ này không thể tắt lại.',
                  confirmLabel: 'Bật check-in',
                }))
              )
                return;
              void command
                .run(
                  (token, key) =>
                    guestApi.updateCheckInSettings(token, key, bookingId, next, settings.revision),
                  next === 'BY_GUEST_NAME' ? 'Đã bật check-in theo tên.' : 'Đã tắt check-in.',
                )
                .then((result) => result && onChanged(result));
            })()
          }
        >
          {enabled ? 'Tắt check-in' : 'Bật check-in theo tên'}
        </button>
        {settings.locked ? <small>Đã có bản ghi check-in nên chế độ này được khoá.</small> : null}
      </div>
      {dialog}
    </section>
  );
}
