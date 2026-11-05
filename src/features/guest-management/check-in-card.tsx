import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { useCommand } from '../couple-workspace/use-couple-workspace';
import { guestApi, type AttendanceSummary, type CheckInSettings } from './guest-api';
import { cx } from '../commercial-contract/contract-classes';
import { groupLabel } from './group-labels';
import { gx } from './guest-classes';

export function CheckInCard({
  bookingId,
  settings,
  readOnly = false,
  attendance,
  onChanged,
}: Readonly<{
  bookingId: string;
  settings: CheckInSettings;
  readOnly?: boolean;
  attendance: AttendanceSummary;
  onChanged: (nextSettings?: CheckInSettings) => void;
}>) {
  const command = useCommand();
  const { confirm, dialog } = useConfirmDialog();
  const enabled = settings.checkInMode === 'BY_GUEST_NAME';
  return (
    <section className={gx.card}>
      <div className={gx.cardHeader}>
        <h2>Check-in theo tên tại tiệc</h2>
        <span className={cx.status}>{enabled ? 'Đang bật' : 'Đang tắt'}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Nhân viên đánh dấu khách có tên đã đến; không tính tổng khách tham dự cả tiệc.
      </p>
      <details className="text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer font-semibold text-primary">
          Cách hoạt động
        </summary>
        <p className="mt-2">
          Mặc định không ghi nhận khách đã đến. Sau lần check-in đầu tiên, không thể tắt chế độ này.
        </p>
      </details>
      {enabled && attendance.byGuestGroup.length > 0 ? (
        <details className="text-sm">
          <summary className="w-fit cursor-pointer font-semibold text-primary">
            Xem check-in theo nhóm
          </summary>
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
        </details>
      ) : null}
      <div className={cx.actions}>
        {!readOnly && (
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
                      guestApi.updateCheckInSettings(
                        token,
                        key,
                        bookingId,
                        next,
                        settings.revision,
                      ),
                    next === 'BY_GUEST_NAME' ? 'Đã bật check-in theo tên.' : 'Đã tắt check-in.',
                  )
                  .then((result) => result && onChanged(result));
              })()
            }
          >
            {enabled ? 'Tắt check-in' : 'Bật check-in theo tên'}
          </button>
        )}
        {settings.locked ? <small>Đã có bản ghi check-in nên chế độ này được khoá.</small> : null}
      </div>
      {!readOnly && dialog}
    </section>
  );
}
