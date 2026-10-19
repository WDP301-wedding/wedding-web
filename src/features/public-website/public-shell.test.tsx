import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PublicShell } from './public-shell';

vi.mock('./public-header', () => ({ PublicHeader: () => null }));

describe('public footer', () => {
  it.each([
    ['+84 (28) 1234-5678', 'tel:+842812345678'],
    ['028 1234 5678', 'tel:02812345678'],
  ])('preserves the digits in the hotline %s', (publicPhone, href) => {
    render(
      <PublicShell
        restaurant={{
          id: '11111111-1111-4111-8111-111111111111',
          displayName: 'Hỷ Yến',
          description: '',
          address: '',
          publicEmail: null,
          publicPhone,
          media: [],
          shifts: [],
        }}
      >
        Nội dung
      </PublicShell>,
    );

    expect(
      within(screen.getByRole('contentinfo')).getByRole('link', { name: publicPhone }),
    ).toHaveAttribute('href', href);
  });
});
