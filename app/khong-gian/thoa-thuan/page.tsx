import { redirect } from 'next/navigation';

import { routes } from '../../../src/routes';

/** /khong-gian/thoa-thuan không có nội dung riêng → mở bước đầu tiên (Kịch bản), giữ query. */
export default async function AgreementIndex({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (typeof value === 'string') query.set(key, value);
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  redirect(routes.script + suffix);
}
