import type { Guest, GuestGroup } from './guest-api';

export function GuestFields({
  groups,
  guest,
}: Readonly<{
  groups: GuestGroup[];
  guest?: Guest;
}>) {
  return (
    <div className="cw-form-row">
      <label>
        Họ tên
        <input name="name" required maxLength={120} defaultValue={guest?.name ?? ''} />
      </label>
      <label>
        Nhóm
        <select
          name="guestGroupId"
          required
          defaultValue={guest?.guestGroupId ?? groups[0]?.guestGroupId}
        >
          {groups.map((group) => (
            <option key={group.guestGroupId} value={group.guestGroupId}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Điện thoại (tùy chọn)
        <input
          name="phone"
          inputMode="tel"
          defaultValue={guest?.phone ?? ''}
          placeholder="0901234567"
        />
      </label>
      <label>
        Ghi chú vận hành (tùy chọn)
        <input name="note" maxLength={500} defaultValue={guest?.operationalNote ?? ''} />
      </label>
    </div>
  );
}
