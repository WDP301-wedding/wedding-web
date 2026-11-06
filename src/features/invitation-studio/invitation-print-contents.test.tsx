import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvitationContents, type InvitationContent } from './invitation-content';
import { InvitationPrintContents } from './invitation-print-contents';

const invitation: InvitationContent = {
  title: 'Thiệp Cưới Hạnh Phúc',
  presentation: { version: 1, theme: 'blush-floral', layout: 'gatefold' },
  textFields: {
    groomName: 'Đức Minh',
    brideName: 'Ngọc Ánh',
    greeting: 'Trân trọng kính mời',
    message: 'Cùng chung vui ngày hạnh phúc',
    footer: 'Hân hạnh đón tiếp',
  },
  event: {
    eventDate: '2027-01-06',
    hallName: 'Sảnh Hoa Sen',
    shiftCode: 'DINNER',
    startTime: '18:00',
  },
  timeline: Array.from({ length: 5 }, (_, order) => ({
    order,
    startTime: '18:00',
    title: `Chương trình ${order + 1}`,
    description: 'Chào mừng hai bên gia đình và quý khách cùng chung vui.',
  })),
  assets: [],
  seating: [
    {
      tableLabel: 'Bàn Gia đình',
      shape: 'RECTANGLE',
      x: 100,
      y: 100,
      width: 450,
      height: 300,
      rotationDegrees: 45,
      guestGroupName: 'Gia đình cô dâu',
      color: '#059669',
    },
  ],
};

describe('print uses the Content tab as its canonical renderer', () => {
  it('retains new cover and interior artwork on a two-door design in the guest view and print', () => {
    const decorated: InvitationContent = {
      ...invitation,
      presentation: {
        version: 1,
        theme: 'traditional-red',
        layout: 'gatefold',
        decoration: {
          coverMotif: 'phoenix',
          insideMotif: 'song-hy',
          frame: 'inset',
          finish: 'embossed-cotton',
          coverComposition: 'medallion',
          insideComposition: 'botanical-corners',
        },
      },
    };
    const guest = render(
      <InvitationContents invitation={decorated} apiBase="https://example.test" />,
    );
    expect(
      guest.container.querySelector('[data-face="cover"][data-motif="phoenix"]'),
    ).not.toBeNull();
    fireEvent.click(within(guest.container).getByRole('button', { name: 'Đọc toàn bộ nội dung' }));
    expect(
      guest.container.querySelector('[data-face="inside"][data-motif="song-hy"]'),
    ).not.toBeNull();
    const print = render(<InvitationPrintContents invitation={decorated} />);
    expect(
      print.container.querySelector('[data-print-page] [data-face="cover"][data-motif="phoenix"]'),
    ).not.toBeNull();
    expect(
      print.container.querySelector('[data-print-page] [data-face="inside"][data-motif="song-hy"]'),
    ).not.toBeNull();
  });
  it('prints entered parent names and hides empty families', () => {
    const printed = render(
      <InvitationPrintContents
        invitation={{
          ...invitation,
          textFields: {
            ...invitation.textFields,
            groomMotherName: 'Nguyễn Thị Lan',
            brideFatherName: '  ',
          },
        }}
      />,
    );
    expect(within(printed.container).getByText('Nhà trai')).toBeVisible();
    expect(within(printed.container).getByText('Nguyễn Thị Lan')).toBeVisible();
    expect(within(printed.container).queryByText('Nhà gái')).toBeNull();
  });
  it('keeps the same invitation pages, Vietnamese text, theme and exact seating SVG', () => {
    const preview = render(
      <InvitationContents invitation={invitation} apiBase="https://example.test" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Đọc toàn bộ nội dung' }));
    const expectedHeadings = within(preview.container)
      .getAllByRole('heading')
      .map((h) => h.textContent);
    const expectedSeating = preview.container.querySelector('svg')?.outerHTML;
    const printed = render(<InvitationPrintContents invitation={invitation} />);
    const actualHeadings = within(printed.container)
      .getAllByRole('heading')
      .map((h) => h.textContent);
    expect(actualHeadings).toEqual(expect.arrayContaining(expectedHeadings));
    expect(printed.container.querySelector('svg')?.outerHTML).toBe(expectedSeating);
    expect(
      printed.container.querySelector('[data-theme="blush-floral"][data-layout="gatefold"]'),
    ).not.toBeNull();
    expect(within(printed.container).getByText('Chương trình 5')).toBeVisible();
    expect(within(printed.container).queryByRole('button')).toBeNull();
    expect(printed.container.querySelectorAll('[data-print-page]').length).toBeGreaterThanOrEqual(
      5,
    );
  });
});
