import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TimelineEditor } from './timeline-editor';

describe('immutable timeline editor', () => {
  it('saves an empty draft and removes an existing milestone', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TimelineEditor
        disabled={false}
        initialItems={[{ itemId: 'one', startTime: '18:00', title: 'Welcome', description: null }]}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xóa mốc 1' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Xoá mốc 1 “Welcome”?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xoá mốc' }));
    expect(
      await screen.findByText('Chưa có mốc. Thêm nội dung hoặc lưu bản nháp trống.'),
    ).toBeVisible();
    // Bấm xác nhận trong hộp thoại KHÔNG được submit form lịch trình bao ngoài.
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([], ''));
  });

  it('keeps the milestone when the delete confirmation is cancelled', async () => {
    render(
      <TimelineEditor
        disabled={false}
        initialItems={[{ itemId: 'one', startTime: '18:00', title: 'Welcome', description: null }]}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xóa mốc 1' }));
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Huỷ' }),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Giờ bắt đầu mốc 1')).toHaveValue('18:00');
  });

  it('submits the replacement reason, changed note and reordered existing IDs', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TimelineEditor
        disabled={false}
        needsReason
        initialItems={[
          { itemId: 'one', startTime: '18:00', title: 'Welcome', description: null },
          { itemId: 'two', startTime: '19:00', title: 'Dinner', description: 'Note' },
        ]}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByLabelText('Ghi chú mốc 1'), { target: { value: 'New note' } });
    fireEvent.change(screen.getByLabelText('Lý do thay đổi'), {
      target: { value: 'New location' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đưa mốc 1 xuống' }));
    expect(screen.getByLabelText('Nội dung mốc 2')).toHaveValue('Welcome');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu thay đổi' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        [
          { itemId: 'two', order: 0, startTime: '19:00', title: 'Dinner', description: 'Note' },
          {
            itemId: 'one',
            order: 1,
            startTime: '18:00',
            title: 'Welcome',
            description: 'New note',
          },
        ],
        'New location',
      ),
    );
  });

  it('prevents adding beyond the 100-item server limit and editing while disabled', () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      itemId: String(index),
      startTime: '18:00',
      title: 'Item',
      description: null,
    }));
    const view = render(<TimelineEditor disabled={false} initialItems={items} onSave={vi.fn()} />);
    expect(screen.getByText('Thêm mốc chương trình')).toBeDisabled();
    view.rerender(<TimelineEditor disabled initialItems={items} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Nội dung mốc 1')).toBeDisabled();
  }, 30000);

  it('preserves existing IDs and content when adding and reordering a milestone', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TimelineEditor
        disabled={false}
        initialItems={[
          {
            itemId: 'existing-1',
            startTime: '18:00',
            title: 'Đón khách',
            description: 'Giữ ghi chú',
          },
          { itemId: 'existing-2', startTime: '19:00', title: 'Khai tiệc', description: null },
        ]}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mốc chương trình' }));
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu mốc 3'), { target: { value: '20:00' } });
    fireEvent.change(screen.getByLabelText('Nội dung mốc 3'), { target: { value: 'Cảm ơn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đưa mốc 3 lên' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        [
          {
            itemId: 'existing-1',
            order: 0,
            startTime: '18:00',
            title: 'Đón khách',
            description: 'Giữ ghi chú',
          },
          { order: 1, startTime: '20:00', title: 'Cảm ơn' },
          { itemId: 'existing-2', order: 2, startTime: '19:00', title: 'Khai tiệc' },
        ],
        '',
      ),
    );
    expect(screen.getByLabelText('Nội dung mốc 2')).toHaveValue('Cảm ơn');
  });
});
