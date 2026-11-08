'use client';

import { CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import { type Proposal } from '../couple-workspace/use-couple-workspace';
import { Skeleton } from '../../design-system/skeleton';
import { useGuestsWorkspace } from './use-guests-workspace';
import { SummaryCard } from './summary-card';
import { PlanCard } from './plan-card';
import { GroupsCard } from './groups-card';
import {
  PreparationReadOnlyNotice,
  usePreparationLock,
} from '../couple-workspace/preparation-access';
import { gx } from './guest-classes';

export function GuestsPage() {
  return (
    <CouplePage
      title="Quy mô & nhóm khách"
      description="Nhập số khách dự kiến và tạo nhóm để bố trí sơ đồ bàn. Chia sẻ thiệp chung cho khách mời."
      requireFull
    >
      {(proposal) => <GuestsWorkspace proposal={proposal} />}
    </CouplePage>
  );
}

function GuestsWorkspace({ proposal }: Readonly<{ proposal: Proposal }>) {
  const locked = usePreparationLock(proposal);
  const readOnly = locked !== null;
  const { bookingId, data, loadError, reload, onPlanSaved, onGroupSaved } =
    useGuestsWorkspace(proposal);

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!data) return <Skeleton label="Đang tải quy mô và nhóm khách…" />;

  return (
    <div className={gx.workspace}>
      {locked && <PreparationReadOnlyNotice reason={locked} />}
      <SummaryCard data={data} />
      <div className={gx.settings}>
        <PlanCard
          bookingId={bookingId}
          plan={data.plan}
          readOnly={readOnly}
          maxGuests={proposal.proposal.hall.maxGuests}
          onSaved={onPlanSaved}
        />
      </div>
      <GroupsCard
        bookingId={bookingId}
        groups={data.groups}
        readOnly={readOnly}
        onChanged={onGroupSaved}
      />
    </div>
  );
}
