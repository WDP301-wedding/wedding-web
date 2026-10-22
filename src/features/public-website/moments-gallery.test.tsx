import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { moments } from '../../content/public-content';
import { HeroVideo } from './hero-video';
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

describe('HeroVideo', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stubMedia = (matches: boolean) =>
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );

  it('plays the muted looping video on wide screens without reduced motion', () => {
    stubMedia(true);
    const { container } = render(<HeroVideo />);
    const video = container.querySelector('video');
    const sources = [...(video?.querySelectorAll('source') ?? [])].map((source) =>
      source.getAttribute('src'),
    );
    expect(sources).toEqual(['/videos/hero-sanh-tiec.webm', '/videos/hero-sanh-tiec.mp4']);
    expect(video?.muted).toBe(true);
    expect(video).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the still image on small screens or reduced motion', () => {
    stubMedia(false);
    const { container } = render(<HeroVideo />);
    expect(container.querySelector('video')).toBeNull();
  });
});
