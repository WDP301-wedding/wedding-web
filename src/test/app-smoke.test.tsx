import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '../../app/page';

describe('Public home page', () => {
  it('renders the neutral application foundation', () => {
    render(<HomePage />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Wedding platform' })).toBeVisible();
    expect(screen.getByText('The public web foundation is ready.')).toBeVisible();
  });
});
