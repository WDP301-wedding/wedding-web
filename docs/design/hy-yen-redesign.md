# Giao diện Hỷ Yến cho wedding-web

Current design reference: [web v2 screen map](./hy-yen/web-v2/README.md) and its HTML prototypes.
The superseded v1 prototypes have been removed. Shared design-system prototypes and their runtime are retained.
Prototypes remain design references only; application UI and data use the production source.

## Nguyên tắc

- Chỉ đổi phần trình bày. Không đổi API, hook dữ liệu, route, query param, thông báo lỗi.
- Màu, bo góc, bóng, motion lấy từ token trong `:root` (`app/globals.css`); lớp giao diện ở `app/hy-yen.css`
  (nạp sau cùng trong `app/layout.tsx`, phủ lên CSS v0 cũ).
- Chữ tiếng Việt: luôn dùng `--font-display` / `--font-body` (Be Vietnam Pro) theo `AGENTS.md`.
  Prototype dùng Playfair Display cho tiêu đề và số tiền → trong repo thay bằng Be Vietnam Pro 600–700.
  Playfair chỉ dùng cho monogram "HY" (`.latin-wordmark`, `lang="en"`) qua `--font-wordmark`.
- Champagne `#C9A46A` và đào `#F4B9A7` không dùng cho chữ thường trên nền kem (tương phản < 4.5:1).

## Token chính (globals.css)

| Token                                               | Giá trị                                          | Dùng cho                                      |
| --------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| `--hy-wine` / `--hy-wine-pressed`                   | #7A1F3D / #5C1430                                | Nút chính, liên kết, trạng thái đang chọn     |
| `--hy-wine-soft`                                    | #F5E4E9                                          | Nền mục sidebar đang chọn, vòng bước hiện tại |
| `--hy-cream` · `--hy-surface` · `--hy-surface-warm` | #FFF8F1 · #FFFFFF · #FBF4EE                      | Nền trang · thẻ · khối phụ                    |
| `--hy-ink` · `--hy-ink-muted`                       | #2B1D22 · #6E5D63                                | Chữ chính · chữ phụ                           |
| `--hy-outline` · `--hy-outline-strong`              | #EADFD6 · #9A877F                                | Viền thẻ · viền ô nhập                        |
| `--hy-champagne` · `--hy-peach`                     | #C9A46A · #F4B9A7                                | Trang trí, monogram, cánh hoa                 |
| success / warning / error / info                    | #2F6B4F, #8A5300, #C62828, #3F5B6B (+ nền `-bg`) | Chip trạng thái (luôn kèm chữ)                |
| `--hy-radius-sm/md/lg`                              | 12 / 16 / 24px                                   | Ô nhập & nút / thẻ / sheet, ảnh lớn           |
| `--hy-dur-fast/medium/medium2/long`                 | 150 / 250 / 300 / 400ms                          | Nhấn nút / card / chuyển trang / Hero         |
| `--hy-ease-emphasized/decelerate/accelerate`        | Material 3                                       | Vào: decelerate · ra: accelerate              |

Biến cũ (`--navy`, `--paper`, `--primary`, `--canvas`, `--rule`…) vẫn giữ tên nhưng trỏ sang giá trị Hỷ Yến,
nên CSS v0 cũ tự đổi tông. Khi viết CSS mới, dùng thẳng biến `--hy-*`.

## Chuyển động (prototype ghi widget Flutter → bản CSS ở đây)

| Prototype                                | wedding-web                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Press scale 0.97 / 150ms                 | `:active { transform: scale(0.97) }` trên nút                                  |
| Shared axis / fade-through khi đổi trang | `.content-inner` animation `hy-enter` 300ms                                    |
| Danh sách stagger 50ms × 8               | `animation-delay` theo `:nth-child` (bảng, danh sách, thẻ sảnh)                |
| Thanh tiến độ hành trình 450ms           | `.hy-journey-track span` scaleX                                                |
| Cánh hoa ≤ 1,2s, một lần                 | `src/design-system/celebrate.tsx` (đặt cọc thành công, hợp đồng duyệt đủ)      |
| Giảm chuyển động                         | `@media (prefers-reduced-motion: reduce)` → fade ≤ 150ms, không trượt/phóng to |

## Component dùng chung mới (src/design-system)

