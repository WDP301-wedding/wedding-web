'use client';

import { CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import { type Proposal } from '../couple-workspace/use-couple-workspace';
import { Skeleton } from '../../design-system/skeleton';
import { LayoutSelector } from './layout-selector';
import { PlanEditor } from './plan-editor';
import { useSeatingWorkspace } from './use-seating-workspace';

export function SeatingPage() {
  return (
    <CouplePage
      active="seating"
      eyebrow="Sau đặt cọc"
      title="Sơ đồ bàn"
      description="Chọn mẫu sơ đồ của sảnh và gắn nhóm khách cho từng bàn. Không cần xếp từng người vào ghế."
      requireFull
    >
      {(proposal, reloadBooking) => (
        <SeatingWorkspace proposal={proposal} reloadBooking={reloadBooking} />
      )}
    </CouplePage>
  );
}

function SeatingWorkspace({
  proposal,
  reloadBooking,
}: Readonly<{ proposal: Proposal; reloadBooking: () => void }>) {
  const { bookingId, options, groups, plan, planId, loadError, reload, accept } =
    useSeatingWorkspace(proposal);

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!options) return <Skeleton label="Đang tải sơ đồ…" />;

  return (
    <>
      <LayoutSelector
        bookingId={bookingId}
        proposal={proposal}
        options={options}
        plan={plan}
        planId={planId}
        onSelect={accept}
      />
      {plan && planId ? (
        <PlanEditor
          bookingId={bookingId}
          plan={plan}
          groups={groups}
          onChanged={(next) => {
            accept(next);
            reloadBooking();
          }}
        />
      ) : null}
    </>
  );
}
