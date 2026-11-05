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
  onBack,
}: Readonly<{
  quote: PrintRequestQuote;
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
  busy: boolean;
  onConfirm: () => Promise<void>;
  onBack: () => void;
}>) {
  const [selectedId, setSelectedId] = useState(quote.document.lines[0]?.printableRevisionId);
  const selected = quote.document.lines.find((line) => line.printableRevisionId === selectedId);
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
      <p className={ix.meta}>
        Báo giá có hiệu lực đến{' '}
        {new Intl.DateTimeFormat('vi-VN', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Asia/Ho_Chi_Minh',
        }).format(new Date(quote.expiresAt))}
        .
      </p>
      <div role="group" aria-label="Chọn bản PDF để kiểm tra" className={ix.actions}>
        {quote.document.lines.map((line) => (
          <button
            key={line.printableRevisionId}
            type="button"
            className={line.printableRevisionId === selectedId ? ix.btnSmall : ix.btnSmallOutline}
            aria-pressed={line.printableRevisionId === selectedId}
            onClick={() => setSelectedId(line.printableRevisionId)}
          >
            {line.title}
            {ready.has(line.printableRevisionId) ? ' · Đã tải' : ''}
          </button>
        ))}
      </div>
      <ul className="grid gap-2 text-sm">
        {quote.document.lines.map((line) => (
          <li key={line.printableRevisionId} className={px.orderBrief}>
            <span>
              {line.title} · {line.quantity.toLocaleString('vi-VN')} thiệp ×{' '}
              {line.line.unitPriceVnd.toLocaleString('vi-VN')} đ
            </span>
            <strong>{line.line.lineTotalVnd.toLocaleString('vi-VN')} đ</strong>
          </li>
        ))}
      </ul>
      {selected && (
        <PrintableFilePreview
          key={selected.printableRevisionId}
          bookingId={bookingId}
          accessToken={accessToken}
          gateway={gateway}
          printableRevisionId={selected.printableRevisionId}
          title={selected.title}
          onReady={previewReady}
        />
      )}
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
          Đã tải {ready.size}/{quote.document.lines.length} bản in. Chọn từng mẫu để kiểm tra trước
          khi xác nhận.
        </p>
      ) : null}
      <div className={ix.actions}>
        <button type="button" className={ix.btnSmallOutline} disabled={busy} onClick={onBack}>
          Đổi mẫu hoặc số lượng
        </button>
        <button
          type="button"
          className={ix.btn}
          disabled={busy || !allReady}
          onClick={() => void onConfirm()}
        >
          {busy ? 'Đang xử lý…' : 'Xác nhận đặt in và chi phí'}
        </button>
      </div>
    </section>
  );
}
