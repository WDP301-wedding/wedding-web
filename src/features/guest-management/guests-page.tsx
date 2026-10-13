'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { CommandFeedback, CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import { authorizedRead, formatDateTime, useCommand, type Proposal } from '../couple-workspace/use-couple-workspace';
import { csvTemplate, csvToImportRows, normalizePhone, type ImportRow } from './guest-csv';
import {
  guestApi,
  readLinkRevision,
  rememberLinkRevision,
  type AttendanceSummary,
  type CheckInSettings,
  type Guest,
  type GuestGroup,
  type GuestPlan,
  type ImportPreview,
  type PersonalLink,
} from './guest-api';

export function GuestsPage() {
  return (
    <CouplePage
      active="guests"
      eyebrow="Sau đặt cọc"
      title="Khách mời"
      description="Nhóm khách dùng được ngay cả khi chưa có danh sách tên. Số khách dự kiến nhập riêng, không tự tính từ danh sách."
      requireFull
    >
      {(proposal) => <GuestsWorkspace proposal={proposal} />}
    </CouplePage>
  );
}

type Data = {
  groups: GuestGroup[];
  plan: GuestPlan;
  guests: Guest[];
  settings: CheckInSettings;
  attendance: AttendanceSummary;
};

/** Đọc toàn bộ khách theo trạng thái (mỗi trang tối đa 50; dừng ở 2.000 để tránh treo trình duyệt). */
async function loadAllGuests(token: string, bookingId: string, status: 'ACTIVE' | 'ARCHIVED') {
  const all: Guest[] = [];
  let cursor: string | undefined;
  do {
    const page = await guestApi.guests(token, bookingId, { status, ...(cursor ? { cursor } : {}) });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && all.length < 2000);
  return all;
}

function GuestsWorkspace({ proposal }: Readonly<{ proposal: Proposal }>) {
  const bookingId = proposal.bookingId;
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    authorizedRead(async (token) => {
      // Nhóm phải nạp trước: lần đọc đầu tiên backend khởi tạo nhóm mặc định.
      const groups = await guestApi.groups(token, bookingId);
      const [plan, guests, settings, attendance] = await Promise.all([
        guestApi.plan(token, bookingId),
        loadAllGuests(token, bookingId, status),
        guestApi.checkInSettings(token, bookingId),
        guestApi.attendance(token, bookingId),
      ]);
      return { groups, plan, guests, settings, attendance };
    })
      .then((next) => {
        if (!active) return;
        setData(next);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(describeApiError(error));
      });
    return () => {
      active = false;
    };
  }, [bookingId, status, reloadKey]);

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!data) return <p role="status">Đang tải khách mời…</p>;

  return (
    <>
      <SummaryCard data={data} status={status} />
      <PlanCard bookingId={bookingId} plan={data.plan} maxGuests={proposal.proposal.hall.maxGuests} onSaved={reload} />
      <GroupsCard bookingId={bookingId} groups={data.groups} onChanged={reload} />
      <GuestListCard
        bookingId={bookingId}
        groups={data.groups}
        guests={data.guests}
        status={status}
        onStatusChange={setStatus}
        onChanged={reload}
      />
      <ImportCard bookingId={bookingId} groups={data.groups} onImported={reload} />
      <CheckInCard bookingId={bookingId} settings={data.settings} attendance={data.attendance} onChanged={reload} />
    </>
  );
}

/**
 * Ba con số luôn tách riêng (quy tắc nghiệp vụ): dự kiến / tên đã lập / tên đã check-in.
 * Check-in chưa bật thì hiển thị "Chưa ghi nhận" chứ KHÔNG hiển thị 0.
 */
