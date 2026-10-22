'use client';

import { useMemo, useState } from 'react';
import { formText, formatDateTime } from '../couple-workspace/use-couple-workspace';
import { guestApi, type Guest, type GuestGroup } from './guest-api';
import { normalizePhone } from './guest-csv';
import { GuestFields } from './guest-fields';
import { usePersonalInvitationLink } from './use-personal-invitation-link';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { Illustration } from '../../design-system/illustrations';
import type { GuestStatusFilter } from './use-guests-workspace';
import styles from './guests.module.css';

export function GuestListCard({
  bookingId,
  groups,
  guests,
  status,
  onStatusChange,
  onChanged,
}: Readonly<{
  bookingId: string;
  groups: GuestGroup[];
  guests: Guest[];
  status: GuestStatusFilter;
  onStatusChange: (status: GuestStatusFilter) => void;
  onChanged: (guest?: Guest, action?: 'create' | 'update') => void;
}>) {
  const { confirm, prompt, dialog } = useConfirmDialog();
  const { command, link, issueLink, sendLink, clearLink } = usePersonalInvitationLink(
    bookingId,
    (guestName) =>
      prompt({
        title: 'Gửi thiệp riêng qua email',
        label: `Email người nhận thiệp của ${guestName}`,
        type: 'email',
        placeholder: 'ten@vidu.com',
        confirmLabel: 'Gửi email',
      }),
  );
  const [groupFilter, setGroupFilter] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const activeGroups = groups.filter((group) => group.status === 'ACTIVE');
  const groupName = useMemo(
    () => new Map(groups.map((group) => [group.guestGroupId, group])),
    [groups],
  );
  const visible = groupFilter
    ? guests.filter((guest) => guest.guestGroupId === groupFilter)
    : guests;

  const readPhone = (raw: FormDataEntryValue | null) => {
    try {
      return normalizePhone(typeof raw === 'string' ? raw : '');
    } catch {
      throw new Error('Số điện thoại không hợp lệ (ví dụ 0901234567 hoặc +84901234567).');
    }
  };

  return (
    <section className="cw-card">
      <div className="cw-card-header">
        <h2>Danh sách tên khách (tùy chọn)</h2>
        <div className="cw-actions">
          <label>
            <span className="muted">Trạng thái </span>
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value as GuestStatusFilter)}
            >
              <option value="ACTIVE">Đang mời</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
            </select>
          </label>
          <label>
            <span className="muted">Nhóm </span>
            <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              <option value="">Tất cả</option>
              {groups.map((group) => (
                <option key={group.guestGroupId} value={group.guestGroupId}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {link ? (
        <div className="cw-note" role="status">
          <p>
            Liên kết riêng cho <strong>{link.guestName}</strong> (hết hạn{' '}
            {formatDateTime(link.expiresAt)}). Liên kết chỉ hiển thị <strong>một lần</strong> — hãy
            sao chép ngay. Cấp lại sẽ vô hiệu hoá liên kết cũ.
          </p>
          <div className={`cw-copy ${styles.copyRow}`}>
            <code className={styles.copyCode}>{link.url}</code>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void navigator.clipboard?.writeText(link.url)}
            >
              Sao chép
            </button>
          </div>
          <button className="cw-text-button" type="button" onClick={clearLink}>
            Đã sao chép, ẩn liên kết
          </button>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="cw-note cw-note-illustrated">
          {status === 'ACTIVE' ? <Illustration name="empty-khach" size={64} /> : null}
          {status === 'ACTIVE'
            ? 'Chưa có tên khách nào. Bạn vẫn dùng được nhóm, sơ đồ bàn, thiệp và in mà không cần danh sách tên.'
            : 'Không có khách đã lưu trữ.'}
        </p>
      ) : (
        <div className="cw-table-wrap">
          <table className="cw-table">
            <thead>
              <tr>
                <th scope="col">Họ tên</th>
                <th scope="col">Nhóm</th>
                <th scope="col">Điện thoại</th>
                <th scope="col">Ghi chú</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((guest) =>
                editing === guest.guestId ? (
                  <tr key={guest.guestId}>
                    <td colSpan={5}>
                      <form
                        className="cw-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const data = new FormData(event.currentTarget);
                          void command
                            .run(
                              (token, key) =>
                                guestApi.updateGuest(token, key, bookingId, guest.guestId, {
                                  expectedRevision: guest.revision,
                                  name: formText(data, 'name'),
                                  guestGroupId: formText(data, 'guestGroupId'),
                                  phone: readPhone(data.get('phone')),
                                  operationalNote: formText(data, 'note') || null,
                                }),
                              'Đã lưu thông tin khách.',
                            )
                            .then((result) => {
                              if (result) {
                                setEditing(null);
                                onChanged(result, 'update');
                              }
                            });
                        }}
                      >
                        <GuestFields groups={activeGroups} guest={guest} />
                        <div className="cw-actions">
                          <button className="button" type="submit" disabled={command.pending}>
                            Lưu
                          </button>
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => setEditing(null)}
                          >
                            Huỷ
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={guest.guestId}>
                    <td>{guest.name}</td>
                    <td>
                      <span
                        className={`cw-swatch ${styles.swatch}`}
                        style={{ background: groupName.get(guest.guestGroupId)?.color }}
                        aria-hidden="true"
                      />
                      {groupName.get(guest.guestGroupId)?.name ?? '—'}
                    </td>
                    <td>{guest.phone ?? '—'}</td>
                    <td>{guest.operationalNote ?? ''}</td>
                    <td>
                      <div className="cw-actions">
                        {guest.status === 'ACTIVE' ? (
                          <>
                            <button
                              className="cw-text-button"
                              type="button"
                              disabled={command.pending}
                              onClick={() => setEditing(guest.guestId)}
                            >
                              Sửa
                            </button>
                            <button
                              className="cw-text-button"
                              type="button"
                              disabled={command.pending}
                              onClick={() => void issueLink(guest)}
                            >
                              Lấy liên kết
                            </button>
                            <button
                              className="cw-text-button"
                              type="button"
                              disabled={command.pending}
                              onClick={() => void sendLink(guest)}
                            >
                              Gửi email
                            </button>
                          </>
                        ) : null}
                        <button
                          className="cw-text-button"
                          type="button"
                          disabled={command.pending}
                          onClick={() =>
                            void (async () => {
                              if (
                                guest.status === 'ACTIVE' &&
                                !(await confirm({
                                  title: `Lưu trữ khách “${guest.name}”?`,
                                  description:
                                    'Khách sẽ bị ẩn khỏi danh sách đang dùng và liên kết thiệp riêng đã gửi sẽ bị thu hồi. Bạn có thể khôi phục lại sau.',
                                  confirmLabel: 'Lưu trữ khách',
                                  tone: 'danger',
                                }))
                              )
                                return;
                              const result = await command.run(
                                (token, key) =>
                                  guestApi.updateGuest(token, key, bookingId, guest.guestId, {
                                    expectedRevision: guest.revision,
                                    status: guest.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
                                  }),
                                guest.status === 'ACTIVE'
                                  ? 'Đã lưu trữ khách (liên kết riêng bị thu hồi).'
                                  : 'Đã khôi phục khách.',
                              );
                              if (result) onChanged(result, 'update');
                            })()
                          }
                        >
                          {guest.status === 'ACTIVE' ? 'Lưu trữ' : 'Khôi phục'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {status === 'ACTIVE' ? (
        <details>
          <summary>Thêm một khách</summary>
          <form
            className="cw-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              void command
                .run(
                  (token, key) =>
                    guestApi.createGuest(token, key, bookingId, {
                      name: formText(data, 'name'),
                      guestGroupId: formText(data, 'guestGroupId'),
                      phone: readPhone(data.get('phone')),
                      operationalNote: formText(data, 'note') || null,
                    }),
                  'Đã thêm khách.',
                )
                .then((result) => {
                  if (result) {
                    form.reset();
                    onChanged(result, 'create');
                  }
                });
            }}
          >
            <GuestFields groups={activeGroups} />
            <div className="cw-actions">
              <button
                className="button"
                type="submit"
                disabled={command.pending || activeGroups.length === 0}
              >
                Thêm khách
              </button>
            </div>
          </form>
        </details>
      ) : null}
      {dialog}
    </section>
  );
}
