import { CommandFeedback } from '../couple-workspace/couple-page';
import { formText, useCommand } from '../couple-workspace/use-couple-workspace';
import { guestApi, type GuestGroup } from './guest-api';
import styles from './guests.module.css';

// Màu gợi ý cho nhóm khách – lấy từ bảng màu Hỷ Yến, đủ đậm để phân biệt trên sơ đồ bàn.
export const palette = [
  '#7A1F3D',
  '#C9A46A',
  '#2F6B4F',
  '#3F5B6B',
  '#87334F',
  '#8A5300',
  '#E08E79',
  '#6E5D63',
];

export function GroupsCard({
  bookingId,
  groups,
  onChanged,
}: Readonly<{
  bookingId: string;
  groups: GuestGroup[];
  onChanged: (group?: GuestGroup, action?: 'create' | 'update') => void;
}>) {
  const command = useCommand();
  const done = (result: GuestGroup | undefined, action: 'create' | 'update') => {
    if (result) onChanged(result, action);
  };
  return (
    <section className="cw-card">
      <h2>Nhóm khách</h2>
      <div className="cw-table-wrap">
        <table className="cw-table">
          <thead>
            <tr>
              <th scope="col">Nhóm</th>
              <th scope="col">Màu</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.guestGroupId}>
                <td>
                  <span
                    className={`cw-swatch ${styles.swatch}`}
                    style={{ background: group.color }}
                    aria-hidden="true"
                  />
                  {group.name}
                </td>
                <td>
                  <input
                    aria-label={`Màu nhóm ${group.name}`}
                    type="color"
                    className={styles.colorPicker}
                    defaultValue={group.color.toLowerCase()}
                    disabled={command.pending || group.status !== 'ACTIVE'}
                    onBlur={(event) => {
                      const color = event.target.value.toUpperCase();
                      if (color === group.color.toUpperCase()) return;
                      void command
                        .run(
                          (token, key) =>
                            guestApi.updateGroup(token, key, bookingId, group.guestGroupId, {
                              expectedRevision: group.revision,
                              color,
                            }),
                          'Đã đổi màu nhóm.',
                        )
                        .then((result) => done(result, 'update'));
                    }}
                  />
                </td>
                <td>{group.status === 'ACTIVE' ? 'Đang dùng' : 'Đã lưu trữ'}</td>
                <td className="cw-actions">
                  <button
                    className="cw-text-button"
                    type="button"
                    disabled={command.pending || group.status !== 'ACTIVE'}
                    onClick={() => {
                      const name = window.prompt('Tên nhóm mới', group.name)?.trim();
                      if (!name || name === group.name) return;
                      void command
                        .run(
                          (token, key) =>
                            guestApi.updateGroup(token, key, bookingId, group.guestGroupId, {
                              expectedRevision: group.revision,
                              name,
                            }),
                          'Đã đổi tên nhóm.',
                        )
                        .then((result) => done(result, 'update'));
                    }}
                  >
                    Đổi tên
                  </button>
                  <button
                    className="cw-text-button"
                    type="button"
                    disabled={command.pending}
                    onClick={() =>
                      void command
                        .run(
                          (token, key) =>
                            guestApi.updateGroup(token, key, bookingId, group.guestGroupId, {
                              expectedRevision: group.revision,
                              status: group.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
                            }),
                          group.status === 'ACTIVE' ? 'Đã lưu trữ nhóm.' : 'Đã khôi phục nhóm.',
                        )
                        .then((result) => done(result, 'update'))
                    }
                  >
                    {group.status === 'ACTIVE' ? 'Lưu trữ' : 'Khôi phục'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="cw-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          void command
            .run(
              (token, key) =>
                guestApi.createGroup(token, key, bookingId, {
                  name: formText(data, 'name'),
                  color: (formText(data, 'color') || '#7A1F3D').toUpperCase(),
                }),
              'Đã tạo nhóm mới.',
            )
            .then((result) => {
              if (result) {
                form.reset();
                done(result, 'create');
              }
            });
        }}
      >
        <div className="cw-form-row">
          <label>
            Tên nhóm mới
            <input name="name" required maxLength={80} placeholder="Ví dụ: Đồng nghiệp cô dâu" />
          </label>
          <label>
            Màu
            <input
              name="color"
              type="color"
              className={styles.colorPicker}
              defaultValue={palette[groups.length % palette.length]!.toLowerCase()}
            />
          </label>
        </div>
        <div className="cw-actions">
          <button className="button button-secondary" type="submit" disabled={command.pending}>
            Thêm nhóm
          </button>
        </div>
      </form>
      <CommandFeedback error={command.error} notice={command.notice} />
    </section>
  );
}