function SummaryCard({ data, status }: Readonly<{ data: Data; status: 'ACTIVE' | 'ARCHIVED' }>) {
  const checkedIn = data.attendance.checkedInGuestCount;
  return (
    <section className="cw-card" aria-label="Tóm tắt khách mời">
      <dl className="cw-stats">
        <div>
          <dt>Số khách dự kiến</dt>
          <dd>{data.plan.planningHeadcount}</dd>
        </div>
        <div>
          <dt>Tên đã lập danh sách</dt>
          <dd>{status === 'ACTIVE' ? data.guests.length : '—'}</dd>
        </div>
        <div>
          <dt>Tên đã check-in</dt>
          <dd>{checkedIn === null ? 'Chưa ghi nhận' : checkedIn}</dd>
        </div>
        <div>
          <dt>Nhóm đang dùng</dt>
          <dd>{data.groups.filter((group) => group.status === 'ACTIVE').length}</dd>
        </div>
      </dl>
      <p className="cw-note">
        Danh sách tên là tùy chọn và có thể chỉ một phần, nên không dùng để tính tỷ lệ tham dự của cả
        tiệc. Khách vẫn có thể đi cùng người thân.
      </p>
    </section>
  );
}

function PlanCard({
  bookingId,
  plan,
  maxGuests,
  onSaved,
}: Readonly<{ bookingId: string; plan: GuestPlan; maxGuests: number; onSaved: () => void }>) {
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
            .then((result) => result && onSaved());
        }}
      >
        <div className="cw-form-row">
          <label>
            Số khách dự kiến
            <input name="planningHeadcount" type="number" min={0} max={maxGuests} defaultValue={plan.planningHeadcount} required />
            <small>Sảnh chứa tối đa {maxGuests} khách. Thêm/xoá tên khách không làm đổi con số này.</small>
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

const palette = ['#8C6D62', '#334537', '#C5A880', '#4A5D4E', '#7A3F35', '#3E5C76', '#A0526D', '#6B7F3A'];

