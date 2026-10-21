import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsultationForm } from './consultation-form';
import { minimumPreferredDate } from './consultation-date';
import type { ConsultationRequest } from './public-api';
import * as experienceApi from '../identity-access/experience-api';
import { WebIdentitySession } from '../identity-access/session';

describe('public consultation submission', () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    ['2026-10-08T16:59:59Z', '2026-10-10'],
    ['2026-10-08T17:00:00Z', '2026-10-11'],
    ['2026-12-30T17:00:00Z', '2027-01-02'],
    ['2028-02-27T17:00:00Z', '2028-03-01'],
  ])('uses the day after tomorrow in Vietnam at %s', (now, minimumDate) => {
    expect(minimumPreferredDate(new Date(now))).toBe(minimumDate);
  });

  it('blocks tomorrow and accepts the minimum date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T17:00:00Z'));
    const submit = vi
      .fn<(input: ConsultationRequest) => Promise<void>>()
      .mockResolvedValue(undefined);
    render(<ConsultationForm submit={submit} />);
    const date = screen.getByLabelText(/Ngày tổ chức dự kiến/);
    expect(date).toHaveAttribute('min', '2026-10-11');
    expect(date).not.toBeRequired();
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Lan' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lan@example.com' } });
    fireEvent.change(date, { target: { value: '2026-10-10' } });
    // A direct submit also checks the date, independent of native input validation.
    fireEvent.submit(date.closest('form')!);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('phải từ ngày mốt');
    fireEvent.change(date, { target: { value: '2026-10-11' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi/ }));
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ preferredDate: '2026-10-11' })),
    );
  });

  it('refreshes the minimum when the form is revisited after midnight', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T16:59:59Z'));
    render(<ConsultationForm />);
    const date = screen.getByLabelText(/Ngày tổ chức dự kiến/);
    expect(date).toHaveAttribute('min', '2026-10-10');
    vi.setSystemTime(new Date('2026-10-08T17:00:00Z'));
    fireEvent.focus(window);
    expect(date).toHaveAttribute('min', '2026-10-11');
  });

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

describe('consultation contact prefill for a signed-in couple', () => {
  afterEach(() => vi.restoreAllMocks());

  const actor = (roles: readonly ('MANAGER' | 'STAFF' | 'COUPLE')[]) => ({
    status: 'authenticated' as const,
    access: 'full' as const,
    denial: null,
    actor: { accountId: 'account', displayEmail: 'lan@example.com', roles, sessionId: 'session' },
  });

  it('fills the empty name and email from the signed-in account and leaves the phone empty', async () => {
    const loadContact = () =>
      Promise.resolve({ displayName: 'Lan & Minh', email: 'lan@example.com' });
    render(<ConsultationForm submit={vi.fn()} loadContact={loadContact} />);

    await waitFor(() => expect(screen.getByLabelText('Họ và tên')).toHaveValue('Lan & Minh'));
    expect(screen.getByLabelText('Email')).toHaveValue('lan@example.com');
    expect(screen.getByLabelText(/Số điện thoại/)).toHaveValue('');
  });

  it('keeps what the customer typed before the profile arrived', async () => {
    let resolve!: (value: { displayName: string | null; email: string }) => void;
    const loadContact = () =>
      new Promise<{ displayName: string | null; email: string }>((done) => {
        resolve = done;
      });
    render(<ConsultationForm submit={vi.fn()} loadContact={loadContact} />);
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Chị Lan' } });

    resolve({ displayName: null, email: 'lan@example.com' });

    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue('lan@example.com'));
    expect(screen.getByLabelText('Họ và tên')).toHaveValue('Chị Lan');
  });

  it('uses the couple profile but never fills a manager or staff account', async () => {
    const profile = vi.fn().mockResolvedValue({
      accountId: 'account',
      displayEmail: 'lan@example.com',
      displayName: 'Lan & Minh',
      revision: 1,
    });
    vi.spyOn(WebIdentitySession.prototype, 'authorize').mockImplementation((operation) =>
      operation('token'),
    );
    vi.spyOn(experienceApi, 'createExperienceGateway').mockReturnValue({
      profile,
    } as unknown as ReturnType<typeof experienceApi.createExperienceGateway>);

    const restore = vi
      .spyOn(WebIdentitySession.prototype, 'restore')
      .mockResolvedValue(actor(['COUPLE']));
    const { unmount } = render(<ConsultationForm submit={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText('Họ và tên')).toHaveValue('Lan & Minh'));
    unmount();

    restore.mockResolvedValue(actor(['MANAGER']));
    profile.mockClear();
    render(<ConsultationForm submit={vi.fn()} />);
    await waitFor(() => expect(restore).toHaveBeenCalledTimes(2));
    expect(profile).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });
});
