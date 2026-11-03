'use client';

import { useEffect, useState } from 'react';
import type { InvitationGateway } from './invitation-api';
import { invitationErrorMessage } from './invitation-studio-utils';
import { ix } from './studio-classes';

export function PrintableFilePreview({
  bookingId,
  accessToken,
  gateway,
  printableRevisionId,
  title,
  onReady,
}: Readonly<{
  bookingId: string;
  accessToken: string;
  gateway: InvitationGateway;
  printableRevisionId: string;
  title: string;
  onReady?: (printableRevisionId: string) => void;
}>) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void gateway
      .getPrintableFile(accessToken, bookingId, printableRevisionId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setError(null);
        onReady?.(printableRevisionId);
      })
      .catch((reason) => {
        if (active) setError(invitationErrorMessage(reason, 'Không thể tải bản in.'));
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessToken, bookingId, gateway, printableRevisionId, attempt, onReady]);
  return (
    <div className={ix.stack}>
      {url ? (
        <>
          <iframe
            src={`${url}#view=FitH`}
            title={`Bản in ${title}`}
            className="h-80 w-full rounded-lg border border-border"
          />
          <a href={url} target="_blank" rel="noreferrer" className={ix.link}>
            Mở bản in {title}
          </a>
          <a href={url} download={`${title}.pdf`} className={ix.link}>
            Tải bản in {title}
          </a>
        </>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className={ix.btnSmallOutline}
            onClick={() => {
              setError(null);
              setAttempt((value) => value + 1);
            }}
          >
            Tải lại bản in
          </button>
        </div>
      ) : (
        <p role="status" className={ix.meta}>
          Đang tải bản in {title}…
        </p>
      )}
    </div>
  );
}
