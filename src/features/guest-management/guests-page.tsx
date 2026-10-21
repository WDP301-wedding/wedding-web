'use client';

import { CouplePage, ErrorPanel } from '../couple-workspace/couple-page';
import { type Proposal } from '../couple-workspace/use-couple-workspace';
import { Skeleton } from '../../design-system/skeleton';
import { useGuestsWorkspace } from './use-guests-workspace';
import { SummaryCard } from './summary-card';
import { PlanCard } from './plan-card';
import { GroupsCard } from './groups-card';
import { GuestListCard } from './guest-list-card';
import { ImportCard } from './import-card';
import { CheckInCard } from './check-in-card';

export function GuestsPage() {
  return (
    <CouplePage
      active="guests"
      eyebrow="Sau đặt cọc"
      title="Khách mời"
      description="Nhóm khách dùng được ngay cả khi chưa có danh sách tên. Số khách dự kiến nhập riêng, không tự tính từ danh sách."
      requireFull
    >
      {(proposal) => <GuestsWorkspace proposal={proposal} />}
    </CouplePage>
  );
}

function GuestsWorkspace({ proposal }: Readonly<{ proposal: Proposal }>) {
  const {
    bookingId,
    data,
    status,
    setStatus,
    loadError,
    reload,
    onPlanSaved,
    onCheckInChanged,
    onGroupSaved,
    onGuestSaved,
  } = useGuestsWorkspace(proposal);

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!data) return <Skeleton label="Đang tải khách mời…" />;

  return (
    <>
      <SummaryCard data={data} status={status} />
      <PlanCard
        bookingId={bookingId}
        plan={data.plan}
        maxGuests={proposal.proposal.hall.maxGuests}
        onSaved={onPlanSaved}
      />
      <GroupsCard bookingId={bookingId} groups={data.groups} onChanged={onGroupSaved} />
      <GuestListCard
        bookingId={bookingId}
        groups={data.groups}
        guests={data.guests}
        status={status}
        onStatusChange={setStatus}
        onChanged={onGuestSaved}
      />
      <ImportCard bookingId={bookingId} groups={data.groups} onImported={reload} />
      <CheckInCard
        bookingId={bookingId}
        settings={data.settings}
        attendance={data.attendance}
        onChanged={onCheckInChanged}
      />
    </>
  );
}
