'use client';

import { useEffect, useRef, useState } from 'react';
import { InlineError } from '../../design-system/inline-error';
import { notify } from '../../design-system/toast';
import { formatDateTime, useCommand } from '../couple-workspace/use-couple-workspace';
import { guestApi, type GuestGroup, type ImportPreview } from './guest-api';
import { csvTemplate, csvToImportRows, type ImportRow } from './guest-csv';

export function ImportCard({
  bookingId,
  groups,
  onImported,
}: Readonly<{
  bookingId: string;
  groups: GuestGroup[];
  onImported: () => void;
}>) {
  const command = useCommand({ errorPresentation: 'inline' });
  const readSequence = useRef(0);
  useEffect(
    () => () => {
      readSequence.current++;
    },
    [],
  );
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [errors, setErrors] = useState<readonly { line: number; message: string }[]>([]);
  const [allowUpdates, setAllowUpdates] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const downloadTemplate = () => {
    let url: string | undefined;
    try {
      url = URL.createObjectURL(
        new Blob(['\uFEFF' + csvTemplate], { type: 'text/csv;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mau-danh-sach-khach.csv';
      link.click();
    } catch {
      notify.error(
        'Chưa tải được file mẫu. Hãy thử lại hoặc kiểm tra quyền tải xuống của trình duyệt.',
      );
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  const readFile = async (file: File | undefined) => {
    const sequence = ++readSequence.current;
    setRows(null);
    setPreview(null);
    setErrors([]);
    setFileError(null);
    setReading(Boolean(file));
    if (!file) return;
    try {
      const text = await file.text();
      if (sequence !== readSequence.current) return;
      const result = csvToImportRows(text, groups);
      setRows(result.rows);
      setErrors(result.errors);
    } catch {
      if (sequence === readSequence.current)
        setFileError(
          'Chưa đọc được file CSV. Hãy chọn lại file; danh sách khách chưa được thay đổi.',
        );
    } finally {
      if (sequence === readSequence.current) setReading(false);
    }
  };

  const groupMap = new Map(groups.map((g) => [g.guestGroupId, g.name]));

  return (
    <section className="cw-card">
      <InlineError error={command.error} />
      <h2>Nhập danh sách từ file CSV</h2>
      <p className="cw-note">
        Cột bắt buộc: <code>ma</code> (mã riêng mỗi dòng, giữ nguyên khi nhập lại),{' '}
        <code>ho_ten</code>, <code>nhom</code> (đúng tên nhóm ở trên). Tùy chọn:{' '}
        <code>so_dien_thoai</code>, <code>ghi_chu</code>. Tối đa 1.000 dòng mỗi lần; có lỗi ở bất kỳ
        dòng nào thì không dòng nào được nhập.
      </p>

      <div className="cw-actions" style={{ flexWrap: 'wrap', gap: 12 }}>
        <button className="button button-secondary" type="button" onClick={downloadTemplate}>
          📥 Tải file mẫu CSV
        </button>

        <label className="button button-secondary" style={{ cursor: 'pointer', margin: 0 }}>
          <span>📂 Chọn file CSV từ máy</span>
          <input
            aria-label="Chọn file CSV"
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(event) => {
              void readFile(event.target.files?.[0]);
            }}
          />
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
          <input
            type="checkbox"
            checked={allowUpdates}
            onChange={(event) => setAllowUpdates(event.target.checked)}
          />{' '}
          Cho phép cập nhật khách đã nhập trước (nếu trùng mã)
        </label>
      </div>

      {reading ? <p role="status" style={{ margin: '12px 0' }}>Đang đọc dữ liệu file CSV…</p> : null}
      <InlineError error={fileError} />

      {errors.length > 0 ? (
        <div className="cw-alert" role="alert" style={{ marginTop: 14 }}>
          <p>
            <strong>File có {errors.length} dòng lỗi</strong>. Hãy sửa lại trong file rồi chọn lại:
          </p>
          <ul style={{ maxHeight: 180, overflowY: 'auto', paddingLeft: 20 }}>
            {errors.slice(0, 20).map((error) => (
              <li key={error.line}>
                Dòng {error.line}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Bảng xem trước 5 dòng đầu tiên */}
      {rows && errors.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--hy-wine)' }}>
              ✓ Đã đọc {rows.length} dòng hợp lệ. Xem trước dữ liệu:
            </span>
            <button
              className="button"
              type="button"
              disabled={command.pending || rows.length === 0}
              onClick={() =>
                void command
                  .run((token, key) =>
                    guestApi.previewImport(token, key, bookingId, rows, allowUpdates),
                  )
                  .then((result) => result && setPreview(result))
              }
            >
              Xem trước đối chiếu
            </button>
          </div>

          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead>
                <tr>
                  <th scope="col">Mã</th>
                  <th scope="col">Họ tên</th>
                  <th scope="col">Nhóm</th>
                  <th scope="col">Điện thoại</th>
                  <th scope="col">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row) => (
                  <tr key={row.externalRowKey}>
                    <td>
                      <code>{row.externalRowKey}</code>
                    </td>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>{groupMap.get(row.guestGroupId) ?? row.guestGroupId}</td>
                    <td>{row.phone ?? '—'}</td>
                    <td>{row.operationalNote ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 ? (
            <small className="muted" style={{ display: 'block', marginTop: 4 }}>
              Và {rows.length - 5} khách khác sẽ được nhập cùng đợt này.
            </small>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="cw-note" style={{ marginTop: 16 }}>
          <p>
            Kết quả đối chiếu: Sẽ thêm mới <strong>{preview.createdCount} khách</strong>, cập nhật{' '}
            <strong>{preview.updatedCount} khách</strong>, giữ nguyên{' '}
            <strong>{preview.unchangedCount} khách</strong>. Bản xem trước có hiệu lực đến{' '}
            {formatDateTime(preview.expiresAt)}.
          </p>
          <div className="cw-actions" style={{ marginTop: 10 }}>
            <button
              className="button"
              type="button"
              disabled={command.pending}
              onClick={() =>
                void command
                  .run(
                    (token, key) =>
                      guestApi.commitImport(token, key, bookingId, preview.previewId, preview.digest),
                    'Đã nhập danh sách khách thành công.',
                  )
                  .then((result) => {
                    if (result) {
                      setPreview(null);
                      setRows(null);
                      onImported();
                    }
                  })
              }
            >
              Xác nhận nhập danh sách
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setPreview(null)}
            >
              Hủy
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
