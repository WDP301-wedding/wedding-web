# Giao diện Hỷ Yến cho wedding-web

Nguồn thiết kế: `docs/design/hy-yen/` (prototype Claude Design – chỉ tham khảo, không import vào app).
`design-system/` = token, component, motion spec · `web-khach-hang/` = prototype từng màn (Hy*.dc.html).
Xem prototype: chạy `npx serve docs/design/hy-yen` rồi mở file `.dc.html` (cần Internet để tải React/font).

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

## Ánh xạ màn prototype → route

| Mã      | Prototype            | Route                                                                     |
| ------- | -------------------- | ------------------------------------------------------------------------- |
| P1–P3   | HyPublic             | `/`, `/halls`, `/halls/[id]`, `/menus`, `/consultation`                   |
| A1      | HyAccount            | `/account`, `/password-reset`, `/reset-password`, `/workspace-invitation` |
| C1, N1  | HyOverview           | `/overview`, `/notifications`                                             |
| C2      | HyAgreement          | `/workspace` (timeline), `/contract` (tên + hợp đồng)                     |
| C3      | HyDeposit            | `/billing`, `/payment-return`                                             |
| C4 / C5 | HyGuests / HySeating | `/guests` / `/seating`                                                    |
| C6      | HyStudio             | `/invitations?tab=…`                                                      |
| C7      | HyExtras             | `/appendices`, `/invoices`                                                |
| G1      | HyInvite             | `/invitation/[slug]`, `/invitation/personal`                              |

## Chênh lệch prototype ↔ chức năng hiện có (cần nhóm quyết)

1. Prototype có màn "Đổi / huỷ tiệc" riêng (C3); web hiện để yêu cầu đổi/huỷ trong trang Đề xuất & kịch bản.
2. Prototype bỏ thanh trên, đưa logo + thẻ cặp đôi vào sidebar; web giữ thanh trên (sáng màu) vì đang chứa chuông
   thông báo và menu mobile.
3. Prototype khoá mục sau cọc ngay trong sidebar (icon khoá); web khoá ở từng trang (`CouplePage requireFull`).
4. Prototype có bản đồ / nút "Mở bản đồ" trên thiệp G1; API thiệp hiện chưa trả địa chỉ nhà hàng.
5. Trang Chi tiết sảnh trong prototype có "Tiện ích" và "Gói thực đơn áp dụng"; API catalog sảnh chưa có các trường này.