function GroupsCard({
  bookingId,
  groups,
  onChanged,
}: Readonly<{ bookingId: string; groups: GuestGroup[]; onChanged: () => void }>) {
  const command = useCommand();
  const done = (result: unknown) => result && onChanged();
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
                  <span className="cw-swatch" style={{ background: group.color }} aria-hidden="true" />
                  {group.name}
                </td>
                <td>
                  <input
                    aria-label={`Màu nhóm ${group.name}`}
                    type="color"
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
                        .then(done);
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
                        .then(done);
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
                        .then(done)
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
                  name: String(data.get('name') ?? '').trim(),
                  color: String(data.get('color') ?? '#8C6D62').toUpperCase(),
                }),
              'Đã tạo nhóm mới.',
            )
            .then((result) => {
              if (result) {
                form.reset();
                onChanged();
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
            <input name="color" type="color" defaultValue={palette[groups.length % palette.length]!.toLowerCase()} />
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

function GuestListCard({
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
  status: 'ACTIVE' | 'ARCHIVED';
  onStatusChange: (status: 'ACTIVE' | 'ARCHIVED') => void;
  onChanged: () => void;
}>) {
  const command = useCommand();
  const [groupFilter, setGroupFilter] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [link, setLink] = useState<{ guestName: string; url: string; expiresAt: string } | null>(null);
  const activeGroups = groups.filter((group) => group.status === 'ACTIVE');
  const groupName = useMemo(() => new Map(groups.map((group) => [group.guestGroupId, group])), [groups]);
  const visible = groupFilter ? guests.filter((guest) => guest.guestGroupId === groupFilter) : guests;

  const readPhone = (raw: FormDataEntryValue | null) => {
    try {
      return normalizePhone(String(raw ?? ''));
    } catch {
      throw new Error('Số điện thoại không hợp lệ (ví dụ 0901234567 hoặc +84901234567).');
    }
  };

  /**
   * Cấp link thiệp cá nhân. Credential chỉ trả về MỘT lần nên phải hiển thị ngay để copy.
   * Nếu revision đã lưu bị cũ, thử revision tiếp theo (mỗi lần dùng Idempotency-Key mới).
   */
  const issueLink = (guest: Guest) =>
    command
      .run(
        async (token) => {
          let revision = readLinkRevision(bookingId, guest.guestId);
          for (let attempt = 0; attempt < 10; attempt += 1) {
            try {
              const issued: PersonalLink = await guestApi.issueLink(token, crypto.randomUUID(), bookingId, guest.guestId, revision);
              rememberLinkRevision(bookingId, guest.guestId, issued.revision);
              return issued;
            } catch (error) {
              if (error instanceof ApiClientError && error.code === 'GUEST_INVITATION_REVISION_STALE') {
                revision += 1;
                continue;
              }
              throw error;
            }
          }
          throw new Error('Không xác định được phiên bản liên kết hiện tại. Hãy thử lại sau.');
        },
        undefined,
        {
          INVITATION_LINK_UNAVAILABLE: 'Chưa thể cấp liên kết: hãy xuất bản thiệp trước, hoặc tiệc đã kết thúc.',
        },
      )
      .then((issued) => {
        if (issued)
          setLink({
            guestName: guest.name,
            url: `${window.location.origin}/invitation/personal${issued.fragment}`,
            expiresAt: issued.expiresAt,
          });
      });

  const sendLink = (guest: Guest) => {
    const email = window.prompt(`Email người nhận thiệp của ${guest.name}`)?.trim();
    if (!email) return;
    void command.run(
      async (token) => {
        let revision = readLinkRevision(bookingId, guest.guestId);
        for (let attempt = 0; attempt < 10; attempt += 1) {
          try {
            const sent = await guestApi.deliverLink(token, crypto.randomUUID(), bookingId, guest.guestId, revision, email);
            rememberLinkRevision(bookingId, guest.guestId, sent.revision);
            return sent;
          } catch (error) {
            if (error instanceof ApiClientError && error.code === 'GUEST_INVITATION_REVISION_STALE') {
              revision += 1;
              continue;
            }
            throw error;
          }
        }
        throw new Error('Không xác định được phiên bản liên kết hiện tại.');
      },
      `Đã xếp lịch gửi thiệp tới ${email}. Liên kết cũ của khách này (nếu có) đã bị thu hồi.`,
      {
        GUEST_DELIVERY_UNAVAILABLE: 'Hệ thống gửi email đang tạm tắt. Hãy dùng “Lấy liên kết” để tự gửi.',
        INVITATION_LINK_UNAVAILABLE: 'Chưa thể gửi: hãy xuất bản thiệp trước.',
      },
    );
  };

  return (
    <section className="cw-card">
      <div className="cw-card-header">
        <h2>Danh sách tên khách (tùy chọn)</h2>
        <div className="cw-actions">
          <label>
            <span className="muted">Trạng thái </span>
            <select value={status} onChange={(event) => onStatusChange(event.target.value as 'ACTIVE' | 'ARCHIVED')}>
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
            Liên kết riêng cho <strong>{link.guestName}</strong> (hết hạn {formatDateTime(link.expiresAt)}). Liên kết
            chỉ hiển thị <strong>một lần</strong> — hãy sao chép ngay. Cấp lại sẽ vô hiệu hoá liên kết cũ.
          </p>
          <div className="cw-copy">
            <code>{link.url}</code>
            <button className="button button-secondary" type="button" onClick={() => void navigator.clipboard?.writeText(link.url)}>
              Sao chép
            </button>
          </div>
          <button className="cw-text-button" type="button" onClick={() => setLink(null)}>
            Đã sao chép, ẩn liên kết
          </button>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="cw-note">
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
                                  name: String(data.get('name') ?? '').trim(),
                                  guestGroupId: String(data.get('guestGroupId')),
                                  phone: readPhone(data.get('phone')),
                                  operationalNote: String(data.get('note') ?? '').trim() || null,
                                }),
                              'Đã lưu thông tin khách.',
                            )
                            .then((result) => {
                              if (result) {
                                setEditing(null);
                                onChanged();
                              }
                            });
                        }}
                      >
                        <GuestFields groups={activeGroups} guest={guest} />
                        <div className="cw-actions">
                          <button className="button" type="submit" disabled={command.pending}>
                            Lưu
                          </button>
                          <button className="button button-secondary" type="button" onClick={() => setEditing(null)}>
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
                      <span className="cw-swatch" style={{ background: groupName.get(guest.guestGroupId)?.color }} aria-hidden="true" />
                      {groupName.get(guest.guestGroupId)?.name ?? '—'}
                    </td>
                    <td>{guest.phone ?? '—'}</td>
                    <td>{guest.operationalNote ?? ''}</td>
                    <td>
                      <div className="cw-actions">
                        {guest.status === 'ACTIVE' ? (
                          <>
                            <button className="cw-text-button" type="button" disabled={command.pending} onClick={() => setEditing(guest.guestId)}>
                              Sửa
                            </button>
                            <button className="cw-text-button" type="button" disabled={command.pending} onClick={() => void issueLink(guest)}>
                              Lấy liên kết
                            </button>
                            <button className="cw-text-button" type="button" disabled={command.pending} onClick={() => sendLink(guest)}>
                              Gửi email
                            </button>
                          </>
                        ) : null}
                        <button
                          className="cw-text-button"
                          type="button"
                          disabled={command.pending}
                          onClick={() =>
                            void command
                              .run(
                                (token, key) =>
                                  guestApi.updateGuest(token, key, bookingId, guest.guestId, {
                                    expectedRevision: guest.revision,
                                    status: guest.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
                                  }),
                                guest.status === 'ACTIVE' ? 'Đã lưu trữ khách (liên kết riêng bị thu hồi).' : 'Đã khôi phục khách.',
                              )
                              .then((result) => result && onChanged())
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
                      name: String(data.get('name') ?? '').trim(),
                      guestGroupId: String(data.get('guestGroupId')),
                      phone: readPhone(data.get('phone')),
                      operationalNote: String(data.get('note') ?? '').trim() || null,
                    }),
                  'Đã thêm khách.',
                )
                .then((result) => {
                  if (result) {
                    form.reset();
                    onChanged();
                  }
                });
            }}
          >
            <GuestFields groups={activeGroups} />
            <div className="cw-actions">
              <button className="button" type="submit" disabled={command.pending || activeGroups.length === 0}>
                Thêm khách
              </button>
            </div>
          </form>
        </details>
      ) : null}
      <CommandFeedback error={command.error} notice={command.notice} />
    </section>
  );
}

