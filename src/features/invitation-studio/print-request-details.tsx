'use client';

import { useState } from 'react';
import type { InvitationGateway, PrintRequestView } from './invitation-api';
import { PrintableFilePreview } from './printable-file-preview';
import { ix } from './studio-classes';
import { px } from './studio-panel-classes';

/** Historical PDFs are fetched only when their request is opened. */
export function PrintRequestDetails({
  request,
  bookingId,
  accessToken,
  gateway,
}: Readonly<{
  request: PrintRequestView;
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <details className={ix.disclosure} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Nội dung xác nhận ban đầu</summary>
      {open ? (
        <p className={ix.meta}>
          Bản lưu lúc bạn xác nhận. Nếu có phụ lục điều chỉnh, xem mục Đơn in để biết số lượng sản
          xuất hiện tại.
        </p>
      ) : null}
      {open
        ? request.document.lines.map((line) => (
            <div key={line.printableRevisionId} className={px.order}>
              <h5 className={ix.subtitleSm}>{line.title}</h5>
              <p>
                {line.quantity.toLocaleString('vi-VN')} thiệp ·{' '}
                {line.line.lineTotalVnd.toLocaleString('vi-VN')} đ
              </p>
              <PrintableFilePreview
                bookingId={bookingId}
                accessToken={accessToken}
                gateway={gateway}
                printableRevisionId={line.printableRevisionId}
                title={line.title}
              />
            </div>
          ))
        : null}
    </details>
  );
}
