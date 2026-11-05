'use client';

import { useCallback, useRef, useState } from 'react';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
import { CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import { type Proposal } from '../couple-workspace/use-couple-workspace';
import { Skeleton } from '../../design-system/skeleton';
import {
  PreparationReadOnlyNotice,
  usePreparationLock,
} from '../couple-workspace/preparation-access';
import { LayoutSelector } from './layout-selector';
import { PlanEditorHeader } from './plan-editor-header';
import { SeatingSvg } from './seating-svg';
import { PlanEditor } from './plan-editor';
import { useSeatingWorkspace } from './use-seating-workspace';
import type { SeatingPlan } from './seating-api';
import { sx } from './seating-classes';
import { cx } from '../commercial-contract/contract-classes';

export function SeatingPage() {
  return (
    <CouplePage
      title="Sơ đồ bàn"
      description="Chọn mẫu sơ đồ của sảnh và gắn nhóm khách cho từng bàn. Không cần xếp từng người vào ghế."
      requireFull
    >
      {(proposal) => <SeatingAccess proposal={proposal} />}
    </CouplePage>
  );
}

function SeatingAccess({ proposal }: Readonly<{ proposal: Proposal }>) {
  const locked = usePreparationLock(proposal);
  return <SeatingWorkspace key={locked ? 'read' : 'edit'} proposal={proposal} locked={locked} />;
}

function SeatingWorkspace({
  proposal,
  locked,
}: Readonly<{ proposal: Proposal; locked: string | null }>) {
  const [selected, setSelected] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const [dirty, setDirtyState] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const {
    bookingId,
    options,
    loaded,
    groups,
    plan,
    planId,
    loadError,
    reload,
    accept,
    setDirty,
    refreshAvailable,
    requestRefresh,
  } = useSeatingWorkspace(proposal, locked !== null);
  const handleDirty = useCallback(
    (value: boolean) => {
      setDirty(value);
      setDirtyState(value);
    },
    [setDirty],
  );
  const handleSelectLayout = useCallback(
    (next: SeatingPlan | undefined) => {
      accept(next);
      if (next) {
        setTimeout(() => {
          editorRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    },
    [accept],
  );

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!loaded) return <Skeleton label="Đang tải sơ đồ…" />;
  if (locked) {
    return (
      <div className={sx.workspace}>
        <PreparationReadOnlyNotice reason={locked} />
        {plan ? (
          <section className={cx.card}>
            <PlanEditorHeader plan={plan} capacityWarning={null} />
            <SeatingSvg
              plan={plan}
              selected={selected}
              onSelectTable={setSelected}
              colorOf={(table) => table.color ?? '#6E5D63'}
              groupNameOf={(table) => table.guestGroupName ?? undefined}
            />
          </section>
        ) : (
          <p className={cx.note}>Chưa có sơ đồ bàn đã lưu.</p>
        )}
      </div>
    );
  }
  if (!options) return null;

  return (
    <div className={sx.workspace}>
      {dialog}
      {refreshAvailable ? (
        <p role="status" className={cx.alert}>
          Có dữ liệu mới từ nhà hàng hoặc thiết bị khác. Bản đang chỉnh của bạn chưa bị thay thế.{' '}
          <button
            type="button"
            onClick={() =>
              void confirm({
                title: 'Lấy sơ đồ mới nhất?',
                description:
                  'Các thay đổi chưa lưu sẽ bị bỏ. Bạn có thể tiếp tục giữ bản đang chỉnh để đối chiếu.',
                confirmLabel: 'Lấy bản mới',
                cancelLabel: 'Giữ bản đang chỉnh',
              }).then((allowed) => {
                if (allowed) {
                  setDirty(false);
                  setDirtyState(false);
                  reload();
                }
              })
            }
          >
            Xem bản mới
          </button>
        </p>
      ) : null}
      <LayoutSelector
        bookingId={bookingId}
        options={options}
        disabled={dirty}
        plan={plan}
        planId={planId}
        onSelect={handleSelectLayout}
        onStale={reload}
      />
      <div ref={editorRef}>
        {plan && planId ? (
          // key theo revision: khi backend trả bản mới (lưu/xác nhận/tải lại), editor khởi tạo lại
          // nhãn bàn từ đúng bản đó thay vì giữ state cũ.
          <PlanEditor
            key={plan.revisionId}
            bookingId={bookingId}
            plan={plan}
            groups={groups}
            // Không gọi reloadBooking(): sơ đồ không đổi thông tin tiệc/thanh điều hướng, gọi lại
            // /couple/bookings + /proposal chỉ tốn 2 request thừa.
            onDirtyChange={handleDirty}
            onChanged={accept}
            onStale={requestRefresh}
          />
        ) : null}
      </div>
    </div>
  );
}
