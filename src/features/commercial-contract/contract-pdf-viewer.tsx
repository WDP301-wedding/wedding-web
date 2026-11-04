'use client';

import { useEffect, useRef, useState } from 'react';
import { contractApi } from './contract-api';
import { browserSession } from '../identity-access/browser-session';
import { describeApiError } from '../../lib/api/api-errors';
import { buttonVariants } from '../../components/ui/button';

/** Private PDF bytes stay in a revocable object URL, never a public token-bearing link. */
export function ContractPdfViewer({
  bookingId,
  revisionId,
  revisionNumber,
  onClose,
}: Readonly<{
  bookingId: string;
  revisionId: string;
  revisionNumber?: number | undefined;
  onClose: () => void;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const retainedUrl = useRef<string | null>(null);
  const mounted = useRef(false);
  const downloadLock = useRef(false);
  const request = useRef<{ key: string; promise: Promise<Blob> } | null>(null);
  useEffect(() => {
    mounted.current = true;
    const element = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => {
      mounted.current = false;
      element?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const key = bookingId + ':' + revisionId + ':' + retry;
    if (request.current?.key !== key)
      request.current = {
        key,
        promise: browserSession.authorize((token) =>
          contractApi.pdf(token, bookingId, revisionId, 'readable'),
        ),
      };
    void request.current.promise
      .then((blob) => {
        if (!active) return;
        if (!blob.type.includes('application/pdf'))
          throw new Error('Máy chủ chưa trả về tệp PDF hợp lệ.');
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((cause: unknown) => {
        if (active) setError(describeApiError(cause).message);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookingId, revisionId, retry]);
  useEffect(
    () => () => {
      if (retainedUrl.current) URL.revokeObjectURL(retainedUrl.current);
    },
    [],
  );
  const downloadRetained = async () => {
    if (downloadLock.current) return;
    downloadLock.current = true;
    setDownloading(true);
    try {
      const blob = await browserSession.authorize((token) =>
        contractApi.pdf(token, bookingId, revisionId),
      );
      if (!mounted.current) return;
      if (retainedUrl.current) URL.revokeObjectURL(retainedUrl.current);
      const href = URL.createObjectURL(blob);
      retainedUrl.current = href;
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `hop-dong${revisionNumber ? '-ban-' + revisionNumber : ''}.pdf`;
      anchor.click();
    } catch (cause) {
      if (mounted.current) setError(describeApiError(cause).message);
    } finally {
      downloadLock.current = false;
      if (mounted.current) setDownloading(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="contract-pdf-title"
      className="m-auto h-[min(90dvh,1000px)] w-[min(1100px,calc(100vw-24px))] max-w-none rounded-xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-hy-ink/55"
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 id="contract-pdf-title" className="text-lg font-bold">
              Hợp đồng và thỏa thuận{revisionNumber ? ' · Bản ' + revisionNumber : ''}
            </h2>
            <p className="text-xs text-muted-foreground">
              Xem nội dung đúng phiên bản. Bản lưu trữ được giữ nguyên để đối chiếu.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              disabled={downloading}
              onClick={() => void downloadRetained()}
            >
              {downloading ? 'Đang tải…' : 'Tải bản lưu trữ'}
            </button>
            <button
              type="button"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </header>
        {error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <p>{error}</p>
            <button
              type="button"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              onClick={() => {
                setUrl(null);
                setError(null);
                setRetry((value) => value + 1);
              }}
            >
              Thử lại
            </button>
          </div>
        ) : null}
        {url ? (
          <iframe
            title="Bản xem hợp đồng PDF"
            src={url + '#toolbar=1&navpanes=0&view=FitH'}
            className="min-h-0 w-full flex-1 border-0"
          />
        ) : !error ? (
          <p role="status" className="p-6 text-sm">
            Đang mở hợp đồng PDF…
          </p>
        ) : null}
      </div>
    </dialog>
  );
}
