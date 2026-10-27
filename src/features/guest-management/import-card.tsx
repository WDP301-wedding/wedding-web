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
      <div className="cw-actions">
        <button className="button button-secondary" type="button" onClick={downloadTemplate}>
          Tải file mẫu
        </button>
        <input
          aria-label="Chọn file CSV"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            void readFile(event.target.files?.[0]);
          }}
        />
        <label>
          <input
            type="checkbox"
            checked={allowUpdates}
            onChange={(event) => setAllowUpdates(event.target.checked)}
          />{' '}
          Cho phép cập nhật khách đã nhập trước (cùng mã)
        </label>
      </div>
      {reading ? <p role="status">Đang đọc file CSV…</p> : null}
      <InlineError error={fileError} />
      {errors.length > 0 ? (
        <div className="cw-alert" role="alert">
          <p>File có {errors.length} dòng lỗi, hãy sửa rồi chọn lại:</p>
          <ul>
            {errors.slice(0, 20).map((error) => (
              <li key={error.line}>
                Dòng {error.line}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rows && errors.length === 0 ? (
        <div className="cw-actions">
          <span>{rows.length} dòng hợp lệ.</span>
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
            Xem trước
          </button>
        </div>
      ) : null}
      {preview ? (
        <div className="cw-note">
          <p>
            Sẽ thêm <strong>{preview.createdCount}</strong>, cập nhật{' '}
            <strong>{preview.updatedCount}</strong>, giữ nguyên{' '}
            <strong>{preview.unchangedCount}</strong>. Bản xem trước hết hạn lúc{' '}
            {formatDateTime(preview.expiresAt)}.
          </p>
          <button
            className="button"
            type="button"
            disabled={command.pending}
            onClick={() =>
              void command
                .run(
                  (token, key) =>
                    guestApi.commitImport(token, key, bookingId, preview.previewId, preview.digest),
                  'Đã nhập danh sách khách.',
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
            Xác nhận nhập
          </button>
        </div>
      ) : null}
    </section>
  );
}
