import { redirect } from 'next/navigation';

import { routes } from '../../../../src/routes';

export default async function NamesPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (typeof value === 'string') query.set(key, value);
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  redirect(routes.contract + suffix);
}
