import { useId, useState } from 'react';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { formText, useCommand } from '../couple-workspace/use-couple-workspace';
import { guestApi, type GuestGroup } from './guest-api';
import { cx } from '../commercial-contract/contract-classes';
import { gx } from './guest-classes';

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
  readOnly = false,
  onChanged,
}: Readonly<{
  bookingId: string;
  groups: GuestGroup[];
  readOnly?: boolean;
  onChanged: (group?: GuestGroup, action?: 'create' | 'update') => void;
}>) {
  const command = useCommand();
  const [adding, setAdding] = useState(false);
  const formId = useId();
  const { confirm, prompt, dialog } = useConfirmDialog();
  const done = (result: GuestGroup | undefined, action: 'create' | 'update') => {
    if (result) onChanged(result, action);
  };
  return (
    <section className={gx.card}>
      <div className={gx.cardHeader}>
        <h2>Nhóm khách</h2>
        {!readOnly && (
          <button
            className={cx.buttonOutline}
            type="button"
            aria-expanded={adding}
            aria-controls={formId}
            disabled={command.pending}
            onClick={() => setAdding((value) => !value)}
          >
            {adding ? 'Đóng phần thêm nhóm' : 'Thêm nhóm'}
          </button>
        )}
      </div>
      <div className={cx.tableWrap}>
        <table className={gx.groupTable}>
          <thead>
            <tr>
              <th scope="col">Nhóm</th>
              {!readOnly && <th scope="col">Màu</th>}
              <th scope="col">Trạng thái</th>
              {!readOnly && <th scope="col">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.guestGroupId}>
                <td>
                  <span
                    className={gx.swatch}
                    style={{ background: group.color }}
                    aria-hidden="true"
                  />
                  {group.name}
                </td>
                {!readOnly && (
                  <td>
                    <input
                      aria-label={`Màu nhóm ${group.name}`}
                      type="color"
                      className={gx.colorPicker}
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
                )}
                <td>{group.status === 'ACTIVE' ? 'Đang dùng' : 'Đã lưu trữ'}</td>
                {!readOnly && (
                  <td>
                    <div className={cx.actions}>
                      <button
                        className={cx.textButton}
                        type="button"
                        disabled={command.pending || group.status !== 'ACTIVE'}
                        onClick={() =>
                          void (async () => {
                            const name = await prompt({
                              title: `Đổi tên nhóm “${group.name}”`,
                              label: 'Tên nhóm mới',
                              defaultValue: group.name,
                              maxLength: 80,
                              confirmLabel: 'Lưu tên',
                            });
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
                          })()
                        }
                      >
                        Đổi tên
                      </button>
                      <button
                        className={cx.textButton}
                        type="button"
                        disabled={command.pending}
                        onClick={() =>
                          void (async () => {
                            // Lưu trữ = "xoá mềm": nhóm ẩn khỏi lựa chọn và sơ đồ → hỏi lại trước.
                            if (
                              group.status === 'ACTIVE' &&
                              !(await confirm({
                                title: `Lưu trữ nhóm “${group.name}”?`,
                                description:
                                  'Nhóm sẽ không còn hiện khi gắn bàn trên sơ đồ. Bạn có thể khôi phục nhóm bất cứ lúc nào.',
                                confirmLabel: 'Lưu trữ nhóm',
                                tone: 'danger',
                              }))
                            )
                              return;
                            const result = await command.run(
                              (token, key) =>
                                guestApi.updateGroup(token, key, bookingId, group.guestGroupId, {
                                  expectedRevision: group.revision,
                                  status: group.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
                                }),
                              group.status === 'ACTIVE' ? 'Đã lưu trữ nhóm.' : 'Đã khôi phục nhóm.',
                            );
                            done(result, 'update');
                          })()
                        }
                      >
                        {group.status === 'ACTIVE' ? 'Lưu trữ' : 'Khôi phục'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div id={formId} className={adding ? 'block border-t border-border pt-3' : 'hidden'}>
          <form
            className={gx.compactForm}
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
                    setAdding(false);
                  }
                });
            }}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <label>
                Tên nhóm mới
                <input
                  name="name"
                  required
                  maxLength={80}
                  placeholder="Ví dụ: Đồng nghiệp cô dâu"
                />
              </label>
              <label>
                Màu
                <input
                  name="color"
                  type="color"
                  className={gx.colorPicker}
                  defaultValue={palette[groups.length % palette.length]!.toLowerCase()}
                />
              </label>
            </div>
            <div className={cx.actions}>
              <button className={cx.buttonOutline} type="submit" disabled={command.pending}>
                Thêm nhóm
              </button>
            </div>
          </form>
        </div>
      )}
      {!readOnly && dialog}
    </section>
  );
}
