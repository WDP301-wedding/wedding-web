import type { paths } from './generated/schema';

/**
 * Kiểu dữ liệu suy ra trực tiếp từ OpenAPI đã sinh (`schema.d.ts`).
 *
 * Nhiều endpoint mới (hợp đồng, khách, sơ đồ bàn…) dùng schema inline nên không có tên trong
 * `components['schemas']`. Thay vì tự viết lại interface (dễ lệch với backend), ta "đọc" kiểu từ
 * `paths`: khi backend đổi DTO và chạy lại `npm run api:generate`, TypeScript báo lỗi ngay ở UI.
 */
type Method = 'get' | 'post' | 'patch' | 'delete';
type JsonOf<T> = T extends { readonly content: { readonly 'application/json': infer J } } ? J : never;
type SuccessJson<R> =
  | JsonOf<R[200 & keyof R]>
  | JsonOf<R[201 & keyof R]>
  | JsonOf<R[202 & keyof R]>;

/** Phần `data` trong response thành công `{ data: ... }` của một operation. */
export type ApiData<P extends keyof paths, M extends Method & keyof paths[P]> = paths[P][M] extends {
  readonly responses: infer R;
}
  ? SuccessJson<R> extends { readonly data: infer D }
    ? D
    : never
  : never;

/** Body JSON của request của một operation. */
export type ApiBody<P extends keyof paths, M extends Method & keyof paths[P]> = paths[P][M] extends {
  readonly requestBody?: infer RB;
}
  ? JsonOf<NonNullable<RB>>
  : never;
