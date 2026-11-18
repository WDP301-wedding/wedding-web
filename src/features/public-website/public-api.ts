import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';

export type Hall = components['schemas']['CatalogPublicHall'];
type MenuPackage = components['schemas']['CatalogPublicMenuPackage'];
type DishMedia = readonly components['schemas']['CatalogPublicDish']['media'][number][];
/** Món trong thực đơn kèm ảnh lấy từ /catalog/dishes (API thực đơn không trả ảnh món). */
export type MenuDish = MenuPackage['items'][number] & Readonly<{ media?: DishMedia }>;
export type Menu = Omit<MenuPackage, 'items'> & Readonly<{ items: readonly MenuDish[] }>;
export type Restaurant = components['schemas']['CatalogPublicRestaurant'];
export type ConsultationRequest = components['schemas']['ConsultationRequestBody'] &
  Readonly<{
    preferredHallId?: string | null;
    preferredMenuVersionId?: string | null;
    preferredShift?: 'LUNCH' | 'DINNER' | null;
  }>;
const required = <T>(value: T | undefined) => {
  if (value === undefined) throw new Error('Thiếu dữ liệu phản hồi.');
  return value;
};
export function createPublicGateway(client?: ApiClient) {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  /** Ảnh theo cả versionId lẫn dishId: thực đơn có thể ghim phiên bản món cũ hơn bản đang công bố. */
  async function readDishMedia() {
    const media = new Map<string, DishMedia>();
    let cursor: string | undefined;
    for (let page = 0; page < 20; page += 1) {
      const value = required(
        (
          await api().GET('/catalog/dishes', {
            params: { query: { limit: 100, ...(cursor ? { cursor } : {}) } },
          })
        ).data,
      ).data;
      for (const dish of Array.from(value.items)) {
        if (dish.media.length === 0) continue;
        const assets = Array.from(dish.media);
        media.set(dish.versionId, assets);
        if (!media.has(dish.id)) media.set(dish.id, assets);
      }
      cursor = value.nextCursor ?? undefined;
      if (!cursor) break;
    }
    return media;
  }
  return {
    async restaurant() {
      const value = required((await api().GET('/catalog/restaurant')).data).data;
      return {
        ...value,
        shifts: Array.from(value.shifts, (item) => ({ ...item })),
        media: Array.from(value.media, (item) => ({ ...item })),
      };
    },
    async halls(cursor?: string, limit = 12) {
      const value = required(
        (
          await api().GET('/catalog/halls', {
            params: { query: { limit, ...(cursor ? { cursor } : {}) } },
          })
        ).data,
      ).data;
      return {
        ...value,
        items: Array.from(value.items, (item) => ({
          ...item,
          media: Array.from(item.media, (asset) => ({ ...asset })),
        })),
      };
    },
    async hall(hallId: string) {
      const value = required(
        (await api().GET('/catalog/halls/{hallId}', { params: { path: { hallId } } })).data,
      ).data;
      return { ...value, media: Array.from(value.media, (item) => ({ ...item })) };
    },
    async menus(cursor?: string, limit = 12) {
      const [response, dishMedia] = await Promise.all([
        api().GET('/catalog/menu-packages', {
          params: { query: { limit, ...(cursor ? { cursor } : {}) } },
        }),
        // Ảnh món là phụ: lỗi thì vẫn hiện thực đơn, chỉ thiếu ảnh.
        readDishMedia().catch(() => new Map<string, DishMedia>()),
      ]);
      const value = required(response.data).data;
      return {
        ...value,
        items: Array.from(value.items, (item) => ({
          ...item,
          items: Array.from(item.items, (dish) => ({
            ...dish,
            media: Array.from(
              dishMedia.get(dish.dishVersionId) ?? dishMedia.get(dish.dishId) ?? [],
              (asset) => ({ ...asset }),
            ),
          })),
          media: Array.from(item.media, (asset) => ({ ...asset })),
        })),
      };
    },
    async submit(this: void, body: ConsultationRequest) {
      await api().POST('/consultation-requests', { body });
    },
  };
}
