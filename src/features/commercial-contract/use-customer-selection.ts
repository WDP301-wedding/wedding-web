'use client';
import { tableCapacityMessage } from '../../lib/table-capacity';
import { useEffect, useMemo, useRef, useState } from 'react';
import { authorizedRead, useCommand } from '../couple-workspace/use-couple-workspace';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { selectionApi } from './selection-api';
import type { SelectionChoice } from './selection-catalog';
import type { useSelectionCatalog } from './use-selection-catalog';
import type { ContractLineInput } from './contract-api';
import {
  selectionBlockReasonSchema,
  selectionRecoveryActions,
  type SelectionAccess,
  type CustomerSelection,
  type SelectionResult,
} from './selection-wire';
export const selectionKey = (line: Pick<ContractLineInput, 'category' | 'sourceId'>) =>
  line.category + ':' + line.sourceId.toLowerCase();
const PREVIEW_DELAY_MS = 400;
function validateSelection(
  lines: readonly ContractLineInput[],
  choicesLoaded: boolean,
  catalogError: FriendlyError | null,
  missing: readonly ContractLineInput[],
  stale: boolean,
): string | null {
  if (!choicesLoaded)
    return catalogError
      ? 'Chưa tải được danh mục. Hãy tải lại thực đơn và dịch vụ.'
      : 'Đang tải thực đơn và dịch vụ.';
  if (!lines.length) return 'Chọn ít nhất một thực đơn và nhập số bàn lớn hơn 0.';
  if (!lines.some((line) => line.category === 'MENU'))
    return 'Cần chọn ít nhất một thực đơn và nhập số bàn lớn hơn 0; chỉ chọn dịch vụ thì chưa thể lưu.';
  if (lines.length > 50)
    return 'Mỗi lựa chọn tối đa 50 hạng mục. Hãy bỏ bớt hạng mục trước khi lưu.';
  if (
    lines.some(
      (line) =>
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > (line.category === 'MENU' ? 500 : 10000),
    )
  )
    return 'Số lượng phải là số nguyên dương, tối đa 500 bàn cho mỗi thực đơn hoặc 10.000 đơn vị dịch vụ.';
  if (missing.some((line) => line.category === 'PRINT'))
    return 'Thiệp in đã chuyển sang đặt sau cọc. Bỏ mục thiệp in cũ khỏi bản nháp bằng nút ở trên trước khi lưu.';
  if (missing.length)
    return 'Có hạng mục không còn trong danh mục đang bán. Bỏ hoặc chọn lại hạng mục được báo ở trên.';
  if (stale)
    return 'Có hạng mục đã đổi phiên bản giá. Chọn “Dùng giá hiện hành” ở hạng mục tương ứng.';
  return null;
}
export function useCustomerSelection({
  selection,
  bookingId,
  bookingRevision,
  onChanged,
  onDirtyChange,
  onWritingChange,
  catalog,
  planningHeadcount = 0,
  maximumTables,
  maxGuests,
}: {
  planningHeadcount?: number;
  maximumTables?: number | undefined;
  maxGuests?: number | undefined;
  selection: CustomerSelection;
  catalog: ReturnType<typeof useSelectionCatalog>;
  bookingId: string;
  bookingRevision: number;
  onChanged: (result?: SelectionResult) => void;
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
  const choicesByKey = useMemo(
    () => new Map(choices?.map((choice) => [selectionKey(choice), choice]) ?? []),
    [choices],
  );
  const missing = choices ? lines.filter((line) => !choicesByKey.has(selectionKey(line))) : [];
  const stale = lines.some((line) => {
    const choice = choicesByKey.get(selectionKey(line));
    return choice !== undefined && line.sourceRevisionId !== choice.sourceRevisionId;
  });
  const capacityError = tableCapacityMessage(
    planningHeadcount,
    lines.filter((l) => l.category === 'MENU').reduce((sum, l) => sum + l.quantity, 0),
    maximumTables,
    maxGuests,
  );
  const validationMessage =
    validateSelection(lines, choices !== null, catalogError, missing, stale) ?? capacityError;
  const invalid = validationMessage !== null;
  const body = useMemo(
    () => ({ expectedRevision: bookingRevision, lines }),
    [bookingRevision, lines],
  );
  const signature = JSON.stringify(body);
  const priced = preview?.signature === signature ? preview.data : null;
  const priceError = previewError?.signature === signature ? previewError.error : null;
  const block = selectionBlockReasonSchema.safeParse(command.error?.code ?? priceError?.code);
  const blockedAccess: SelectionAccess | null = block.success
    ? { canEdit: false, blockReason: block.data, nextAction: selectionRecoveryActions[block.data] }
    : null;
  const eligible = !invalid && !command.pending && !blockedAccess;
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
    if (blockedAccess || command.pending) return;
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
    setPreviewError(null);
    command.setError(null);
  };
  async function save() {
    // A draft is priced and validated again by the server. A failed/slow optional
    // preview must not make an otherwise valid draft impossible to save.
    if (blockedAccess || invalid || command.pending) return;
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
      onDirtyChange(false);
      onChanged(result);
    }
  }
  async function submit() {
    if (
      blockedAccess ||
      command.pending ||
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
      onDirtyChange(false);
      onChanged(result);
    }
  }
  return {
    blockedAccess,
    discard: () => {
      setLines(initial);
      setPreview(null);
      setPreviewError(null);
      command.setError(null);
      onDirtyChange(false);
      onChanged();
    },
    lines,
    choices,
    catalogError,
    reloadCatalog: () => {
      if (blockedAccess || command.pending) return;
      setPreview(null);
      setPreviewError(null);
      reloadCatalog();
    },
    validationMessage,
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
    remove: (line: ContractLineInput) => {
      if (blockedAccess || command.pending) return;
      setLines((prev) => prev.filter((value) => selectionKey(value) !== selectionKey(line)));
      setPreview(null);
      setPreviewError(null);
      command.setError(null);
    },
    save,
    submit,
  };
}
