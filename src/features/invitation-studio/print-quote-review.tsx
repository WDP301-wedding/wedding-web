'use client';

import { useCallback, useState } from 'react';
import type { InvitationGateway, PrintRequestQuote } from './invitation-api';
import { PrintableFilePreview } from './printable-file-preview';
import { ix } from './studio-classes';
import { px } from './studio-panel-classes';

export function PrintQuoteReview({
  quote,
  bookingId,
  accessToken,
  gateway,
  busy,
  onConfirm,
}: Readonly<{
  quote: PrintRequestQuote;
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
  busy: boolean;
  onConfirm: () => Promise<void>;
}>) {
  const [ready, setReady] = useState<ReadonlySet<string>>(new Set());
  const previewReady = useCallback(
    (id: string) => setReady((previous) => new Set([...previous, id])),
    [],
  );
  const allReady = quote.document.lines.every((line) => ready.has(line.printableRevisionId));
  return (
    <section aria-labelledby="print-cost-preview" className={ix.callout}>
      <h3 id="print-cost-preview" className={ix.subtitle}>
        Bản in và chi phí cần xác nhận
      </h3>
      <p className={ix.hint}>
        Các bản in dưới đây giữ nguyên nội dung đã lưu. Mỗi thiệp áp dụng chuẩn in chung của nhà
        hàng, giá 5.000đ.
      </p>
      {quote.document.lines.map((line) => (
        <article key={line.printableRevisionId} className={px.order}>
          <h4 className={ix.subtitleSm}>{line.title}</h4>
          <p className={px.orderBrief}>
            {line.quantity.toLocaleString('vi-VN')} thiệp ×{' '}
            {line.line.unitPriceVnd.toLocaleString('vi-VN')} đ
            <strong>{line.line.lineTotalVnd.toLocaleString('vi-VN')} đ</strong>
          </p>
          <PrintableFilePreview
            bookingId={bookingId}
            accessToken={accessToken}
            gateway={gateway}
            printableRevisionId={line.printableRevisionId}
            title={line.title}
            onReady={previewReady}
          />
        </article>
      ))}
      <p className={px.orderBrief}>
        Tổng chi phí do hệ thống tính{' '}
        <strong>{quote.document.totalVnd.toLocaleString('vi-VN')} đ</strong>
      </p>
      <p className={ix.meta}>
        Xác nhận sẽ ghi nhận sự đồng ý của bạn trên phụ lục. Nhà hàng duyệt cùng phiên bản thì chi
        phí mới có hiệu lực và hệ thống mới tạo đơn in.
      </p>
      {!allReady ? (
        <p role="status" className={ix.meta}>
          Cần tải được tất cả bản in trước khi xác nhận.
        </p>
      ) : null}
      <button
        type="button"
        className={ix.btn}
        disabled={busy || !allReady}
        onClick={() => void onConfirm()}
      >
        {busy ? 'Đang xử lý…' : 'Xác nhận đặt in và chi phí'}
      </button>
    </section>
  );
}
