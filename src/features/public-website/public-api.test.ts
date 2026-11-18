import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../../lib/api/client';
import { createPublicGateway } from './public-api';

const image = (id: string) => ({ id, signedUrl: `https://x/${id}.png`, alternativeText: id });
const menu = {
  id: 'm1',
  media: [],
  items: [
    { dishId: 'd1', dishVersionId: 'v1' },
    { dishId: 'd2', dishVersionId: 'old-v2' },
    { dishId: 'd3', dishVersionId: 'v3' },
  ],
};

function client(dishes: () => unknown) {
  const GET = vi.fn((path: string, init: { params: { query: { cursor?: string } } }) => {
    if (path === '/catalog/menu-packages')
      return Promise.resolve({ data: { data: { items: [menu], nextCursor: null } } });
    return dishes() ?? Promise.resolve(init);
  });
  return { GET } as unknown as ApiClient;
}

describe('public gateway menus', () => {
  it('gắn ảnh món theo versionId, fallback dishId, qua nhiều trang', async () => {
    let page = 0;
    const gateway = createPublicGateway(
      client(() => {
        page += 1;
        const items =
          page === 1
            ? [{ id: 'd1', versionId: 'v1', media: [image('a')] }]
            : [{ id: 'd2', versionId: 'v2', media: [image('b')] }];
        return Promise.resolve({
          data: { data: { items, nextCursor: page === 1 ? 'next' : null } },
        });
      }),
    );
    const [result] = (await gateway.menus()).items;
    expect(result!.items.map((dish) => dish.media.map((m) => m.id))).toEqual([['a'], ['b'], []]);
  });

  it('vẫn trả thực đơn khi API món lỗi', async () => {
    const gateway = createPublicGateway(client(() => Promise.reject(new Error('down'))));
    const [result] = (await gateway.menus()).items;
    expect(result!.items.every((dish) => dish.media.length === 0)).toBe(true);
  });
});
