'use client';

import { useState } from 'react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import {
  authorizedRead,
  useCommand,
  type Proposal,
  formText,
} from '../couple-workspace/use-couple-workspace';
import { contractApi, type Catalog, type ContractList } from './contract-api';
import {
  appendixApi,
  effectiveLines,
  type AppendixList,
  type Appendix,
} from './appendix-api';
import type { ContractLineInput } from './contract-api';

export function useAppendicesWorkspace(proposal: Proposal, reloadBooking: () => void) {
  const bookingId = proposal.bookingId;
  const [data, setData] = useState<{ appendices: AppendixList; contracts: ContractList } | null>(
    null,
  );
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [creating, setCreating] = useState(false);
  const [catalogError, setCatalogError] = useState<FriendlyError | null>(null);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const command = useCommand({ errorPresentation: creating ? 'inline' : 'toast' });
  const { confirm, dialog } = useConfirmDialog();

  const live = useLiveRefresh(
    async (isCurrent) => {
      try {
        const next = await authorizedRead(async (token) => {
          const [appendices, contracts] = await Promise.all([
            appendixApi.list(token, bookingId),
            contractApi.list(token, bookingId),
          ]);
          return { appendices, contracts };
        });
        if (!isCurrent()) return;
        setData(next);
        setLoadError(null);
      } catch (error) {
        if (isCurrent()) setLoadError(describeApiError(error));
      }
    },
    {
      scope: bookingId,
      bookingId,
      types: ['booking.updated', 'contract.updated'],
      initial: true,
      blocked: creating || command.pending,
      invalidateOnBlock: true,
    },
  );

  const reload = () => {
    void live.refresh();
  };

  const loadCatalog = async () => {
    setCatalogError(null);
    try {
      setCatalog(await authorizedRead((token) => contractApi.catalog(token)));
    } catch (error) {
      setCatalogError(describeApiError(error));
    }
  };

  const after = (result: unknown) => {
    if (!result) return;
    setCreating(false);
    reload();
    reloadBooking();
  };

  const handleStartCreate = () => {
    command.setError(null);
    setCreating(true);
    if (!catalog) void loadCatalog();
  };

  const handleCancelCreate = () => {
    setCreating(false);
  };

  const handleCreateDraft = (nextLines: ContractLineInput[], form: FormData) => {
    if (!data) return;
    void command
      .run(
        (token, key) =>
          appendixApi.create(token, key, bookingId, {
            expectedRevision: data.appendices.bookingRevision,
            predecessorRevisionId: data.appendices.effectiveRevisionId,
            reason: formText(form, 'reason'),
            lines: nextLines,
          }),
        'Đã lưu phụ lục nháp. Kiểm tra chênh lệch rồi gửi duyệt.',
      )
      .then(after);
  };

  const handleSubmitAppendix = (current: Appendix) => {
    if (!data) return;
    void command
      .run(
        (token, key) =>
          appendixApi.submit(
            token,
            key,
            bookingId,
            current.revisionId,
            data.appendices.bookingRevision,
          ),
        'Đã gửi phụ lục để hai bên duyệt.',
      )
      .then(after);
  };

  const handleApproveAppendix = async (current: Appendix) => {
    if (!data) return;
    const agreed = await confirm({
      title: 'Duyệt phụ lục này?',
      description:
        'Xác nhận hai bạn đồng ý với các thay đổi trong phụ lục. Phụ lục đã duyệt sẽ được tính vào chi phí tiệc.',
      confirmLabel: 'Đồng ý & duyệt',
    });
    if (!agreed) return;
    await command
      .run(
        (token, key) =>
          appendixApi.approve(
            token,
            key,
            bookingId,
            current.revisionId,
            data.appendices.bookingRevision,
          ),
        'Đã duyệt phụ lục.',
      )
      .then(after);
  };

  const isClosed = proposal.phase === 'COMPLETED' || proposal.phase === 'CANCELLED';
  const appendices = data?.appendices ?? null;
  const contracts = data?.contracts ?? null;
  const lines = appendices && contracts ? effectiveLines(appendices, contracts) : [];
  const current =
    appendices?.revisions.find((r) => r.revisionId === appendices.currentRevisionId) ?? null;
  const open =
    current !== null && (current.state === 'DRAFT' || current.state === 'AWAITING_APPROVAL');

  return {
    bookingId,
    data,
    appendices,
    contracts,
    lines,
    current,
    open,
    isClosed,
    catalog,
    creating,
    catalogError,
    loadError,
    command,
    dialog,
    live,
    reload,
    loadCatalog,
    handleStartCreate,
    handleCancelCreate,
    handleCreateDraft,
    handleSubmitAppendix,
    handleApproveAppendix,
  };
}

