import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAvailableBookings } from './billing-workspace-sync';

const fixture = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./billing-workspace.helpers', () => ({ loadAvailableBookings: fixture.load }));
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('token');
beforeEach(() => {
  fixture.load.mockReset();
});

it('loads booking choices once across billing rerenders and uses the latest error handler', async () => {
  let reject: (reason: Error) => void = () => {};
  fixture.load.mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  const first = vi.fn(),
    latest = vi.fn();
  const { rerender } = renderHook(
    ({ onError }) => useAvailableBookings(authorize, false, onError),
    {
      initialProps: { onError: first },
    },
  );
  rerender({ onError: latest });
  rerender({ onError: latest });
  const failure = new Error('choices unavailable');
  await act(async () => {
    reject(failure);
    await Promise.resolve();
  });
  await waitFor(() => expect(latest).toHaveBeenCalledWith(failure));
  expect(first).not.toHaveBeenCalled();
  expect(fixture.load).toHaveBeenCalledTimes(1);
});
