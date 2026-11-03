import { HySelect } from '../../components/ui/select-field';
import type { Guest, GuestGroup } from './guest-api';
import { cx } from '../commercial-contract/contract-classes';

export function GuestFields({
  groups,
  guest,
}: Readonly<{
  groups: GuestGroup[];
  guest?: Guest;
}>) {
  return (
    <div className={cx.formRow}>
      <label>
        Họ tên
        <input name="name" required maxLength={120} defaultValue={guest?.name ?? ''} />
      </label>
      <label>
        Nhóm
        <HySelect
          name="guestGroupId"
          required
          defaultValue={guest?.guestGroupId ?? groups[0]?.guestGroupId}
        >
          {groups.map((group) => (
            <option key={group.guestGroupId} value={group.guestGroupId}>
              {group.name}
            </option>
          ))}
        </HySelect>
      </label>
      <label>
        Điện thoại
        <input
          name="phone"
          inputMode="tel"
          defaultValue={guest?.phone ?? ''}
          placeholder="0901234567 (tùy chọn)"
        />
      </label>
      <label>
        Ghi chú vận hành
        <input
          name="note"
          maxLength={500}
          defaultValue={guest?.operationalNote ?? ''}
          placeholder="Ghi chú vận hành (tùy chọn)"
        />
      </label>
    </div>
  );
}
