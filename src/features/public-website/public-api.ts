import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';

export type Hall = components['schemas']['CatalogPublicHall'];
export type Menu = components['schemas']['CatalogPublicMenuPackage'];
export type Restaurant = components['schemas']['CatalogPublicRestaurant'];
export type ConsultationRequest = components['schemas']['ConsultationRequestBody'];
const required = <T>(value: T | undefined) => {
  if (value === undefined) throw new Error('Thiếu dữ liệu phản hồi.');
  return value;
};
export function createPublicGateway(client?: ApiClient) {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  return {
    async restaurant() {
      const value = required((await api().GET('/catalog/restaurant')).data).data;
      return {
        ...value,
        shifts: Array.from(value.shifts, (item) => ({ ...item })),
        media: Array.from(value.media, (item) => ({ ...item })),
      };
    },
    async halls(cursor?: string) {
      const value = required(
        (
          await api().GET('/catalog/halls', {
            params: { query: { limit: 12, ...(cursor ? { cursor } : {}) } },
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
    async menus(cursor?: string) {
      const value = required(
        (
          await api().GET('/catalog/menu-packages', {
            params: { query: { limit: 12, ...(cursor ? { cursor } : {}) } },
          })
        ).data,
      ).data;
      return {
        ...value,
        items: Array.from(value.items, (item) => ({
          ...item,
          items: Array.from(item.items, (dish) => ({ ...dish })),
          media: Array.from(item.media, (asset) => ({ ...asset })),
        })),
      };
    },
    async submit(this: void, body: ConsultationRequest) {
      await api().POST('/consultation-requests', { body });
    },
  };
}
