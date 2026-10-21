import { CommandFeedback } from '../couple-workspace/couple-page';
import { formText, useCommand, type Proposal } from '../couple-workspace/use-couple-workspace';
import { seatingApi, type LayoutOptions, type SeatingPlan } from './seating-api';
import { layoutWarnings } from './use-seating-workspace';

export function LayoutSelector({
  bookingId,
  proposal,
  options,
  plan,
  planId,
  onSelect,
}: Readonly<{
  bookingId: string;
  proposal: Proposal;
  options: LayoutOptions;
  plan: SeatingPlan | null;
  planId: string | null;
  onSelect: (next: SeatingPlan | undefined) => void;
}>) {
  const command = useCommand();

  return (
    <section className="cw-card">
      <div className="cw-card-header">
        <h2>{plan ? `Mẫu đang dùng: ${plan.layoutName}` : 'Chọn mẫu sơ đồ'}</h2>
        <span className="muted">Số khách dự kiến: {options.planningHeadcount}</span>
      </div>
      {options.items.length === 0 ? (
        <p className="cw-note">Sảnh chưa có mẫu sơ đồ nào được xuất bản. Hãy liên hệ nhà hàng.</p>
      ) : (
        <div className="cw-table-wrap">
          <table className="cw-table">
            <thead>
              <tr>
                <th scope="col">Mẫu</th>
                <th scope="col">Phù hợp</th>
                <th scope="col" className="num">
                  Khoảng khách
                </th>
                <th scope="col" className="num">
                  Tổng ghế
                </th>
                <th scope="col">Chọn</th>
              </tr>
            </thead>
            <tbody>
              {options.items.map((option) => (
                <tr key={option.layoutTemplateVersionId}>
                  <td>
                    {option.name}
                    {option.warning ? (
                      <>
                        <br />
                        <small className="muted">
                          {layoutWarnings[option.warning] ?? 'Mẫu cần được nhà hàng kiểm tra lại.'}
                        </small>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {option.compatible
                      ? 'Phù hợp'
                      : option.warning === 'EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY'
                        ? 'Không đủ chỗ'
                        : 'Ngoài khoảng'}
                  </td>
                  <td className="num">
                    {option.minGuests}–{option.maxGuests}
                  </td>
                  <td className="num">{option.totalSeatCapacity}</td>
                  <td>
                    <button
                      className="cw-text-button"
                      type="button"
                      disabled={
                        command.pending ||
                        plan?.layoutTemplateVersionId === option.layoutTemplateVersionId
                      }
                      onClick={() =>
                        void command
                          .run(
                            (token, key) =>
                              plan && planId
                                ? seatingApi.revise(token, key, bookingId, planId, {
                                    expectedRevision: plan.revisionNumber,
                                    layoutTemplateVersionId: option.layoutTemplateVersionId,
                                  })
                                : seatingApi.create(
                                    token,
                                    key,
                                    bookingId,
                                    option.layoutTemplateVersionId,
                                    proposal.revision,
                                  ),
                            plan
                              ? 'Đã đổi mẫu. Nhãn trên các bàn trùng mã được giữ lại.'
                              : 'Đã tạo sơ đồ nháp.',
                            {
                              SEATING_PLAN_EXISTS:
                                'Tiệc đã có sơ đồ được tạo từ thiết bị khác. Mở trên thiết bị đó, hoặc nhập mã sơ đồ bên dưới (hỏi nhà hàng nếu cần).',
                            },
                          )
                          .then(onSelect)
                      }
                    >
                      {plan?.layoutTemplateVersionId === option.layoutTemplateVersionId
                        ? 'Đang dùng'
                        : plan
                          ? 'Đổi sang mẫu này'
                          : 'Dùng mẫu này'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {options.items.length > 0 && !options.items.some((option) => option.compatible) ? (
        <p className="cw-note">
          Sảnh hiện chưa có mẫu phù hợp với {options.planningHeadcount} khách dự kiến. Hãy liên hệ
          nhà hàng để bổ sung mẫu phù hợp hoặc kiểm tra khoảng khách cho phép của mẫu; ngoại lệ
          không được vượt sức chứa thực tế.
        </p>
      ) : null}
      {/*
        Backend chưa có API liệt kê sơ đồ của tiệc: mã sơ đồ được nhớ trong trình duyệt đã tạo nó.
        Chỉ khi tạo sơ đồ bị báo "đã có sơ đồ" (tạo từ thiết bị khác) mới hiện ô nhập mã dự phòng;
        luồng bình thường không bao giờ hỏi mã.
      */}
      {!plan && command.error?.code === 'SEATING_PLAN_EXISTS' ? (
        <form
          className="cw-form"
          onSubmit={(event) => {
            event.preventDefault();
            const id = formText(new FormData(event.currentTarget), 'planId');
            if (!id) return;
            void command.run((token) => seatingApi.plan(token, bookingId, id)).then(onSelect);
          }}
        >
          <details open>
            <summary>Mở sơ đồ đã tạo trên thiết bị khác</summary>
            <div className="cw-form-row">
              <label>
                Mã sơ đồ
                <input name="planId" placeholder="xxxxxxxx-xxxx-…" />
              </label>
            </div>
            <button className="button button-secondary" type="submit" disabled={command.pending}>
              Mở sơ đồ
            </button>
          </details>
        </form>
      ) : null}
      <CommandFeedback error={command.error} notice={command.notice} />
    </section>
  );
}
