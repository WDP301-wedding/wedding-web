'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { authorizedRead, useCommand } from '../couple-workspace/use-couple-workspace';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { selectionApi } from './selection-api';
import type { SelectionChoice } from './selection-catalog';
import type { useSelectionCatalog } from './use-selection-catalog';
import type { ContractLineInput } from './contract-api';
import type { CustomerSelection, SelectionResult } from './selection-wire';
export const selectionKey = (line: Pick<ContractLineInput, 'category' | 'sourceId'>) =>
  line.category + ':' + line.sourceId.toLowerCase();
const PREVIEW_DELAY_MS = 400;
export function useCustomerSelection({
  selection,
  bookingId,
  bookingRevision,
  onChanged,
  onDirtyChange,
  onWritingChange,
  catalog,
}: {
  selection: CustomerSelection;
  catalog: ReturnType<typeof useSelectionCatalog>;
  bookingId: string;
  bookingRevision: number;
  onChanged: () => void;
  onDirtyChange: (value: boolean) => void;
  onWritingChange: (value: boolean) => void;
}) {
  const initial = selection.lines.map(({ category, sourceId, sourceRevisionId, quantity }) => ({
    category,
    sourceId,
    sourceRevisionId,
    quantity,
  }));
  const [lines, setLines] = useState<readonly ContractLineInput[]>(initial);
  const { choices, catalogError, reloadCatalog } = catalog;
  const [preview, setPreview] = useState<{ signature: string; data: SelectionResult } | null>(() =>
    selection.status === 'DRAFT'
      ? {
          signature: JSON.stringify({ expectedRevision: bookingRevision, lines: initial }),
          data: { bookingRevision, selection },
        }
      : null,
  );
  const [previewError, setPreviewError] = useState<{
    signature: string;
    error: FriendlyError;
  } | null>(null);
  const [waitingRefresh, setWaitingRefresh] = useState(false);
  const command = useCommand({ errorPresentation: 'inline' });
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const dirty = JSON.stringify(lines) !== JSON.stringify(initial);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onWritingChange(command.pending);
    return () => onWritingChange(false);
  }, [command.pending, onWritingChange]);
  const missing = lines.filter(
    (line) => !choices?.some((choice) => selectionKey(choice) === selectionKey(line)),
  );
  const stale = lines.some((line) =>
    choices?.some(
      (choice) =>
        selectionKey(choice) === selectionKey(line) &&
        line.sourceRevisionId !== choice.sourceRevisionId,
    ),
  );
  const invalid =
    !choices ||
    lines.length === 0 ||
    lines.length > 50 ||
    !lines.some((line) => line.category === 'MENU') ||
    lines.some(
      (line) =>
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > (line.category === 'MENU' ? 500 : 10000),
    ) ||
    missing.length > 0 ||
    stale;
  const body = useMemo(
    () => ({ expectedRevision: bookingRevision, lines }),
    [bookingRevision, lines],
  );
  const signature = JSON.stringify(body);
  const priced = preview?.signature === signature ? preview.data : null;
  const priceError = previewError?.signature === signature ? previewError.error : null;
  const eligible = !invalid && !command.pending && !waitingRefresh;
  const previewPending = eligible && !priced && !priceError;
  useEffect(() => {
    if (!eligible || priced || priceError) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void authorizedRead((token) =>
        selectionApi.preview(token, bookingId, body, controller.signal),
      )
        .then((data) => {
          if (active) setPreview({ signature, data });
        })
        .catch((error) => {
          if (active) setPreviewError({ signature, error: describeApiError(error) });
        });
    }, PREVIEW_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [eligible, priced, priceError, bookingId, body, signature]);
  const update = (choice: SelectionChoice, quantity: number) => {
    setLines((prev) => [
      ...prev.filter((line) => selectionKey(line) !== selectionKey(choice)),
      ...(quantity > 0
        ? [
            {
              category: choice.category,
              sourceId: choice.sourceId,
              sourceRevisionId: choice.sourceRevisionId,
              quantity,
            },
          ]
        : []),
    ]);
    setPreview(null);
    command.setError(null);
  };
  async function save() {
    if (invalid || !priced || previewPending || priceError || waitingRefresh) return;
    const identity = 'save:' + signature;
    if (attempt.current?.signature !== identity)
      attempt.current = { signature: identity, key: crypto.randomUUID() };
    const key = attempt.current.key;
    const result = await command.run(
      (token) => selectionApi.save(token, key, bookingId, body),
      'Đã lưu nháp. Bạn vẫn có thể chọn tiếp hoặc thay đổi.',
    );
    if (result) {
      attempt.current = null;
      setWaitingRefresh(true);
      onDirtyChange(false);
      onChanged();
    }
  }
  async function submit() {
    if (
      waitingRefresh ||
      priceError ||
      dirty ||
      selection.status !== 'DRAFT' ||
      !selection.revisionId ||
      invalid ||
      !priced ||
      previewPending
    )
      return;
    const revisionId = selection.revisionId;
    const identity = 'submit:' + bookingRevision + ':' + revisionId;
    if (attempt.current?.signature !== identity)
      attempt.current = { signature: identity, key: crypto.randomUUID() };
    const key = attempt.current.key;
    const result = await command.run(
      (token) => selectionApi.submit(token, key, bookingId, bookingRevision, revisionId),
      'Đã gửi lựa chọn. Nhà hàng sẽ tiếp nhận để lập hợp đồng.',
    );
    if (result) {
      attempt.current = null;
      setWaitingRefresh(true);
      onDirtyChange(false);
      onChanged();
    }
  }
  return {
    waitingRefresh,
    discard: () => {
      setLines(initial);
      setPreview(null);
      command.setError(null);
      onDirtyChange(false);
      onChanged();
    },
    lines,
    choices,
    catalogError,
    reloadCatalog,
    missing,
    stale,
    invalid,
    priced,
    previewPending,
    previewError: priceError,
    retryPreview: () => setPreviewError(null),
    command,
    dirty,
    update,
    remove: (line: ContractLineInput) =>
      setLines((prev) => prev.filter((value) => selectionKey(value) !== selectionKey(line))),
    save,
    submit,
  };
}