- `BrandMark` – logo Hỷ Yến (monogram HY + tên). `JourneyStepper` + `journeyIndex(phase, eventDate)` – hành trình 6 bước.
- `Celebrate` – cánh hoa chúc mừng (trang trí, aria-hidden, sessionStorage để không lặp khi tải lại).
- `Skeleton` – khung chờ shimmer; vẫn giữ câu "Đang tải…" trong `role="status"` cho trình đọc màn hình.
- `OfflineBanner` – banner mất mạng toàn web (gắn trong `app/layout.tsx`).
- Sơ đồ bàn: thu phóng 100–400% bằng `viewBox` (`zoomedViewBox` trong `seating-api.ts`), kéo để di chuyển.
- Ảnh hero trang chủ: parallax bằng CSS scroll-driven animation (trình duyệt không hỗ trợ thì ảnh đứng yên).

Lưu ý khi viết animation: dùng `animation-fill-mode: backwards`, không dùng `both` cho keyframe có
`transform` – phần tử giữ transform sẽ thành khối chứa của `position: fixed` (từng làm lộ skip-link).

## Web v2 (P2 + C1) – prototype trong `docs/design/hy-yen/web-v2/`

Bảng route nằm ở `src/routes.ts` (dùng `routes.x` thay vì gõ chuỗi). Route cũ chuyển hướng 308 (`legacyRedirects`).

| Mã    | Màn                                      | Route                                                                 | Cách render                                        |
| ----- | ---------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| A2    | Trang chủ + Ước tính                     | `/`                                                                   | Server Component + ISR 300s, ước tính chạy client  |
| A3    | Sảnh / chi tiết sảnh                     | `/sanh?khach=`, `/sanh/[id]`                                          | SC + ISR; lọc số khách ở client                    |
| A4    | Thực đơn                                 | `/thuc-don`                                                           | SC + ISR                                           |
| A2/A5 | Tư vấn / đã gửi                          | `/tu-van?sanh=&thuc-don=&ngay=&khach=&ca=`, `/tu-van/da-gui`          | SC + form client                                   |
| T1–T4 | Đăng nhập, quên mật khẩu, lời mời, hồ sơ | `/dang-nhap`, `/quen-mat-khau`, `/loi-moi#invitationToken=`, `/ho-so` | Client                                             |
| B1    | Tổng quan                                | `/khong-gian`                                                         | Layout giữ `SpaceProvider` (cache) + `SpaceShell`  |
| B2    | Kịch bản / Tên / Hợp đồng                | `/khong-gian/thoa-thuan/{kich-ban,ten,hop-dong}`                      | Client                                             |
| B3    | Ví tiệc / kết quả VNPay                  | `/khong-gian/thanh-toan`, `/khong-gian/thanh-toan/ket-qua`            | Client (không tin `vnp_*`)                         |
| B4    | Khách & sơ đồ / Thiệp / Phụ lục          | `/khong-gian/chuan-bi/{khach[?xem=so-do],thiep,phu-luc}`              | Client, sơ đồ + Studio tách chunk (`next/dynamic`) |
| B5/B6 | Quyết toán / Thông báo                   | `/khong-gian/quyet-toan`, `/khong-gian/thong-bao`                     | Client                                             |
| C1    | Thiệp khách                              | `/t/[slug]`, `/t/ca-nhan#credential=wgc_…`                            | SC + ISR / client                                  |

Khác prototype có chủ đích: thiệp cá nhân giữ mã trong `#fragment` (không dùng `?k=`), lời mời dùng
`/loi-moi#…` (không đưa mã vào path), sảnh dùng UUID (API chưa có slug), mục Ưu đãi ẩn khi
`src/content/public-content.ts` chưa có ưu đãi thật, thẻ "quản lý tiệc phụ trách" thay bằng liên hệ nhà hàng.

Font: tự host qua `next/font/local` (`app/fonts.ts`, file woff2 đã subset Latin + tiếng Việt trong
`app/fonts/`, giấy phép OFL kèm theo). `app/fonts.css` đặt font next/font lên đầu token chữ.

## Chênh lệch prototype ↔ chức năng hiện có (cần nhóm quyết)

1. Prototype có màn "Đổi / huỷ tiệc" riêng (C3); web hiện để yêu cầu đổi/huỷ trong trang Đề xuất & kịch bản.
2. Prototype bỏ thanh trên, đưa logo + thẻ cặp đôi vào sidebar; web giữ thanh trên (sáng màu) vì đang chứa chuông
   thông báo và menu mobile.
3. Prototype khoá mục sau cọc ngay trong sidebar (icon khoá); web khoá ở từng trang (`CouplePage requireFull`).
4. Prototype có bản đồ / nút "Mở bản đồ" trên thiệp G1; API thiệp hiện chưa trả địa chỉ nhà hàng.
5. Trang Chi tiết sảnh trong prototype có "Tiện ích" và "Gói thực đơn áp dụng"; API catalog sảnh chưa có các trường này.
