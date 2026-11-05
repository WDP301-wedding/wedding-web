import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvitationStudioView } from './invitation-studio-view';
import type { DesignView, InvitationGateway } from './invitation-api';

const designs: DesignView[] = ['Thiệp nhà trai', 'Thiệp nhà gái', 'Thiệp bạn bè'].map(
  (title, index) => ({
    designId: `design-${index}`,
    revisionId: `revision-${index}`,
    revisionNumber: 1,
    title,
    textFields: {},
    sections: [],
    derivedAssetIds: [],
    includesSeating: false,
    updatedAt: '2026-11-05T00:00:00.000Z',
  }),
);

function gateway() {
  return {
    listDesigns: vi.fn().mockResolvedValue(designs),
    listImageJobs: vi.fn().mockResolvedValue([]),
    getDesignPublication: vi.fn().mockImplementation((_token, _booking, id: string) =>
      Promise.resolve({
        publicationRevision: 1,
        published: id !== 'design-2',
        publicSlug: id === 'design-2' ? null : (id === 'design-0' ? 'a' : 'b').repeat(64),
        publishedRevisionId: id === 'design-2' ? null : `public-${id}`,
        designRevisionId: id === 'design-2' ? null : `revision-${id.slice(-1)}`,
      }),
    ),
    publishDesign: vi
      .fn()
      .mockResolvedValue({ publicSlug: 'c'.repeat(64), publicationRevision: 2 }),
    unpublishDesign: vi.fn().mockResolvedValue({ publicationRevision: 2, published: false }),
  } as unknown as InvitationGateway;
}

describe('sharing every saved design', () => {
  it('shows three designs with independent links, QR codes and publication actions', async () => {
    const api = gateway();
    render(
      <InvitationStudioView
        bookingId="booking"
        accessToken="token"
        gateway={api}
        initialDesigns={designs}
        initialTab="publish"
      />,
    );
    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(3);
    await waitFor(() =>
      expect(within(cards[0]!).getByRole('link')).toHaveAttribute('href', '/t/' + 'a'.repeat(64)),
    );
    expect(within(cards[1]!).getByRole('link')).toHaveAttribute('href', '/t/' + 'b'.repeat(64));
    expect(within(cards[0]!).getByRole('img')).toHaveAttribute(
      'src',
      expect.stringContaining('a'.repeat(64) + '/qr'),
    );
    expect(within(cards[1]!).getByRole('img')).toHaveAttribute(
      'src',
      expect.stringContaining('b'.repeat(64) + '/qr'),
    );
    fireEvent.click(within(cards[2]!).getByRole('button', { name: 'Xuất bản thiệp' }));
    await waitFor(() =>
      expect(within(cards[2]!).getByRole('link')).toHaveAttribute('href', '/t/' + 'c'.repeat(64)),
    );
    expect(api.publishDesign).toHaveBeenCalledWith(
      'token',
      'booking',
      'design-2',
      'revision-2',
      1,
      1,
      expect.any(String),
    );
    expect(within(cards[0]!).getByRole('link')).toHaveAttribute('href', '/t/' + 'a'.repeat(64));
  });

  it('preserves the editor draft while exposing the other saved designs', () => {
    render(
      <InvitationStudioView
        bookingId="booking"
        accessToken="token"
        gateway={gateway()}
        initialDesigns={designs}
      />,
    );
    const title = screen.getByRole('textbox', { name: /Tên thiệp/ });
    fireEvent.change(title, { target: { value: 'Tên đang sửa chưa lưu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Thiệp nhà gái' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thiết kế' }));
    expect(screen.getByDisplayValue('Tên đang sửa chưa lưu')).toBeInTheDocument();
  });

  it('keeps all designs and links available in read-only mode without publication mutations', async () => {
    render(
      <InvitationStudioView
        bookingId="booking"
        accessToken="token"
        gateway={gateway()}
        initialDesigns={designs}
        initialTab="publish"
        locked="EVENT_COMPLETED"
      />,
    );
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Xuất bản thiệp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ngừng chia sẻ' })).not.toBeInTheDocument();
  });

  it('fails closed and allows retry when one design status cannot be loaded', async () => {
    const api = gateway();
    vi.mocked(api.getDesignPublication).mockRejectedValueOnce(new Error('offline'));
    render(
      <InvitationStudioView
        bookingId="booking"
        accessToken="token"
        gateway={api}
        initialDesigns={designs}
        initialTab="publish"
      />,
    );
    const first = screen.getAllByRole('article')[0]!;
    expect(await within(first).findByRole('alert')).toBeInTheDocument();
    expect(within(first).queryByRole('link')).not.toBeInTheDocument();
    fireEvent.click(within(first).getByRole('button', { name: 'Thử lại' }));
    await waitFor(() =>
      expect(within(first).getByRole('link')).toHaveAttribute('href', '/t/' + 'a'.repeat(64)),
    );
  });
});
