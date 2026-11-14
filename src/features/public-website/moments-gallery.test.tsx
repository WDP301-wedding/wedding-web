import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { moments } from '../../content/public-content';
import { MomentsGallery } from './moments-gallery';

describe('MomentsGallery', () => {
  it('opens a photo, navigates with arrows and returns focus to the photo being viewed on Escape', async () => {
    render(<MomentsGallery moments={moments} />);
    const first = screen.getByRole('button', { name: `Xem lớn: ${moments[0]!.alt}` });
    fireEvent.click(first);
    const dialog = await screen.findByRole('dialog', { name: `Ảnh 1/12: ${moments[0]!.alt}` });
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(
      await screen.findByRole('dialog', { name: `Ảnh 2/12: ${moments[1]!.alt}` }),
    ).toBeVisible();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
    expect(screen.getByRole('dialog')).toHaveAccessibleName(`Ảnh 12/12: ${moments[11]!.alt}`);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Quay về đúng ảnh đang xem lúc đóng (ảnh 12), không phải ảnh bấm mở ban đầu.
    expect(screen.getByRole('button', { name: `Xem lớn: ${moments[11]!.alt}` })).toHaveFocus();
  });

  it('gives every photo a Vietnamese description', () => {
    expect(moments).toHaveLength(12);
    for (const moment of moments) expect(moment.alt.length).toBeGreaterThan(10);
  });
});
