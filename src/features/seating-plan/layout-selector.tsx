import { formText, useCommand } from '../couple-workspace/use-couple-workspace';
import { seatingApi, type LayoutOptions, type SeatingPlan } from './seating-api';
import { layoutWarnings } from './use-seating-workspace';

export function LayoutSelector({
  bookingId,
  options,
  plan,
  planId,
  onSelect,
  onStale,
}: Readonly<{
  bookingId: string;
  options: LayoutOptions;
  plan: SeatingPlan | null;
  planId: string | null;
  onSelect: (next: SeatingPlan | undefined) => void;
  /** Dữ liệu trên trang đã cũ so với backend → tải lại mẫu + sơ đồ hiện tại. */
  onStale: () => void;
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
                                    // Revision tiệc lấy từ danh sách mẫu vừa tải (luôn mới), KHÔNG
                                    // dùng proposal.revision trong cache: cache chỉ tải một lần nên
                                    // sau khi đổi số khách sẽ lệch → 409 SEATING_REVISION_STALE.
                                    options.bookingRevision,
                                  ),
                            plan
                              ? 'Đã đổi mẫu. Nhãn trên các bàn trùng mã được giữ lại.'
                              : 'Đã tạo sơ đồ nháp.',
                            {
                              SEATING_PLAN_EXISTS:
                                'Tiệc đã có sơ đồ (có thể vừa tạo ở thiết bị khác). Đã tải lại sơ đồ hiện tại.',
                              SEATING_REVISION_STALE:
                                'Thông tin tiệc vừa thay đổi (vd. số khách). Đã tải lại danh sách mẫu — hãy chọn lại.',
                            },
                            (error) => {
                              if (
                                error.code === 'SEATING_REVISION_STALE' ||
                                error.code === 'SEATING_PLAN_EXISTS'
                              )
                                onStale();
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
    </section>
  );
}
