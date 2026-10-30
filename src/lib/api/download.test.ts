import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from './client';
import { describeApiError, isConflict } from './api-errors';
import { fetchPrivateFile, openBlob } from './download';

describe('fetchPrivateFile', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3000/api/v1/');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the bearer token and returns the PDF bytes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('PDF', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const blob = await fetchPrivateFile('/bookings/b/contracts/c/pdf', 'token-1');
    expect(await blob.text()).toBe('PDF');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/v1/bookings/b/contracts/c/pdf');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
  });

  it('normalizes API errors with the server code and request id', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: { code: 'NOT_FOUND', requestId: 'srv-1' } }, { status: 404 }),
        ),
    );
    await expect(fetchPrivateFile('/x', 't')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      requestId: 'srv-1',
      status: 404,
    });
  });

  it('keeps a default code when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })));
    await expect(fetchPrivateFile('/x', 't')).rejects.toMatchObject({
      code: 'FILE_DOWNLOAD_FAILED',
      status: 500,
    });
  });

  it('falls back to the sent request id when the JSON error has no envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, { status: 403 })));
    const error = (await fetchPrivateFile('/x', 't').catch(
      (caught: unknown) => caught,
    )) as ApiClientError;
    expect(error.code).toBe('FILE_DOWNLOAD_FAILED');
    expect(error.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reports network failures as a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(fetchPrivateFile('/x', 't')).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('openBlob', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens a new tab, or downloads when popups are blocked', () => {
    const createUrl = vi.fn().mockReturnValue('blob:1');
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValueOnce({} as Window)
      .mockReturnValueOnce(null);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    openBlob(new Blob(['a']), 'a.pdf');
    expect(click).not.toHaveBeenCalled();
    openBlob(new Blob(['b']), 'b.pdf');
    expect(open).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe('describeApiError fallbacks', () => {
  it('handles plain errors, unknown values, unknown codes and conflicts', () => {
    expect(describeApiError(new Error('Số điện thoại không hợp lệ')).message).toBe(
      'Số điện thoại không hợp lệ',
    );
    expect(describeApiError('boom').message).toBe('Đã có lỗi không mong muốn. Hãy thử lại.');
    const unknownStatus = new ApiClientError({
      kind: 'api',
      code: 'X',
      message: 'm',
      requestId: 'r',
      status: 418,
    });
    expect(describeApiError(unknownStatus).message).toBe('Máy chủ từ chối yêu cầu.');
    const forbidden = new ApiClientError({
      kind: 'api',
      code: 'X',
      message: 'm',
      requestId: 'r',
      status: 403,
    });
    expect(describeApiError(forbidden).message).toContain('chưa có quyền');
    const noStatus = new ApiClientError({
      kind: 'malformed-response',
      code: 'MALFORMED',
      message: 'm',
      requestId: 'r',
    });
    expect(describeApiError(noStatus).message).toBe(
      'Máy chủ trả về dữ liệu chưa hợp lệ. Hãy thử lại hoặc gửi mã hỗ trợ cho nhà hàng.',
    );
    const conflict = new ApiClientError({
      kind: 'api',
      code: 'X',
      message: 'm',
      requestId: 'r',
      status: 409,
    });
    expect(isConflict(conflict)).toBe(true);
    expect(isConflict(new Error('x'))).toBe(false);
  });
});
