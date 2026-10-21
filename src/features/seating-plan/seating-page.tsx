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
      {(proposal) => <SeatingWorkspace proposal={proposal} />}
    </CouplePage>
  );
}

function SeatingWorkspace({ proposal }: Readonly<{ proposal: Proposal }>) {
  const { bookingId, options, groups, plan, planId, loadError, reload, accept } =
    useSeatingWorkspace(proposal);

  if (loadError) return <ErrorPanel error={loadError} onRetry={reload} />;
  if (!options) return <Skeleton label="Đang tải sơ đồ…" />;

  return (
    <>
      <LayoutSelector
        bookingId={bookingId}
        options={options}
        plan={plan}
        planId={planId}
        onSelect={accept}
        onStale={reload}
      />
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
          onChanged={accept}
          onStale={reload}
        />
      ) : null}
    </>
  );
}
