import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from './client';

const ok = () =>
  Response.json({ status: 'ok' }, { headers: { 'x-request-id': crypto.randomUUID() } });

/** fetch giả: giữ response tới khi test gọi release(), để mô phỏng request đang chờ. */
function deferredFetch() {
  const releases: Array<() => void> = [];
  const aborted: boolean[] = [];
  const fetch = vi.fn(
    (request: Request) =>
      new Promise<Response>((resolve, reject) => {
        const index = aborted.push(false) - 1;
        request.signal.addEventListener('abort', () => {
          aborted[index] = true;
          reject(new Error('aborted'));
        });
        releases.push(() => resolve(ok()));
      }),
  );
  return { fetch, release: () => releases.forEach((go) => go()), aborted };
}

describe('API client GET coalescing', () => {
  it('sends one request for identical concurrent GETs and gives each caller its own body', async () => {
    const { fetch, release } = deferredFetch();
    const client = createApiClient({ baseUrl: 'https://api.example.com', fetch });
    const first = client.GET('/health/live');
    const second = client.GET('/health/live');
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a.data).toEqual({ status: 'ok' });
    expect(b.data).toEqual({ status: 'ok' });
    // Đã xong → lần gọi sau là request mới (không phải cache).
    const third = client.GET('/health/live');
    release();
    await third;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not share requests across different tokens', async () => {
    const { fetch, release } = deferredFetch();
    const client = createApiClient({ baseUrl: 'https://api.example.com', fetch });
    const first = client.GET('/health/live', { headers: { Authorization: 'Bearer a' } });
    const second = client.GET('/health/live', { headers: { Authorization: 'Bearer b' } });
    release();
    await Promise.all([first, second]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the shared request for remaining callers and aborts it once nobody waits', async () => {
    const { fetch, release, aborted } = deferredFetch();
    const client = createApiClient({ baseUrl: 'https://api.example.com', fetch });
    const leaving = new AbortController();
    const staying = client.GET('/health/live');
    const left = client.GET('/health/live', { signal: leaving.signal });
    leaving.abort();
    await expect(left).rejects.toMatchObject({ kind: 'aborted' });
    expect(aborted[0]).toBe(false);
    release();
    expect((await staying).data).toEqual({ status: 'ok' });

    const only = new AbortController();
    const lonely = client.GET('/health/live', { signal: only.signal });
    only.abort();
    await expect(lonely).rejects.toMatchObject({ kind: 'aborted' });
    await vi.waitFor(() => expect(aborted[1]).toBe(true));
  });
});
