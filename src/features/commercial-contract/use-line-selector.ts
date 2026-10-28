'use client';

import { useEffect, useRef, useState } from 'react';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import type { Catalog, ContractLine, ContractLineInput } from './contract-api';
import type { ContractPreview } from './contract-preview-api';

export type Selection = Record<string, number>;

export const keyOf = (category: ContractLineInput['category'], sourceId: string) =>
  `${category}:${sourceId}`;

export function useLineSelector({
  catalog,
  initialLines,
  frozenLines,
  onPreview,
  onSubmit,
}: {
  catalog: Catalog;
  initialLines: readonly {
    category: ContractLineInput['category'];
    sourceId: string;
    quantity: number;
  }[];
  frozenLines?: readonly ContractLine[] | undefined;
  onPreview?: ((lines: ContractLineInput[]) => Promise<ContractPreview>) | undefined;
  onSubmit: (lines: ContractLineInput[], form: FormData) => void;
}) {
  const [selection, setSelection] = useState<Selection>(() =>
    Object.fromEntries(
      initialLines.map((line) => [keyOf(line.category, line.sourceId), line.quantity]),
    ),
  );
  const requestSequence = useRef(0);
  useEffect(
    () => () => {
      requestSequence.current++;
    },
    [],
  );
  const [preview, setPreview] = useState<{ signature: string; data: ContractPreview } | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [previewError, setPreviewError] = useState<FriendlyError | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const sellable = new Set([
    ...catalog.menus.map((item) => keyOf('MENU', item.id)),
    ...catalog.services.map((item) => keyOf('SERVICE', item.serviceId)),
    ...catalog.prints.map((item) => keyOf('PRINT', item.offeringId)),
  ]);
  const missing = frozenLines
    ? []
    : initialLines.filter((line) => !sellable.has(keyOf(line.category, line.sourceId)));
  const frozen = new Map(
    (frozenLines ?? []).map((line) => [keyOf(line.category, line.sourceId), line]),
  );
  const frozenOnly = (frozenLines ?? []).filter(
    (line) => !sellable.has(keyOf(line.category, line.sourceId)),
  );

  const revisionFor = (
    category: ContractLineInput['category'],
    sourceId: string,
    current: string,
  ) => frozen.get(keyOf(category, sourceId))?.sourceRevisionId ?? current;

  const buildLines = (): ContractLineInput[] => {
    const lines: ContractLineInput[] = [];
    for (const menu of catalog.menus) {
      const quantity = selection[keyOf('MENU', menu.id)] ?? 0;
      if (quantity > 0)
        lines.push({
          category: 'MENU',
          sourceId: menu.id,
          sourceRevisionId: revisionFor('MENU', menu.id, menu.versionId),
          quantity,
        });
    }
    for (const service of catalog.services) {
      const quantity = selection[keyOf('SERVICE', service.serviceId)] ?? 0;
      if (quantity > 0)
        lines.push({
          category: 'SERVICE',
          sourceId: service.serviceId,
          sourceRevisionId: revisionFor('SERVICE', service.serviceId, service.sourceRevisionId),
          quantity,
        });
    }
    for (const print of catalog.prints) {
      const quantity = selection[keyOf('PRINT', print.offeringId)] ?? 0;
      if (quantity > 0)
        lines.push({
          category: 'PRINT',
          sourceId: print.offeringId,
          sourceRevisionId: revisionFor('PRINT', print.offeringId, print.sourceRevisionId),
          quantity,
        });
    }
    for (const line of frozenOnly) {
      const quantity = selection[keyOf(line.category, line.sourceId)] ?? 0;
      if (quantity > 0)
        lines.push({
          category: line.category,
          sourceId: line.sourceId,
          sourceRevisionId: line.sourceRevisionId,
          quantity,
        });
    }
    return lines;
  };

  const tableCount =
    catalog.menus.reduce((sum, menu) => sum + (selection[keyOf('MENU', menu.id)] ?? 0), 0) +
    frozenOnly
      .filter((line) => line.category === 'MENU')
      .reduce((sum, line) => sum + (selection[keyOf('MENU', line.sourceId)] ?? 0), 0);

  const selectionSignature = JSON.stringify(buildLines());
  const previewCurrent = preview?.signature === selectionSignature;

  const requestPreview = async () => {
    if (!onPreview || previewPending) return;
    const lines = buildLines();
    if (!lines.some((line) => line.category === 'MENU')) {
      setLocalError('Chọn ít nhất một thực đơn trước khi xem chi phí.');
      return;
    }
    const sequence = ++requestSequence.current;
    setPreviewPending(true);
    setPreviewError(null);
    setLocalError(null);
    try {
      const data = await onPreview(lines);
      if (sequence === requestSequence.current)
        setPreview({ signature: JSON.stringify(lines), data });
    } catch (error) {
      if (sequence === requestSequence.current) setPreviewError(describeApiError(error));
    } finally {
      if (sequence === requestSequence.current) setPreviewPending(false);
    }
  };

  const setItemQuantity = (key: string, value: number) => {
    setSelection((prev) => ({
      ...prev,
      [key]: Number.isNaN(value) ? 0 : Math.max(0, value),
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const lines = buildLines();
    if (!lines.some((line) => line.category === 'MENU')) {
      setLocalError('Cần chọn ít nhất một thực đơn (số bàn > 0).');
      return;
    }
    if (tableCount > 500) {
      setLocalError('Tổng số bàn tối đa là 500.');
      return;
    }
    setLocalError(null);
    onSubmit(lines, new FormData(event.currentTarget));
  };

  return {
    selection,
    setItemQuantity,
    frozen,
    frozenOnly,
    missing,
    tableCount,
    preview,
    previewCurrent,
    previewPending,
    previewError,
    localError,
    requestPreview,
    handleSubmit,
  };
}
