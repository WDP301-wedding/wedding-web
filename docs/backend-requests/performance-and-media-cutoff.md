# Yêu cầu Backend: độ chậm phần Chuẩn bị & mốc khoá ảnh

- Người gửi: FE wedding-web (Toàn) · 21/10/2026
- Backend tham chiếu: `wedding-be` `main` @ `7be274e`
- Cách đo: trình duyệt thật (`localhost:3000` → proxy → Railway production), booking
  `PERF-TEST Staff event and Storage` (`984bd852-…`), Resource Timing API.

## Kết quả đo (trước khi FE sửa)

| Thời điểm bắt đầu | Thời gian | Request                                      |
| ----------------- | --------- | -------------------------------------------- |
| 0.4 s             | 3.2 s     | POST `/auth/web-session-refreshes`           |
| 3.7 s             | 0.4 s     | GET `/auth/me`                               |
| 4.0 s             | 2.0 s     | GET `/couple/bookings`                       |
| 6.0 s             | 1.7 s     | GET `/bookings/{id}/proposal`                |
| 7.8 s             | 3.4 s     | GET `attendance-summary`                     |
| 7.8 s             | 4.4 s     | GET `guest-groups`                           |
| 7.8 s             | 5.9 s     | GET `check-in-settings`                      |
| 7.8 s             | 7.0 s     | GET `guest-plan`                             |
| 7.8 s             | 9.5 s     | GET `guests?limit=50&status=ACTIVE` (8 dòng) |

5 GET gửi **song song** nhưng hoàn thành theo **bậc thang ~1.2–1.5 s** → backend xử lý
**tuần tự**. Request thứ 6+ vượt timeout 10 s của FE → trang báo "Không kết nối được máy chủ".

## Nguyên nhân phía backend (theo tài liệu BE hiện có)

1. **Mỗi module chỉ 1 kết nối DB** — `docs/backend-performance-11-pool-result-2026-10-17.md`:
   `DB_POOL_MAX=1` cho Identity, Booking, Billing, Invitation, Guest, Notifications. Mọi GET của
   trang Khách dùng chung pool Guest (và pool Identity/Booking để kiểm tra phiên/quyền) → xếp hàng.
2. **Server và DB ở hai châu lục** — Railway `us-west2` (SFO) còn Supabase ở `ap-southeast-2`
   (Sydney) (`docs/railway-api-performance-audit-2026-10-16.md`,
   `docs/backend-performance-04-region-2026-10-17.md`). Mỗi truy vấn vượt Thái Bình Dương;
   một request cần nhiều truy vấn (phiên → quyền booking → dữ liệu) ⇒ ~1–1.5 s/request.
   Người dùng ở Việt Nam còn đi thêm chặng ingress Singapore → SFO.

## Đề xuất (theo thứ tự hiệu quả/chi phí)

1. **Đặt server cùng vùng với DB** (Railway Singapore hoặc chuyển DB về gần server). Đây là yếu tố
   nhân lên mọi truy vấn. Tài liệu PERF-04 đã có thử nghiệm Singapore — nên hoàn tất.
2. **Tăng `DB_POOL_MAX` cho Guest/Booking/Identity lên 2–3.** Ngân sách hiện còn ~11 slot dự phòng
   (reserve 36). Pool 1 khiến mọi trang có ≥2 GET song song bị tuần tự hoá.
3. **Endpoint gộp cho trang Khách** (vd. `GET /bookings/{id}/guest-workspace` trả groups + plan +
   check-in settings + attendance + trang khách đầu) → 1 lần kiểm tra phiên/quyền thay vì 5.
4. **Cache kiểm tra phiên/quyền trong phạm vi request** nếu hiện mỗi service tự đọc lại.

### Tiêu chí nghiệm thu gợi ý

- [ ] Trang Khách (5 GET song song) hoàn tất < 3 s p95 từ Việt Nam.
- [ ] Không còn hiện tượng "bậc thang" khi gửi 5 GET cùng booking.

## Mốc khoá ảnh (MEDIA_CUTOFF_REACHED)

409 khi tạo ảnh AI là **đúng nghiệp vụ**: tiệc 16/10/2026 17:00 đã qua mốc
`eventStart − 72h` (`image-jobs.service.ts` → `studioConflict('MEDIA_CUTOFF_REACHED')`). FE đã hiện
đúng thông báo. Vấn đề còn lại: Couple **không đọc được mốc thật** (chỉ có
`GET /management/bookings/{id}/media-policy` cho Manager), nên FE chỉ có thể ước tính 72 h và
cảnh báo, không dám khoá nút (Manager có thể gia hạn).

**Đề xuất:** thêm `mediaCutoffAt` (ISO) vào một response Couple đọc được — vd. `GET /bookings/{id}/media`
hoặc `GET /bookings/{id}/invitations` — để FE khoá chính xác nút "Tạo ảnh AI"/"Tải ảnh" và hiển thị
"Hạn chỉnh sửa ảnh: …".
