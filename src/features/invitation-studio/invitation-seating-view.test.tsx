import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { groupLabel } from '../guest-management/group-labels';
import { InvitationSeatingView } from './invitation-seating-view';
import { InvitationPrintContents } from './invitation-print-contents';
import type { InvitationSeating } from './print-purchase-api';

const names = ['Groom Side', 'Bride Side', 'Parents', 'Friends', 'Đồng nghiệp chú rể', null];
const tables: InvitationSeating = names.map((guestGroupName, index) => ({
  tableLabel: `Bàn ${index + 1}`,
  shape: 'RECTANGLE',
  x: index * 150,
  y: 80,
  width: 100,
  height: 60,
  rotationDegrees: 30,
  guestGroupName,
  color: '#059669',
}));

describe('invitation seating follows the seating plan group labels', () => {
  it('uses the same Vietnamese/default and custom names without changing table geometry or snapshots', () => {
    const original = structuredClone(tables);
    const { container } = render(<InvitationSeatingView tables={tables} />);
    const legend = screen.getByRole('list');
    names.forEach((name, index) => {
      if (name)
        expect(within(legend).getByText(`${groupLabel(name)}: Bàn ${index + 1}`)).toBeVisible();
    });
    expect(within(legend).getAllByRole('listitem')).toHaveLength(5);
    expect(legend).not.toHaveTextContent('Groom Side');
    expect(legend).not.toHaveTextContent('Bride Side');
    expect(container.querySelector('svg g g')).toHaveAttribute('transform', 'rotate(30 50 110)');
    expect(container.querySelector('svg g g')).toHaveAttribute('fill', '#059669');
    expect(screen.getByText('Bàn 6')).toBeInTheDocument();
    expect(tables).toEqual(original);
  });

  it('retains every assigned table when translated and original labels coexist', () => {
    render(
      <InvitationSeatingView
        tables={[tables[0]!, { ...tables[0]!, tableLabel: 'Bàn 7', guestGroupName: 'Nhà trai' }]}
      />,
    );
    expect(screen.getByText('Nhà trai: Bàn 1')).toBeVisible();
    expect(screen.getByText('Nhà trai: Bàn 7')).toBeVisible();
  });

  it('applies the same labels to new print content', () => {
    render(
      <InvitationPrintContents
        invitation={{
          title: 'Thiệp cưới',
          textFields: {},
          event: null,
          timeline: [],
          assets: [],
          seating: tables,
        }}
      />,
    );
    expect(screen.getByText('Nhà trai: Bàn 1')).toBeVisible();
    expect(screen.getByText('Nhà gái: Bàn 2')).toBeVisible();
    expect(screen.getByText('Đồng nghiệp chú rể: Bàn 5')).toBeVisible();
  });
});
