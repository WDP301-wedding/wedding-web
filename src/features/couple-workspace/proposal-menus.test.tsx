import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { menuLines, ProposalMenus } from './proposal-menus';
import type { Proposal } from './use-couple-workspace';

const menu = {
  versionId: 'v1',
  packageId: 'p1',
  versionNumber: 1,
  name: 'Mùa Thu',
  description: '',
  priceVndPerTable: 5_000_000,
};
const offer = (menus: unknown[]) =>
  ({
    menu,
    menus,
    tableCount: 28,
    hall: { id: 'h', name: 'H', description: '', maxGuests: 300 },
    shift: { code: 'LUNCH', startTime: '10:30', endTime: '14:00' },
    baseChargeVnd: 140_000_000,
    depositAmountVnd: 42_000_000,
  }) as unknown as Proposal['proposal'];

it('lists every menu with its own table count and server line total', () => {
  render(
    <ProposalMenus
      offer={offer([
        { ...menu, tableCount: 20, lineTotalVnd: 100_000_000 },
        { ...menu, versionId: 'v2', name: 'Chay', tableCount: 8, lineTotalVnd: 40_000_000 },
      ])}
    />,
  );
  expect(screen.getByText(/Mùa Thu · 20 bàn/)).toBeInTheDocument();
  expect(screen.getByText(/Chay · 8 bàn/)).toBeInTheDocument();
  expect(screen.getByText(/100\.000\.000/)).toBeInTheDocument();
});

it('falls back to the legacy single menu when menus is missing', () => {
  expect(menuLines(offer([]))).toEqual([
    {
      key: 'v1',
      name: 'Mùa Thu',
      tableCount: 28,
      priceVndPerTable: 5_000_000,
      lineTotalVnd: 140_000_000,
    },
  ]);
});
