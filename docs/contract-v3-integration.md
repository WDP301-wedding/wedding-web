# Tích hợp WEDDING-CONTRACT-3 cho wedding-web

Nhánh `feature/web-contract-v3` · backend `wedding-be@d257be8` · OpenAPI SHA-256 `6a8be825…0db0915`.

## Chạy local với backend production-e1dc

```powershell
npm ci
Copy-Item .env.example .env.local   # BACKEND_ORIGIN + NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
npm run dev -- --port 3000
```

`next.config.ts` chuyển tiếp `/api/v1/*` sang `BACKEND_ORIGIN` để cookie refresh `__Host-wedding-refresh`
(SameSite=Lax) luôn cùng site với trang web. Trên Vercel, `vercel.json` đã có rewrite tương đương.

## Màn hình mới

| Route                  | Nội dung                                                                              | Quyền           |
| ---------------------- | ------------------------------------------------------------------------------------- | --------------- |
| `/contract`            | Tên cô dâu/chú rể, lập hợp đồng nhiều dòng, gửi duyệt, duyệt, rút duyệt, PDF, lịch sử | RESTRICTED/FULL |
| `/billing`             | (đã có) – đặt cọc nay gửi kèm `contractRevisionId` + `documentDigest`                 | RESTRICTED/FULL |
| `/payment-return`      | Trang VNPay trả về: không tin `vnp_*`, mở lại trạng thái giao dịch từ backend         | —               |
| `/guests`              | Số khách dự kiến, nhóm, danh sách tên tùy chọn, import CSV, link cá nhân, check-in    | FULL            |
| `/seating`             | Chọn mẫu sơ đồ, vẽ SVG từ toạ độ backend, gắn nhóm cho bàn, xác nhận                  | FULL            |
| `/appendices`          | Phụ lục sau cọc, trước–sau, chênh lệch; giữ phiên bản giá đã chốt                     | FULL            |
| `/invoices`            | Chi phí phát sinh (chỉ xem), hoá đơn cuối, công nợ                                    | FULL            |
| `/notifications`       | Hộp thư, đánh dấu đọc, tuỳ chọn email nhắc                                            | Đã đăng nhập    |
| `/invitation/personal` | Thiệp cá nhân của Guest (`#credential=wgc_…`), chỉ đọc                                | Guest           |

## Quyết định kỹ thuật

- `src/lib/api/types.ts`: `ApiData<path, method>` / `ApiBody<…>` suy kiểu từ OpenAPI (nhiều DTO mới là inline).
- `useCoupleWorkspace` + `CouplePage`: một chỗ xử lý phiên, chọn tiệc, quyền RESTRICTED/FULL và trạng thái lỗi.
- `useCommand`: mỗi lần bấm = 1 `Idempotency-Key`; lỗi hiển thị theo `error.code` kèm `requestId`.
- `WebIdentitySession.authorize` tự làm mới access token (10 phút) một lần khi gặp 401 rồi chạy lại.
- Chỉ dùng một `browserSession` cho cả ứng dụng (cookie refresh bị xoay vòng mỗi lần dùng).

## Cần backend xác nhận / bổ sung

1. Đặt `VNPAY_RETURN_URL` = `https://<domain-web>/payment-return` và
   `NOTIFICATIONS_GUEST_LINK_URL` = `https://<domain-web>/invitation/personal`.
2. Chưa có API đọc revision hiện tại của link thiệp cá nhân → web lưu ở trình duyệt và dò revision kế tiếp
   khi gặp `GUEST_INVITATION_REVISION_STALE`.
3. Chưa có API liệt kê sơ đồ bàn theo booking → web lưu `seatingPlanId` ở trình duyệt (có ô nhập mã dự phòng).
4. Web đi qua proxy Vercel: xác nhận `AUTH_TRUST_PROXY_HOPS` để giới hạn đăng nhập không tính chung một IP.
