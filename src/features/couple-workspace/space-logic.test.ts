import { describe, expect, it } from 'vitest';

import { navChips } from './space-shell';
import { daysUntil, nextTasks } from './space-overview';
import { pickDefaultBooking, type BookingSummary, type Proposal } from './use-couple-workspace';

const summary = (overrides: Partial<BookingSummary> = {}): BookingSummary => ({
  bookingId: 'b1',
  consultationId: 'c1',
  accessLevel: 'RESTRICTED',
  coupleApproved: false,
  managerApproved: true,
  hasTimeline: true,
  eventDate: '2026-12-20',
  hallName: 'Sảnh Ngọc Trai',
  phase: 'DRAFT',
  planningHeadcount: 280,
  shiftCode: 'LUNCH',
  ...overrides,
});

const proposal = (phase: Proposal['phase'], accessLevel: 'RESTRICTED' | 'FULL' = 'RESTRICTED') =>
  ({
    bookingId: 'b1',
    phase,
    eventDate: '2026-12-20',
    capabilities: { accessLevel },
    effectiveTimeline: { revisionNumber: 4 },
    proposal: { depositAmountVnd: 60_480_000 },
  }) as unknown as Proposal;

describe('Không gian cưới – logic hiển thị', () => {
  it('opens the nearest active booking instead of asking for an id', () => {
    const list = [
      summary({ bookingId: 'old', phase: 'CANCELLED', eventDate: '2026-11-01' }),
      summary({ bookingId: 'later', eventDate: '2027-01-10' }),
      summary({ bookingId: 'soon', eventDate: '2026-12-20' }),
    ];
    expect(pickDefaultBooking(list)?.bookingId).toBe('soon');
    expect(pickDefaultBooking([summary({ bookingId: 'x', phase: 'COMPLETED' })])?.bookingId).toBe(
      'x',
    );
    expect(pickDefaultBooking([])).toBeUndefined();
  });

  it('marks the agreement as waiting for the couple and locks preparation before deposit', () => {
    const chips = navChips(summary(), proposal('DRAFT'));
    expect(chips.agreement?.label).toBe('Chờ bạn');
    expect(chips.prepare?.tone).toBe('lock');
    expect(chips.settle?.tone).toBe('lock');
  });

  it('unlocks preparation once the backend grants FULL access', () => {
    const chips = navChips(
      summary({ phase: 'CONFIRMED', accessLevel: 'FULL' }),
      proposal('CONFIRMED', 'FULL'),
    );
    expect(chips.prepare).toBeUndefined();
    expect(chips.agreement?.tone).toBe('done');
  });

  it('asks for the deposit after the contract is ready', () => {
    const tasks = nextTasks(proposal('AWAITING_DEPOSIT'), summary({ phase: 'AWAITING_DEPOSIT' }));
    expect(tasks.map((task) => task.href)).toEqual([
      '/khong-gian/thoa-thuan/hop-dong?bookingId=b1',
      '/khong-gian/thanh-toan?bookingId=b1',
    ]);
    expect(tasks[1]?.title).toContain('60.480.000');
  });

  it('counts days in Vietnam time', () => {
    expect(daysUntil('2026-10-17', new Date('2026-10-16T16:59:00Z'))).toBe(1);
    expect(daysUntil('2026-10-17', new Date('2026-10-16T17:00:00Z'))).toBe(0);
  });
});
