import type { GuestsData } from './use-guests-workspace';
import { gx } from './guest-classes';
export function SummaryCard({ data }: Readonly<{ data: GuestsData }>) {
  return (
    <section className={gx.card} aria-label="Tóm tắt chuẩn bị tiệc">
      <dl className={gx.stats}>
        <div>
          <dt>Số khách dự kiến</dt>
          <dd>{data.plan.planningHeadcount}</dd>
        </div>
        <div>
          <dt>Nhóm đang dùng</dt>
          <dd>{data.groups.filter((group) => group.status === 'ACTIVE').length}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Số khách dự kiến được nhập riêng để chuẩn bị tiệc và kiểm tra sức chứa sảnh.
      </p>
    </section>
  );
}
