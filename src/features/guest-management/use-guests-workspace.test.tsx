import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGuestsWorkspace } from './use-guests-workspace';
import type { Proposal } from '../couple-workspace/use-couple-workspace';
vi.mock('../couple-workspace/use-couple-workspace', () => ({
  authorizedRead: (read: (token: string) => Promise<unknown>) => read('token'),
}));
vi.mock('../realtime/use-realtime', () => ({ useRealtimeSubscription: vi.fn() }));
vi.mock('../realtime/refresh-queue', () => ({ useRefreshQueue: () => ({ schedule: vi.fn() }) }));
const api = vi.hoisted(() => ({
  groups: vi.fn(),
  plan: vi.fn(),
  guests: vi.fn(),
  checkInSettings: vi.fn(),
  attendance: vi.fn(),
}));
vi.mock('./guest-api', () => ({ guestApi: api }));
const group = {
  guestGroupId: 'group',
  bookingId: 'a',
  name: 'Nhà trai',
  color: '#7A1F3D',
  status: 'ACTIVE' as const,
  revision: 1,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.groups).mockResolvedValue([group]);
  vi.mocked(api.plan).mockResolvedValue({
    bookingId: 'a',
    planningHeadcount: 150,
    revision: 1,
    sourceSequence: 0,
    sourceGuestPlanRevisionId: null,
  });
});
describe('group planning workspace', () => {
  it('loads only groups and independent headcount and preserves the plan after group changes', async () => {
    const { result } = renderHook(() => useGuestsWorkspace({ bookingId: 'a' } as Proposal));
    await waitFor(() => expect(result.current.data?.plan.planningHeadcount).toBe(150));
    expect(api.guests).not.toHaveBeenCalled();
    expect(api.checkInSettings).not.toHaveBeenCalled();
    expect(api.attendance).not.toHaveBeenCalled();
    act(() => result.current.onGroupSaved({ ...group, name: 'Họ nhà trai' }, 'update'));
    expect(result.current.data?.groups[0]?.name).toBe('Họ nhà trai');
    expect(result.current.data?.plan.planningHeadcount).toBe(150);
  });
  it('never exposes a previous booking while another booking is loading', async () => {
    const { result, rerender } = renderHook(
      ({ bookingId }) => useGuestsWorkspace({ bookingId } as Proposal),
      { initialProps: { bookingId: 'a' } },
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    vi.mocked(api.groups).mockReturnValue(new Promise(() => {}));
    rerender({ bookingId: 'b' });
    expect(result.current.data).toBeNull();
  });
});
