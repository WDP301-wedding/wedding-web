import { z } from 'zod';
import { readPublicEnv } from '../../lib/env';
import { ApiClientError } from '../../lib/api/client';
import { suggestionSchema } from './invitation-presentation';

export async function suggestInvitationDesign(
  token: string,
  bookingId: string,
  prompt: string,
  key: string,
) {
  const response = await fetch(
    readPublicEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '') +
      `/bookings/${encodeURIComponent(bookingId)}/invitation-design-suggestions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ prompt }),
      cache: 'no-store',
      signal: AbortSignal.timeout(35000),
    },
  );
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsed = z
      .object({ error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }) })
      .safeParse(payload);
    if (parsed.success)
      throw new ApiClientError({ kind: 'api', status: response.status, ...parsed.data.error });
    throw new Error(
      'Không thể nhận thiết kế. Vui lòng kiểm tra kết nối; yêu cầu cũ không tự động tạo lại.',
    );
  }
  return z.object({ data: suggestionSchema }).parse(payload).data;
}
