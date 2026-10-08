import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConsultationForm } from './consultation-form';
import type { ConsultationRequest } from './public-api';

describe('public consultation submission', () => {
  it('keeps a failed draft and reuses the intent id on retry', async () => {
    const submit = vi
      .fn<(input: ConsultationRequest) => Promise<void>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);
    render(<ConsultationForm submit={submit} />);
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Lan & Minh' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lan@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nội dung của bạn vẫn được giữ');
    expect(screen.getByLabelText('Họ và tên')).toHaveValue('Lan & Minh');
    fireEvent.click(screen.getByRole('button', { name: /Gửi/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[0]?.[0]).toEqual(submit.mock.calls[1]?.[0]);
    expect(await screen.findByRole('heading', { name: 'Cảm ơn bạn đã mở lời.' })).toBeVisible();
  });
  it('assigns a new intent when the customer edits a failed draft', async () => {
    const submit = vi
      .fn<(input: ConsultationRequest) => Promise<void>>()
      .mockRejectedValue(new Error('network'));
    render(<ConsultationForm submit={submit} />);
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Lan' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lan@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi/ }));
    await screen.findByRole('alert');
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Minh' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[0]?.[0].submissionId).not.toEqual(
      submit.mock.calls[1]?.[0].submissionId,
    );
  });
});