function GuestFields({ groups, guest }: Readonly<{ groups: GuestGroup[]; guest?: Guest }>) {
  return (
    <div className="cw-form-row">
      <label>
        Họ tên
        <input name="name" required maxLength={120} defaultValue={guest?.name ?? ''} />
      </label>
      <label>
        Nhóm
        <select name="guestGroupId" required defaultValue={guest?.guestGroupId ?? groups[0]?.guestGroupId}>
          {groups.map((group) => (
            <option key={group.guestGroupId} value={group.guestGroupId}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Điện thoại (tùy chọn)
        <input name="phone" inputMode="tel" defaultValue={guest?.phone ?? ''} placeholder="0901234567" />
      </label>
      <label>
        Ghi chú vận hành (tùy chọn)
        <input name="note" maxLength={500} defaultValue={guest?.operationalNote ?? ''} />
      </label>
    </div>
  );
}

function ImportCard({
  bookingId,
  groups,
  onImported,
}: Readonly<{ bookingId: string; groups: GuestGroup[]; onImported: () => void }>) {
  const command = useCommand();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [errors, setErrors] = useState<readonly { line: number; message: string }[]>([]);
  const [allowUpdates, setAllowUpdates] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + csvTemplate], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mau-danh-sach-khach.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="cw-card">
      <h2>Nhập danh sách từ file CSV</h2>
      <p className="cw-note">
        Cột bắt buộc: <code>ma</code> (mã riêng mỗi dòng, giữ nguyên khi nhập lại), <code>ho_ten</code>,{' '}
        <code>nhom</code> (đúng tên nhóm ở trên). Tùy chọn: <code>so_dien_thoai</code>, <code>ghi_chu</code>. Tối đa
        1.000 dòng mỗi lần; có lỗi ở bất kỳ dòng nào thì không dòng nào được nhập.
      </p>
      <div className="cw-actions">
        <button className="button button-secondary" type="button" onClick={downloadTemplate}>
          Tải file mẫu
        </button>
        <input
          aria-label="Chọn file CSV"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreview(null);
            if (!file) return;
            void file.text().then((text) => {
              const result = csvToImportRows(text, groups);
              setRows(result.rows);
              setErrors(result.errors);
            });
          }}
        />
        <label>
          <input type="checkbox" checked={allowUpdates} onChange={(event) => setAllowUpdates(event.target.checked)} /> Cho phép
          cập nhật khách đã nhập trước (cùng mã)
        </label>
      </div>
      {errors.length > 0 ? (
        <div className="cw-alert" role="alert">
          <p>File có {errors.length} dòng lỗi, hãy sửa rồi chọn lại:</p>
          <ul>
            {errors.slice(0, 20).map((error) => (
              <li key={error.line}>
                Dòng {error.line}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rows && errors.length === 0 ? (
        <div className="cw-actions">
          <span>{rows.length} dòng hợp lệ.</span>
          <button
            className="button"
            type="button"
            disabled={command.pending || rows.length === 0}
            onClick={() =>
              void command
                .run((token, key) => guestApi.previewImport(token, key, bookingId, rows, allowUpdates))
                .then((result) => result && setPreview(result))
            }
          >
            Xem trước
          </button>
        </div>
      ) : null}
      {preview ? (
        <div className="cw-note">
          <p>
            Sẽ thêm <strong>{preview.createdCount}</strong>, cập nhật <strong>{preview.updatedCount}</strong>, giữ nguyên{' '}
            <strong>{preview.unchangedCount}</strong>. Bản xem trước hết hạn lúc {formatDateTime(preview.expiresAt)}.
          </p>
          <button
            className="button"
            type="button"
            disabled={command.pending}
            onClick={() =>
              void command
                .run(
                  (token, key) => guestApi.commitImport(token, key, bookingId, preview.previewId, preview.digest),
                  'Đã nhập danh sách khách.',
                )
                .then((result) => {
                  if (result) {
                    setPreview(null);
                    setRows(null);
                    onImported();
                  }
                })
            }
          >
            Xác nhận nhập
          </button>
        </div>
      ) : null}
      <CommandFeedback error={command.error} notice={command.notice} />
    </section>
  );
}

function CheckInCard({
  bookingId,
  settings,
  attendance,
  onChanged,
}: Readonly<{ bookingId: string; settings: CheckInSettings; attendance: AttendanceSummary; onChanged: () => void }>) {
  const command = useCommand();
  const enabled = settings.checkInMode === 'BY_GUEST_NAME';
  return (
    <section className="cw-card">
      <div className="cw-card-header">
        <h2>Check-in theo tên tại tiệc</h2>
        <span className="status status-champagne">{enabled ? 'Đang bật' : 'Đang tắt'}</span>
      </div>
      <p>
        Mặc định nhà hàng không ghi nhận ai đã đến. Nếu bật, nhân viên được phân công sẽ tìm và đánh dấu
        từng khách có tên trong danh sách. Sau lần check-in đầu tiên, không thể tắt lại.
      </p>
      {enabled && attendance.byGuestGroup.length > 0 ? (
        <ul>
          {attendance.byGuestGroup.map((row) => (
            <li key={row.guestGroupId}>
              <span className="cw-swatch" style={{ background: row.groupColorSnapshot }} aria-hidden="true" />
              {row.groupNameSnapshot}: {row.checkedInGuestCount} tên đã check-in
            </li>
          ))}
        </ul>
      ) : null}
      <div className="cw-actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={command.pending || settings.locked}
          onClick={() => {
            const next = enabled ? 'NONE' : 'BY_GUEST_NAME';
            if (next === 'BY_GUEST_NAME' && !window.confirm('Bật check-in theo tên cho tiệc này?')) return;
            void command
              .run(
                (token, key) => guestApi.updateCheckInSettings(token, key, bookingId, next, settings.revision),
                next === 'BY_GUEST_NAME' ? 'Đã bật check-in theo tên.' : 'Đã tắt check-in.',
              )
              .then((result) => result && onChanged());
          }}
        >
          {enabled ? 'Tắt check-in' : 'Bật check-in theo tên'}
        </button>
        {settings.locked ? <small>Đã có bản ghi check-in nên chế độ này được khoá.</small> : null}
      </div>
      <CommandFeedback error={command.error} notice={command.notice} />
    </section>
  );
}
