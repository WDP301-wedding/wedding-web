# Prompt Claude Code – Triển khai Web khách hàng v2 (Toàn)

Chép folder `01_Toan_Web-Khach-Hang` (trừ `_v1-tham-khao`) vào `wedding-web/docs/design/hy-yen/web-v2/` trước khi chạy. Làm trên nhánh mới từ `feature/hy-yen-ui`. Bật plan mode cho lượt đầu.

```text
Bối cảnh: repo wedding-web (Next.js 16, React 19). Đã có design system Hỷ Yến (app/globals.css token, app/hy-yen.css, src/design-system/*) và toàn bộ tích hợp API WEDDING-CONTRACT-3. Nhiệm vụ: đổi KIẾN TRÚC THÔNG TIN và BỐ CỤC theo prototype v2 trong docs/design/hy-yen/web-v2/ (đọc "Hỷ Yến Web v2 - Rà soát.dc.html" trước: sitemap, bảng màn → route, checklist). Prototype chỉ để tham khảo, không copy support.js.

Ràng buộc:
1. AGENTS.md (nạp qua CLAUDE.md): chữ tiếng Việt chỉ dùng font token sans; không sửa/nới src/design-system/typography.test.ts.
2. Giữ nguyên lớp dữ liệu: src/lib/**, *-api.ts, gateway, Idempotency-Key, expectedRevision, describeApiError. Chỉ tái sử dụng và bố trí lại UI.
3. Không bao giờ có ô nhập mã hồ sơ/mã giao dịch: tiệc tự chọn (URL → tiệc đầu tiên), giao dịch đang dở tự mở lại (localStorage lastCheckoutKey đã có).
4. Route mới theo bảng Rà soát (/sanh, /thuc-don, /tu-van, /dang-nhap, /quen-mat-khau, /loi-moi/[token], /ho-so, /khong-gian/...). TẤT CẢ route cũ (/halls, /menus, /consultation, /account, /overview, /workspace, /contract, /billing, /payment-return, /guests, /seating, /invitations, /appendices, /invoices, /notifications, /invitation/[slug], /invitation/personal) phải chuyển hướng 308 sang route mới (next.config redirects) để link trong email không hỏng.
5. Hai điểm prototype KHÔNG được làm theo vì sai bảo mật/backend:
   - Thiệp cá nhân: giữ mã khách trong #fragment (#credential=wgc_…), KHÔNG đưa vào query ?k=.
   - Kết quả VNPay: không tin tham số vnp_* trên URL; luôn đọc trạng thái giao dịch từ backend (logic hiện có).
   Báo cho mình các URL cần BE đổi: VNPAY_RETURN_URL, NOTIFICATIONS_GUEST_LINK_URL, link lời mời.
6. Hiệu năng (bắt buộc): trang công khai = Server Component + ISR (revalidate catalog); font qua next/font (bỏ @import Google Fonts trong CSS); một lớp cache dữ liệu dùng chung cho /khong-gian (React context hoặc thư viện – hỏi mình trước khi thêm dependency); loading.tsx dùng Skeleton cho mỗi route; dynamic import cho sơ đồ bàn và studio thiệp; ảnh catalog qua next/image kích thước cố định.
7. Công cụ "Ước tính tiệc": số bàn = ceil(khách/10); chi phí = số bàn × priceVndPerTable; ghi rõ "Ước tính – chưa giữ chỗ"; lọc sảnh theo maxGuests. Form tư vấn nhận lựa chọn qua query (?sanh=&thuc-don=&ngay=).
8. Mỗi phase chạy: npm run format:check, lint, typecheck, test, test:coverage, build. Sửa nguyên nhân, không tắt rule. Commit mỗi phase.

Phase gợi ý: 0 kế hoạch + bảng route cũ→mới (dừng chờ duyệt) · 1 next/font + cache + loading.tsx · 2 trang công khai A2–A5 (SC+ISR, ước tính) · 3 tài khoản T1–T4 · 4 khung Không gian cưới (sidebar 5 mục + trạng thái + bottom nav) + Tổng quan · 5 Thoả thuận · 6 Thanh toán · 7 Chuẩn bị (khách & sơ đồ kéo thả, thiệp, phụ lục) · 8 Quyết toán + Thông báo + Thiệp khách mời · 9 redirect, rà soát a11y/motion, ảnh chụp 390/1440.
Lượt này: chỉ làm Phase 0 – đọc code + prototype, đề xuất kế hoạch và bảng route, liệt kê chênh lệch prototype ↔ API. Chưa sửa code.
```
