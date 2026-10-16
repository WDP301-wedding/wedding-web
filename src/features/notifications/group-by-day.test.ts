import { expect, it } from 'vitest';

import type { InboxItem } from './notification-api';
import { groupByDay } from './notifications-page';

const item = (id: string, createdAt: string) => ({ id, createdAt }) as InboxItem;

it('groups notifications by Vietnam calendar day', () => {
  const now = new Date('2026-10-16T03:00:00Z'); // 10:00 giờ Việt Nam
  const groups = groupByDay(
    [
      item('a', '2026-10-16T01:00:00Z'),
      item('b', '2026-10-15T18:00:00Z'), // 01:00 ngày 16 giờ VN → vẫn "Hôm nay"
      item('c', '2026-10-15T02:00:00Z'),
      item('d', '2026-10-10T02:00:00Z'),
    ],
    now,
  );
  expect(groups.map((group) => [group.label, group.items.map((value) => value.id)])).toEqual([
    ['Hôm nay', ['a', 'b']],
    ['Hôm qua', ['c']],
    ['10/10/2026', ['d']],
  ]);
});
