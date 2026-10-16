import { describe, expect, it } from 'vitest';

import { consultationHref, menuEstimates, suitableHalls, tableCount } from './estimate';
import type { Hall, Menu } from './public-api';

const hall = (id: string, maxGuests: number) =>
  ({ id, maxGuests, name: id, description: '', media: [] }) as Hall;
const menu = (id: string, priceVndPerTable: number) =>
  ({ id, priceVndPerTable, name: id, description: '', items: [], media: [] }) as unknown as Menu;

describe('estimator', () => {
  it('rounds tables up so no guest is left without a seat', () => {
    expect(tableCount(280)).toBe(28);
    expect(tableCount(281)).toBe(29);
    expect(tableCount(1)).toBe(1);
    expect(tableCount(0)).toBe(0);
    expect(tableCount(Number.NaN)).toBe(0);
  });

  it('keeps only halls with enough capacity, tightest fit first', () => {
    const halls = [hall('lon', 400), hall('nho', 150), hall('vua', 300)];
    expect(suitableHalls(halls, 280).map((item) => item.id)).toEqual(['vua', 'lon']);
    expect(suitableHalls(halls, 500)).toEqual([]);
  });

  it('multiplies tables by the price per table for every menu', () => {
    expect(menuEstimates([menu('a', 5_200_000)], 280)).toEqual([
      { menu: menu('a', 5_200_000), tables: 28, totalVnd: 145_600_000 },
    ]);
  });

  it('builds the consultation link with the Vietnamese query names', () => {
    expect(
      consultationHref({
        hallId: 'h1',
        menuId: 'm1',
        date: '2026-12-20',
        guests: 280,
        shift: 'LUNCH',
      }),
    ).toBe('/tu-van?sanh=h1&thuc-don=m1&ngay=2026-12-20&khach=280&ca=trua');
    expect(consultationHref({})).toBe('/tu-van');
  });
});
