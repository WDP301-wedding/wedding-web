import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { journeyIndex, JourneyStepper } from './journey-stepper';
import { Skeleton } from './skeleton';

describe('journeyIndex', () => {
  const today = new Date('2026-10-16T03:00:00Z');
  it('maps booking phases to the six-step journey', () => {
    expect(journeyIndex('DRAFT', '2026-12-20', today)).toBe(1);
    expect(journeyIndex('AWAITING_DEPOSIT', '2026-12-20', today)).toBe(2);
    expect(journeyIndex('CONFIRMED', '2026-12-20', today)).toBe(3);
    expect(journeyIndex('CONFIRMED', '2026-10-16', today)).toBe(4);
    expect(journeyIndex('COMPLETED', '2026-10-01', today)).toBe(5);
    expect(journeyIndex('CANCELLED', '2026-12-20', today)).toBe(-1);
  });
  it('marks the current step for assistive technology', () => {
    render(<JourneyStepper current={2} />);
    expect(screen.getByText('Đặt cọc').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});

describe('Skeleton', () => {
  it('keeps the loading message for screen readers', () => {
    render(<Skeleton label="Đang tải khách mời…" variant="list" />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải khách mời…');
  });
});
