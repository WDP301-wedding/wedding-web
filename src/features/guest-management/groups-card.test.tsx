import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupsCard } from './groups-card';
import { guestApi, type GuestGroup } from './guest-api';
import { browserSession } from '../identity-access/browser-session';

vi.mock('../identity-access/browser-session', () => ({
  browserSession: { authorize: vi.fn() },
}));

const group: GuestGroup = {
  guestGroupId: 'group-1',
  bookingId: 'booking',
  name: 'Nhà trai',
  color: '#334537',
  revision: 3,
  status: 'ACTIVE',
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(browserSession, 'authorize').mockImplementation((operation) => operation('token'));
});

describe('GroupsCard', () => {
  it('renames through a dialog, calls only the group API and shows a toast', async () => {
    const update = vi
      .spyOn(guestApi, 'updateGroup')
      .mockResolvedValue({ ...group, name: 'Họ nhà trai', revision: 4 });
    const onChanged = vi.fn();
    render(<GroupsCard bookingId="booking" groups={[group]} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đổi tên' }));
    const dialog = await screen.findByRole('dialog', { name: 'Đổi tên nhóm “Nhà trai”' });
    fireEvent.change(within(dialog).getByLabelText('Tên nhóm mới'), {
      target: { value: 'Họ nhà trai' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu tên' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('token', expect.any(String), 'booking', 'group-1', {
        expectedRevision: 3,
        name: 'Họ nhà trai',
      }),
    );
    // Trang cập nhật đúng nhóm vừa đổi (không tải lại toàn bộ khách/kế hoạch/check-in).
    await waitFor(() =>
      expect(onChanged).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Họ nhà trai' }),
        'update',
      ),
    );
    expect(await screen.findByText('Đã đổi tên nhóm.')).toBeInTheDocument();
  });

  it('asks before archiving and does nothing when cancelled', async () => {
    const update = vi.spyOn(guestApi, 'updateGroup').mockResolvedValue({
      ...group,
      status: 'ARCHIVED',
      revision: 4,
    });
    render(<GroupsCard bookingId="booking" groups={[group]} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu trữ' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Lưu trữ nhóm “Nhà trai”?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu trữ' }));
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Lưu trữ nhóm' }),
    );
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('token', expect.any(String), 'booking', 'group-1', {
        expectedRevision: 3,
        status: 'ARCHIVED',
      }),
    );
  });

  it('shows backend errors as a toast with the support code', async () => {
    const { ApiClientError } = await import('../../lib/api/client');
    vi.spyOn(guestApi, 'updateGroup').mockRejectedValue(
      new ApiClientError({
        kind: 'api',
        code: 'GUEST_GROUP_REVISION_STALE',
        status: 409,
        message: 'stale',
        requestId: 'req-123',
      }),
    );
    render(<GroupsCard bookingId="booking" groups={[group]} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đổi tên' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Tên nhóm mới'), { target: { value: 'Mới' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu tên' }));
    expect(await screen.findByText('Mã hỗ trợ: req-123')).toBeInTheDocument();
  });
});
