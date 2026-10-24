# 01 – Web khách hàng · Nguyễn Tuấn Toàn → `wedding-web` (Next.js 16)

Mở: `Hỷ Yến Web Khách Hàng v2.dc.html` (prototype) và `Hỷ Yến Web v2 - Rà soát.dc.html` (sitemap, bảng màn → route, checklist).

| File | Màn | Mã |
|---|---|---|
| `V2Public.dc.html` | Trang chủ + Ước tính tiệc · Danh sách sảnh · Chi tiết sảnh · Thực đơn · Gửi tư vấn · Gửi thành công | A2–A5 |
| `V2Account.dc.html` | Đăng nhập · Quên mật khẩu (email → OTP → mật khẩu mới) · Nhận lời mời (hết hạn / đã dùng) · Hồ sơ & phiên đăng nhập | T1–T4 |
| `V2Space.dc.html` | **Khung Không gian cưới** (sidebar 5 mục có trạng thái, header, bottom nav) + Tổng quan; nạp các màn con bên dưới | B1 |
| `V2Agreement.dc.html` | Thoả thuận: Kịch bản → Tên cô dâu & chú rể → Hợp đồng | B2 |
| `V2Payment.dc.html` | Thanh toán · Ví tiệc · Kết quả VNPay 4 trạng thái | B3 |
| `V2Guests.dc.html` | Chuẩn bị: Khách & sơ đồ (chia đôi màn, kéo nhóm vào bàn) | B4 |
| `V2Card.dc.html` | Chuẩn bị: Thiệp & in (soạn 3 cột, xuất bản 3 bước, đơn in) | B4 |
| `V2Addendum.dc.html` | Chuẩn bị: Phụ lục (trước/sau, chênh lệch) | B4 |
| `V2Settle.dc.html` | Quyết toán (phát sinh, hoá đơn biên lai, số dư) | B5 |
| `V2Notifs.dc.html` | Thông báo | B6 |
| `V2Guest.dc.html` | Thiệp khách mời (công khai / cá nhân) | C1 |
| `HyState.dc.html`, `support.js`, `hy-motion.js` | dùng chung – không sửa | – |

## Implementation references

The one-off v2 implementation prompt has been retired. Keep this screen map and
its prototypes as design references; current execution status is maintained in
[plan](../../../../tasks/plan.md) and [todo](../../../../tasks/todo.md).
Use the repository AGENTS.md typography rules and existing API transport,
idempotency, revision and authorization boundaries. Prototype data is not a source
of business rules or prices. Personal invitation credentials stay in URL fragments;
VNPay redirect parameters are not proof of payment. Existing route compatibility
and server-authoritative payment state must be preserved.

VNPay reopening/expiry now uses the implemented
[backend hand-off](../../../../../wedding-be/docs/payment-attempt-reopen-and-expiry.md)
and its linked verification record; the earlier frontend request was removed.
