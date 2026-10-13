import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Catalog, ContractLine } from './contract-api';
import { LineSelector } from './contract-lines';

const catalog = {
  menus: [
    {
      id: 'menu-a',
      versionId: 'menu-a-v2',
      name: 'Thực đơn Sen',
      description: '',
      priceVndPerTable: 5_000_000,
      items: [],
      media: [],
      versionNumber: 2,
    },
  ],
  services: [
    {
      serviceId: 'mc',
      sourceRevisionId: 'mc-v3',
      name: 'MC',
      description: '',
      unit: 'buổi',
      unitPriceVnd: 2_000_000,
      active: true,
      restaurantId: 'r',
      revision: 3,
    },
  ],
  prints: [],
} as unknown as Catalog;

const frozenMenu = {
  category: 'MENU',
  sourceId: 'menu-a',
  sourceRevisionId: 'menu-a-v1',
  name: 'Thực đơn Sen',
  description: '',
  unit: 'table',
  quantity: 20,
  unitPriceVnd: 4_500_000,
  lineTotalVnd: 90_000_000,
} as ContractLine;

const retiredService = {
  category: 'SERVICE',
  sourceId: 'lion-dance',
  sourceRevisionId: 'lion-v1',
  name: 'Múa lân',
  description: '',
  unit: 'buổi',
  quantity: 1,
  unitPriceVnd: 3_000_000,
  lineTotalVnd: 3_000_000,
} as ContractLine;

function renderSelector(props: Partial<React.ComponentProps<typeof LineSelector>> = {}) {
  const onSubmit = vi.fn();
  render(
    <LineSelector
      catalog={catalog}
      initialLines={[]}
      maxGuests={300}
      planningHeadcount={200}
      pending={false}
      submitLabel="Lưu"
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return onSubmit;
}

describe('LineSelector', () => {
  it('requires at least one menu before submitting', () => {
    const onSubmit = renderSelector();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('ít nhất một thực đơn');
  });

  it('sends only source ids, current catalog versions and quantities for a new contract', () => {
    const onSubmit = renderSelector();
    fireEvent.change(screen.getByLabelText('Số lượng Thực đơn Sen'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Số lượng MC'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onSubmit.mock.calls[0]![0]).toEqual([
      { category: 'MENU', sourceId: 'menu-a', sourceRevisionId: 'menu-a-v2', quantity: 25 },
      { category: 'SERVICE', sourceId: 'mc', sourceRevisionId: 'mc-v3', quantity: 1 },
    ]);
  });

  it('keeps frozen price versions, including retired items, when drafting an appendix', () => {
    const onSubmit = renderSelector({
      initialLines: [frozenMenu, retiredService],
      frozenLines: [frozenMenu, retiredService],
    });
    expect(screen.getByText('Múa lân')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Số lượng Thực đơn Sen'), { target: { value: '22' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onSubmit.mock.calls[0]![0]).toEqual([
      { category: 'MENU', sourceId: 'menu-a', sourceRevisionId: 'menu-a-v1', quantity: 22 },
      { category: 'SERVICE', sourceId: 'lion-dance', sourceRevisionId: 'lion-v1', quantity: 1 },
    ]);
  });
});
