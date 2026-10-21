import type { GuestStatusFilter, GuestsData } from './use-guests-workspace';

/**
 * Ba con số luôn tách riêng (quy tắc nghiệp vụ): dự kiến / tên đã lập / tên đã check-in.
 * Check-in chưa bật thì hiển thị "Chưa ghi nhận" chứ KHÔNG hiển thị 0.
 */
export function SummaryCard({
  data,
  status,
}: Readonly<{ data: GuestsData; status: GuestStatusFilter }>) {
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
        Danh sách tên là tùy chọn và có thể chỉ một phần, nên không dùng để tính tỷ lệ tham dự của
        cả tiệc. Khách vẫn có thể đi cùng người thân.
      </p>
    </section>
  );
}
