import { describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/client';
import { waitForImageJob } from './image-job-poller';
import type { ImageJobView } from './invitation-api';

const base = {
  jobId: 'job-1',
  intentDigest: 'a'.repeat(64),
  createdAt: '2026-10-21T00:00:00.000Z',
  updatedAt: '2026-10-21T00:00:00.000Z',
  statusPath: '/api/v1/bookings/b/invitation-image-jobs/job-1',
};
const queued: ImageJobView = {
  ...base,
  status: 'QUEUED',
  retryAfterSeconds: 3,
  result: null,
  errorCode: null,
};
const running: ImageJobView = { ...queued, status: 'RUNNING' };
const succeeded: ImageJobView = {
  ...base,
  status: 'SUCCEEDED',
  retryAfterSeconds: null,
  errorCode: null,
  result: { mediaAssetId: 'm', derivedAssetId: 'd', previewPath: '/api/v1/bookings/b/media/m' },
};
const recovery: ImageJobView = {
  ...base,
  status: 'RECOVERY_REQUIRED',
  retryAfterSeconds: null,
  result: null,
  errorCode: 'AI_JOB_INTERRUPTED',
};

const failure = (status: number, retryAfterSeconds?: number) =>
  new ApiClientError({
    kind: 'api',
    code: status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'ERROR',
    message: 'error',
    requestId: 'request',
    status,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  });

function setup() {
  const waits: number[] = [];
  const wait = vi.fn((ms: number) => {
    waits.push(ms);
    return Promise.resolve();
  });
  return { waits, wait, signal: new AbortController().signal };
}

describe('waitForImageJob', () => {
  it('polls only while queued or running, at the server cadence, reporting each state', async () => {
    const { waits, wait, signal } = setup();
    const load = vi.fn().mockResolvedValueOnce(running).mockResolvedValueOnce(succeeded);
    const onUpdate = vi.fn();

    const outcome = await waitForImageJob(queued, load, { signal, wait, onUpdate });

    expect(outcome).toEqual({ job: succeeded, settled: true });
    expect(waits).toEqual([3000, 3000]);
    expect(onUpdate.mock.calls.map(([job]) => (job as ImageJobView).status)).toEqual([
      'RUNNING',
      'SUCCEEDED',
    ]);
  });

  it('returns a finished job without polling', async () => {
    const { wait, signal } = setup();
    const load = vi.fn();

    expect(await waitForImageJob(recovery, load, { signal, wait })).toEqual({
      job: recovery,
      settled: true,
    });
    expect(load).not.toHaveBeenCalled();
  });

  it('backs off on network, 429 and 503 errors and honours Retry-After', async () => {
    const { waits, wait, signal } = setup();
    const network = new ApiClientError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'offline',
      requestId: 'request',
    });
    const load = vi
      .fn()
      .mockRejectedValueOnce(network)
      .mockRejectedValueOnce(failure(429, 20))
      .mockRejectedValueOnce(failure(503))
      .mockResolvedValueOnce(succeeded);

    await waitForImageJob(queued, load, { signal, wait });

    expect(waits).toEqual([3000, 6000, 20_000, 24_000]);
  });

  it('stops on errors that retrying cannot fix', async () => {
    const { wait, signal } = setup();
    const load = vi.fn().mockRejectedValue(failure(403));

    await expect(waitForImageJob(queued, load, { signal, wait })).rejects.toMatchObject({
      status: 403,
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('gives up waiting after the limit while the job keeps running on the server', async () => {
    const { wait, signal } = setup();
    let clock = 0;
    const load = vi.fn(() => {
      clock += 60_000;
      return Promise.resolve(running);
    });

    const outcome = await waitForImageJob(queued, load, {
      signal,
      wait,
      maxWaitMs: 120_000,
      now: () => clock,
    });

    expect(outcome).toEqual({ job: running, settled: false });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('stops when the page is left', async () => {
    const controller = new AbortController();
    const load = vi.fn();
    const pending = waitForImageJob(queued, load, { signal: controller.signal });
    controller.abort(new Error('left the page'));

    await expect(pending).rejects.toThrow('left the page');
    expect(load).not.toHaveBeenCalled();
  });
});
