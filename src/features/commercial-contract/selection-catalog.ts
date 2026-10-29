import type { Catalog, ContractLineInput } from './contract-api';
import type { ApiData } from '../../lib/api/types';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';
export type SelectionChoice = ContractLineInput & {
  name: string;
  description: string;
  unit: string;
  unitPriceVnd: number;
};
async function all<T>(
  load: (cursor?: string) => Promise<{ items: readonly T[]; nextCursor: string | null }>,
): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const page: { items: readonly T[]; nextCursor: string | null } = await load(cursor);
    items.push(...page.items);
    if (page.nextCursor && seen.has(page.nextCursor))
      throw new Error('Danh mục phân trang bị lặp.');
    if (page.nextCursor) seen.add(page.nextCursor);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items;
}
export async function loadSelectionChoices(
  token: string,
  signal?: AbortSignal,
): Promise<SelectionChoice[]> {
  const client = coupleApi();
  const query = (cursor?: string) => ({ limit: 50, ...(cursor ? { cursor } : {}) });
  const [menus, services, prints] = await Promise.all([
    all<Catalog['menus'][number]>(async (cursor) =>
      unwrap<ApiData<'/catalog/menu-packages', 'get'>>(
        await client.GET('/catalog/menu-packages', {
          headers: bearer(token),
          ...(signal ? { signal } : {}),
          params: { query: query(cursor) },
        }),
      ),
    ),
    all<Catalog['services'][number]>(async (cursor) =>
      unwrap<ApiData<'/catalog/services', 'get'>>(
        await client.GET('/catalog/services', {
          headers: bearer(token),
          ...(signal ? { signal } : {}),
          params: { query: query(cursor) },
        }),
      ),
    ),
    all<Catalog['prints'][number]>(async (cursor) =>
      unwrap<ApiData<'/catalog/print-offerings', 'get'>>(
        await client.GET('/catalog/print-offerings', {
          headers: bearer(token),
          ...(signal ? { signal } : {}),
          params: { query: query(cursor) },
        }),
      ),
    ),
  ]);
  return [
    ...menus.map((m) => ({
      category: 'MENU' as const,
      sourceId: m.id,
      sourceRevisionId: m.versionId,
      name: m.name,
      description: m.description,
      unit: 'table',
      unitPriceVnd: m.priceVndPerTable,
      quantity: 0,
    })),
    ...services
      .filter((s) => s.active)
      .map((s) => ({
        category: 'SERVICE' as const,
        sourceId: s.serviceId,
        sourceRevisionId: s.sourceRevisionId,
        name: s.name,
        description: s.description,
        unit: s.unit,
        unitPriceVnd: s.unitPriceVnd,
        quantity: 0,
      })),
    ...prints
      .filter((p) => p.active)
      .map((p) => ({
        category: 'PRINT' as const,
        sourceId: p.offeringId,
        sourceRevisionId: p.sourceRevisionId,
        name: p.name,
        description: [p.printType, p.material, p.templateTitle].join(' · '),
        unit: p.unit,
        unitPriceVnd: p.unitPriceVnd,
        quantity: 0,
      })),
  ];
}
