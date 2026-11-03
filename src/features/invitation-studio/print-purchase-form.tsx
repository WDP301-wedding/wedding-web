'use client';
import { HySelect } from '../../components/ui/select-field';

import type { InvitationStudioState } from './use-invitation-studio';
import { formatDateTime } from '../couple-workspace/workspace-helpers';
import { ix } from './studio-classes';
export function PrintPurchaseForm({ studio }: Readonly<{ studio: InvitationStudioState }>) {
  const p = studio.purchase;
  if (!p.availability)
    return (
      <div className={ix.card}>
        <p role="status">Đang kiểm tra điều kiện đặt in…</p>
        {p.catalogError ? (
          <div role="alert">
            <p>{p.catalogError}</p>
            <button type="button" onClick={() => void p.retryAvailability()}>
              Thử lại
            </button>
          </div>
        ) : null}
      </div>
    );
  if (!p.availability.canOrder) {
    const reasons: Record<string, string> = {
      BOOKING_CLOSED: 'Tiệc đã kết thúc hoặc hủy. Chỉ xem lịch sử đơn in, không tạo đơn mới.',
      PRINT_APPENDIX_PENDING:
        'Tiệc đang có phụ lục chờ xử lý. Hoàn tất hoặc hủy yêu cầu đang chờ trước khi đặt thêm.',
      INVOICE_FINALIZED: 'Tiệc đã chốt quyết toán. Không thể tạo thêm phụ lục đặt in.',
      PAYMENT_ATTEMPT_ACTIVE:
        'Đang có giao dịch cần đối soát. Chờ giao dịch được xử lý trước khi đặt in.',
      SETTLED_CONTRACT_REQUIRED:
        'Đặt in theo phụ lục mở sau khi hợp đồng và khoản cọc được xác nhận.',
    };
    return (
      <div className={ix.card}>
        <h2 className={ix.title}>Đặt in thiệp</h2>
        <p>
          {p.availability.legacy
            ? 'Hồ sơ này dùng cơ chế in cũ. Gửi yêu cầu bên dưới để nhà hàng báo giá; chứng từ cũ được giữ nguyên.'
            : (reasons[p.availability.blockReason ?? ''] ??
              'Hồ sơ chưa đủ điều kiện đặt in. Vui lòng liên hệ nhà hàng.')}
        </p>
        <button
          type="button"
          className={ix.btnSmallOutline}
          onClick={() => void p.retryAvailability()}
        >
          Cập nhật trạng thái
        </button>
      </div>
    );
  }
  return (
    <div className={ix.card}>
      <h2 className={ix.title}>Đặt in thiệp sau đặt cọc</h2>
      <p className={ix.hint}>
        Lưu và xuất bản thiệp ở mục Chia sẻ trước khi xem bản in. Chi phí in được lập thành phụ lục
        riêng, không tính lại cọc.
      </p>
      {studio.designDirty ? (
        <p role="status">Bạn đang sửa thiệp. Hãy lưu thiết kế trước khi xem giá và xác nhận.</p>
      ) : null}
      {p.catalogError ? (
        <div role="alert">
          <p>{p.catalogError}</p>
          <button type="button" onClick={p.retryCatalog} className={ix.btnSmallOutline}>
            Tải lại quy cách in
          </button>
        </div>
      ) : null}
      {!p.offerings.length && !p.catalogError ? (
        <p>Chưa có quy cách in khả dụng. Vui lòng liên hệ nhà hàng.</p>
      ) : null}
      <label className={ix.label} htmlFor="purchase-offering">
        Quy cách và chất liệu
      </label>
      <HySelect
        id="purchase-offering"
        className={ix.input}
        value={p.offeringId}
        disabled={p.busy}
        onChange={(e) => p.setOfferingId(e.target.value)}
      >
        <option value="">Chọn quy cách in</option>
        {p.offerings.map((item) => (
          <option key={item.offeringId} value={item.offeringId}>
            {item.name} · {item.printType} · {item.material} ·{' '}
            {item.unitPriceVnd.toLocaleString('vi-VN')} đ/thiệp
          </option>
        ))}
      </HySelect>
      <label className={ix.label} htmlFor="purchase-quantity">
        Số lượng thiệp
      </label>
      <input
        id="purchase-quantity"
        className={ix.input}
        type="number"
        min={1}
        max={10000}
        value={p.quantity}
        disabled={p.busy}
        onChange={(e) => p.setQuantity(Number(e.target.value))}
      />
      <button
        type="button"
        className={ix.btn}
        disabled={
          p.busy ||
          studio.designDirty ||
          !studio.currentDesign ||
          !p.offering ||
          !Number.isInteger(p.quantity) ||
          p.quantity < 1 ||
          p.quantity > 10000
        }
        onClick={() => void p.preview()}
      >
        {p.busy ? 'Đang xử lý…' : 'Xem bản in và giá chính thức'}
      </button>
      {p.error ? <p role="alert">{p.error}</p> : null}
      {p.quote ? (
        <section aria-label="Bản in và chi phí cần xác nhận" className={ix.form}>
          <p>
            <strong>{p.quote.value.document.quantity} thiệp</strong> ·{' '}
            {p.quote.value.document.printType} · {p.quote.value.document.material}
          </p>
          <p>Đơn giá: {p.quote.value.document.line.unitPriceVnd.toLocaleString('vi-VN')} đ/thiệp</p>
          <p>
            Thành tiền:{' '}
            <strong>{p.quote.value.document.line.lineTotalVnd.toLocaleString('vi-VN')} đ</strong>
          </p>
          <p className={ix.hint}>
            Giá có hiệu lực đến {formatDateTime(p.quote.value.expiresAt)}. Thay đổi lựa chọn cần xem
            và xác nhận lại.
          </p>
          <iframe title="Bản in thiệp chính thức" src={p.quote.pdfUrl} width="100%" height="460" />
          <a href={p.quote.pdfUrl} download="ban-in-thiep.pdf">
            Tải bản in để kiểm tra
          </a>
          <button
            type="button"
            className={ix.btn}
            disabled={p.busy}
            onClick={() => void p.submit()}
          >
            Xác nhận đặt in và chi phí
          </button>
        </section>
      ) : null}
    </div>
  );
}
