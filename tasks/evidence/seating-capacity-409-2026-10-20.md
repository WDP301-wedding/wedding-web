# Lỗi 409 khi xác nhận sơ đồ — 20/10/2026

## Nguyên nhân và bằng chứng

Ảnh người dùng ghi nhận POST `/bookings/{bookingId}/seating-plans/{planId}/confirmation`
trả 409, mã hỗ trợ `f6519159-1215-49cc-9865-d853ccc66cab`.
Đây là bước xác nhận, không phải POST lưu nhãn bàn.

Đọc có giới hạn bằng transaction `BEGIN READ ONLY` trên DB cấu hình hiện tại:

| Fact                                              | Giá trị                                |
| ------------------------------------------------- | -------------------------------------- |
| bookingId                                         | `bb31b097-d3da-475c-af63-72453cf25df0` |
| planId                                            | `78e16055-c2c0-4431-a912-2cbe93805332` |
| revisionNumber / status                           | `4` / `DRAFT`                          |
| bookingRevision của snapshot / booking hiện tại   | `13` / `13`                            |
| planningHeadcount của snapshot / booking hiện tại | `70` / `70`                            |
| layoutName                                        | `PERF-TEST Orchid 50`                  |
| minGuests / maxGuests / totalSeatCapacity         | `50` / `50` / `50`                     |

Truy vấn các phiên bản đang xuất bản của LayoutTemplate ACTIVE thuộc sảnh của
booking trả đúng một mẫu: `PERF-TEST Orchid 50`, 50–50 khách, tổng 50 ghế.
Chưa có mẫu xuất bản phù hợp cho 70 khách trong danh mục đọc được.
Không đọc danh sách người thật, thông tin liên hệ, mật khẩu hoặc token vào evidence.

Backend `capacityProblem` trả `EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY` khi
`planningHeadcount > min(hallMaxGuests, totalSeatCapacity)`. Với 70 > 50,
xác nhận phải bị từ chối; Manager cũng không được duyệt vượt số ghế thực tế.
Frontend chưa ánh xạ mã này nên rơi về thông báo HTTP 409 chung:
“Dữ liệu vừa thay đổi. Hãy tải lại rồi thử lại.” Reload không sửa thiếu sức chứa.

Không lấy lại được log Railway khớp mã hỗ trợ trong cửa sổ truy vấn; mã lỗi của
request trong ảnh được suy ra từ fact hiện tại và nhánh xử lý xác định ở source,
không trình bày như một response body đã thu trực tiếp. Không thể khôi phục
payload/revision chính xác của request trong ảnh chỉ từ trạng thái DB hiện tại.

## Bản sửa frontend

- Ánh xạ mã lỗi sức chứa sang hướng dẫn chọn mẫu đủ chỗ/liên hệ nhà hàng;
  giữ nguyên request ID để hỗ trợ đối chiếu.
- Hiện số khách, số ghế và số chỗ thiếu; vô hiệu hóa xác nhận khi snapshot đã
  cho thấy không đủ chỗ hoặc ngoài khoảng xác nhận thông thường.
- Dịch warning của mẫu và phân biệt “Không đủ chỗ” với “Ngoài khoảng”.
- Giải thích khi sảnh chưa có mẫu phù hợp. Không tự giảm planningHeadcount,
  tạo geometry/mẫu mới hoặc sửa dữ liệu đang dùng.
- Giữ ngoại lệ khoảng khách đã được Manager duyệt còn hiệu lực, trong giới hạn
  sức chứa thực tế. Server vẫn revalidate quyền, revision, nhóm và sức chứa.

Không thay đổi backend runtime, schema, migration hoặc shared booking/catalog.
Các diff có sẵn ngoài bốn file hotfix được giữ nguyên.

## Kiểm chứng

- RED: trước sửa, 4 assertion thất bại đúng lỗi: nút vẫn cho xác nhận vượt ghế/
  ngoài khoảng và thông báo API vẫn khuyên reload.
- `npm test -- --maxWorkers=1`: 33 files / 219 tests pass sau sửa.
- Sau bổ sung notice không có mẫu phù hợp, focused seating/API/error/typography:
  4 files / 19 tests pass.
- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
  Cache `.next/dev/types` cũ tham chiếu route đã bỏ được chuyển sang
  `node_modules/.cache/seating-stale-types-20261020`; không sửa source hay gate
  để bỏ lỗi typecheck.
- `git diff --check` và Prettier bốn file hotfix: pass.
- Backend focused `src/modules/seating-plan/domain/seating-policy.test.ts`:
  3 tests pass; không phải live provider/native integration acceptance mới.
- Browser cục bộ render SeatingPage thật, mock session/API chỉ trong harness
  `test-results/seating-check/`: cảnh báo 70/50 và nút disabled; chọn mẫu 80 ghế
  giả lập rồi xác nhận, thấy trạng thái thành công. Desktop 1280 px và mobile
  390 px đã kiểm tra chữ tiếng Việt/cảnh báo.
  Ảnh cục bộ: `desktop-capacity.png`, `desktop-confirmed.png`, `mobile-capacity.png`
  trong thư mục harness. Logo Next/Image không phục vụ trong harness; không
  tính đây là bằng chứng asset/Next runtime hay E2E deploy.

## Giới hạn và việc còn lại

Tại thời điểm kết thúc chẩn đoán ban đầu, hotfix chưa commit/push/deploy. Truy cập browser URL Vercel
thật dừng ở “Cần đăng nhập”; không có phiên tài khoản để chạy mutation thật.
Không thay đổi trạng thái sơ đồ trong ảnh hoặc ghi thêm mẫu lên danh mục dùng chung.

Để booking 70 khách xác nhận được, nhà hàng cần tạo/xuất bản mẫu có tổng ghế ít
nhất 70, khoảng khách bao gồm 70 và không vượt sức chứa sảnh. Không nên đổi số
khách chỉ để qua validation. Sau triển khai frontend cần E2E bằng fixture được
cấp quyền với mẫu phù hợp. FE-11 và toàn bộ checklist E2E chung vẫn mở.

## Chuẩn bị phát hành theo yêu cầu owner

Owner đã yêu cầu merge và triển khai Vercel ngày 20/10/2026. Bản sửa được tách
sang nhánh riêng từ origin/main mới nhất (baseline b734536), chỉ gồm bốn file
source/test và tài liệu này. Các thay đổi AGENTS.md và kế hoạch tổng thể đang dở
trong workspace gốc không thuộc bản phát hành. Triển khai qua workflow hiện có
sau khi kiểm tra đúng PR head; giữ lại mã deploy trước để rollback.

Workflow hiện có cho phép bước test thất bại; vì vậy trạng thái job xanh không
được coi là đủ bằng chứng test. Kiểm tra thêm kết quả test và log của bước đó
trước merge. Không thay đổi hoặc nới gate CI trong hotfix này.
