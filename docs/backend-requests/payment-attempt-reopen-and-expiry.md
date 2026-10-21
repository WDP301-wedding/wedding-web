# Yêu cầu Backend: mở lại đường dẫn VNPay & giao dịch hết hạn

- Người gửi: FE wedding-web (Toàn) · 19/10/2026
- Backend tham chiếu: `wedding-be` `main` @ `2d2a1d4` (PR #76)
- Phạm vi: `GET /api/v1/bookings/{bookingId}/payments/{attemptId}` và luồng tạo giao dịch VNPay (đặt cọc + thanh toán còn lại)

## Tình huống tái hiện

1. Couple bấm "Thanh toán còn lại" → `POST /payments/balance` trả `checkoutUrl`, `expiresAt` (+15 phút).
2. Couple mở VNPay nhưng **chưa trả tiền**, quay lại web bấm "Kiểm tra trạng thái".
3. `GET /payments/{attemptId}` gọi `reconcile` → VNPay `querydr` chưa có giao dịch → backend chuyển attempt sang **`UNKNOWN`**.
4. Couple muốn quét lại mã QR.

FE đã sửa phần của FE: vẫn hiện nút "Tiếp tục trên VNPay" khi `CREATED | PENDING | UNKNOWN` và chưa quá `expiresAt`
(commit trên nhánh `fix/be-pr76-sync`). Còn 2 vấn đề FE **không tự xử lý được**:

---

## BE-1. `GET /payments/{attemptId}` không trả `checkoutUrl` (đã chọn hướng A)

**Hiện trạng**

- `checkoutUrl` chỉ có trong response của `POST /payments/deposit|balance`.
- `GET /payments/{attemptId}` (`payments-billing.http-services.ts`, hàm đọc attempt ~dòng 330–380) chỉ trả
  `paymentAttemptId, status, purpose, amountVnd, applicationStatus, expiresAt`.

**Hệ quả**: Couple tải lại trang, mở tab khác hoặc quay về từ trang kết quả VNPay → FE mất đường dẫn → không thể
quét lại QR dù giao dịch vẫn còn hạn. FE không thể tạo giao dịch mới vì backend chặn `PAYMENT_ATTEMPT_ACTIVE`.

**Đề xuất**

- Thêm trường tuỳ chọn `checkoutUrl` (format `uri`) vào `data` của `GET /payments/{attemptId}`, **chỉ khi**:
  - `provider === 'VNPAY'`, và
  - `status ∈ { CREATED, PENDING, UNKNOWN }`, và
  - `now < expiresAt`.
- Ngược lại bỏ trường (không trả `null` lẫn lộn), để FE biết là không mở lại được.
- Dữ liệu đã có sẵn: `reconcile` đã đọc `snapshot.checkout` (tham số đã lưu), chỉ cần
  `protocol.checkoutUrl(checkout.parameters)` — giống `prepareCheckout`. Không ký lại, không tạo `vnp_TxnRef` mới.
- Giữ nguyên phân quyền hiện tại (DEPOSIT: RESTRICTED, BALANCE: FULL).
- Cập nhật OpenAPI (`BillingAttemptResponse`) + test.

**Tiêu chí nghiệm thu**

- [ ] Attempt `PENDING`/`UNKNOWN` còn hạn → có `checkoutUrl` và trùng URL đã trả ở lần POST.
- [ ] Attempt `SUCCEEDED`/`FAILED` hoặc đã quá `expiresAt` → không có `checkoutUrl`.
- [ ] Gọi GET nhiều lần không tạo giao dịch / không đổi `vnp_TxnRef`.

**FE sẽ làm sau khi BE merge**: `npm run api:generate`, dùng `attempt.checkoutUrl` (kèm kiểm tra origin
`sandbox.vnpayment.vn` như hiện tại) để hiện nút "Tiếp tục trên VNPay" cả sau khi tải lại trang.

---

## BE-2. Giao dịch hết hạn mà chưa trả bị kẹt ở `UNKNOWN` → không thể thanh toán lại

**Hiện trạng**

- Tạo giao dịch mới bị chặn khi còn attempt cùng mục đích ở `CREATED | PENDING | UNKNOWN`:
  - `infrastructure/billing.persistence.ts` (~dòng 206) → `PAYMENT_ATTEMPT_ACTIVE`
  - `infrastructure/billing-operations.repository.ts` `requireBalanceAvailable` (~dòng 44–57) → `PAYMENT_ATTEMPT_ACTIVE`
  - `balancePaymentEligibility` cũng trả `canPay: false, reasonCode: PAYMENT_ATTEMPT_ACTIVE`.
- `application/vnpay.service.ts` `reconcile` (~dòng 260–275): VNPay không tìm thấy giao dịch
  ("missing order") → `markUnknown` → **luôn `UNKNOWN`**, kể cả khi đã quá `expiresAt`.
- Không có job/endpoint nào chuyển attempt quá hạn sang `FAILED`.

**Hệ quả**: Couple mở VNPay nhưng không trả tiền (đổi ý, lỗi ngân hàng, đóng tab…) → sau 15 phút đường dẫn chết,
attempt vẫn `UNKNOWN` **vĩnh viễn** → nút thanh toán bị khoá mãi (`PAYMENT_ATTEMPT_ACTIVE`). Với đặt cọc,
`recordUnknown` còn có thể giữ booking ở trạng thái chờ.

FE **không được** tự coi hết hạn là thất bại (hand-off PR #76 mục 4), nên phải sửa ở backend.

**Đề xuất (chọn 1 hoặc kết hợp)**

1. **Tự động (khuyến nghị):** trong `reconcile`, nếu `now > expiresAt + grace` (vd. 15 phút, phòng IPN đến trễ) **và**
   `querydr` trả kết quả xác thực được là VNPay không có giao dịch thành công (mã "không tìm thấy"/chưa thanh toán)
   → áp evidence `VERIFIED_FAILURE` (attempt → `FAILED`, giải phóng deposit intent như luồng FAILED hiện có).
   Nếu `querydr` lỗi mạng/không xác thực được → vẫn giữ `UNKNOWN` như hiện nay.
2. **Thủ công:** endpoint cho Manager đóng attempt quá hạn (`→ FAILED`) sau khi đối soát trên cổng VNPay, có audit log.

**Tiêu chí nghiệm thu**

- [ ] Attempt quá hạn + VNPay xác nhận không có giao dịch → `FAILED`; `balancePaymentEligibility.canPay` trở lại `true`
      (nếu các điều kiện khác đạt) và POST mới tạo được giao dịch mới.
- [ ] Attempt quá hạn nhưng VNPay báo đã thanh toán (IPN trễ) → `SUCCEEDED`, không bị đánh `FAILED`.
- [ ] `querydr` timeout/lỗi chữ ký → vẫn `UNKNOWN`, không tự `FAILED`.
- [ ] Đặt cọc: attempt `FAILED` do hết hạn giải phóng deposit intent giống `releaseVerifiedFailure`.

**FE sau khi BE merge**: không cần đổi code — FE đã khoá/mở nút theo `canPay`; chỉ cần E2E lại.
