import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JourneyStepper } from './journey-stepper';

describe('completed wedding journey', () => {
  it('marks the last step as finished rather than still in progress', () => {
    render(<JourneyStepper current={5} completed />);
    expect(screen.getAllByText('– đã xong', { exact: false })).toHaveLength(6);
    expect(screen.queryByText('– đang ở bước này', { exact: false })).not.toBeInTheDocument();
  });
});
