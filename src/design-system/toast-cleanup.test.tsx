import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { notify } from './toast';

describe('shared toast lifecycle between component tests', () => {
  it('shows a real notification', async () => {
    notify.success('Thông báo kiểm tra vòng đời');
    expect(await screen.findByText('Thông báo kiểm tra vòng đời')).toBeInTheDocument();
  });
  it('finishes dismissal before the next test or DOM teardown', () => {
    expect(document.querySelector('[data-sonner-toast]')).toBeNull();
  });
});
