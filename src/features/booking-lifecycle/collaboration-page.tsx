'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import { TimelineEditor } from './timeline-editor';
import { ProposalMenus } from '../couple-workspace/proposal-menus';
import { Skeleton } from '../../design-system/skeleton';
import { type WebSessionSnapshot } from '../identity-access/session';
import { browserSession } from '../identity-access/browser-session';
import { createExperienceGateway } from '../identity-access/experience-api';
import {
  createCollaborationGateway,
  type CollaborationGateway,
  type ProposalView,
} from './collaboration-api';

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
export type BookingChoice = Readonly<{ bookingId: string; label: string }>;
/** Danh sách tiệc của cặp đôi (để tự mở tiệc và cho phép đổi tiệc). Tách ra prop để test được. */
export type ListBookings = (authorize: Authorize) => Promise<readonly BookingChoice[]>;

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;

const listCoupleBookings: ListBookings = async (authorize) => {
  const overview = await authorize((token) => createExperienceGateway().overview(token));
  return overview.data.map((item) => ({
    bookingId: item.bookingId,
    label: `${item.hallName} · ${item.eventDate.split('-').reverse().join('/')} · ${
      item.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'
    }`,
  }));
};
// Dùng chung một phiên cho cả ứng dụng: nhiều instance sẽ làm mới cookie refresh (bị xoay vòng)
// nhiều lần không cần thiết và có thể làm backend thu hồi phiên.
const session = browserSession;
const gateway = createCollaborationGateway();

const phaseLabels: Record<string, string> = {
  DRAFT: 'Đang trao đổi',
  AWAITING_DEPOSIT: 'Đã thống nhất kịch bản',
  CONFIRMED: 'Đã xác nhận tiệc',
  COMPLETED: 'Tiệc đã hoàn tất',
  CANCELLED: 'Đã hủy',
};

export function CollaborationPage({
  onBookingChange,
}: {
  onBookingChange?: ((bookingId: string) => void) | undefined;
} = {}) {
  const [snapshot, setSnapshot] = useState<WebSessionSnapshot | null>(null);
  useEffect(() => {
    let active = true;
    void session.restore().then((value) => active && setSnapshot(value));
    return () => {
      active = false;
    };
  }, []);
  if (snapshot === null) return <AccessState title="Đang mở không gian cộng tác…" />;
  if (snapshot.status === 'anonymous')
    return (
      <AccessState title="Cần đăng nhập">
        <p role="alert">Hãy đăng nhập hoặc chấp nhận lời mời trước khi xem đề xuất.</p>
        <Link href="/dang-nhap">Về trang đăng nhập</Link>
      </AccessState>
    );
  return (
    <CollaborationWorkspace
      access={snapshot.access}
      authorize={(operation) => session.authorize(operation)}
      gateway={gateway}
      onBookingChange={onBookingChange}
    />
  );
}

export function CollaborationWorkspace({
  access,
  authorize,
  gateway,
  onBookingChange,
  listBookings = listCoupleBookings,
}: Readonly<{
  access: 'restricted' | 'full';
  authorize: Authorize;
  gateway: CollaborationGateway;
  onBookingChange?: ((bookingId: string) => void) | undefined;
  listBookings?: ListBookings;
}>) {
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // null = đang tải danh sách tiệc; [] = cặp đôi chưa có tiệc nào.
  const [availableBookings, setAvailableBookings] = useState<readonly BookingChoice[] | null>(null);
  const requestedRef = useRef(false);

  const activeRequestIdRef = useRef<string | null>(null);

  // Lấy danh sách tiệc của cặp đôi: dùng để tự mở tiệc và hiện ô "Đổi tiệc" khi có nhiều tiệc.
  useEffect(() => {
    let active = true;
    void listBookings(authorize)
      .then((items) => active && setAvailableBookings(items))
      .catch(() => active && setAvailableBookings([]));
    return () => {
      active = false;
    };
  }, [authorize, listBookings]);

  const load = useCallback(
    async (id: string) => {
      const requestId = id + ':' + Date.now();
      activeRequestIdRef.current = requestId;
      setPending(true);
      setError(null);
      setMessage(null);
      try {
        const loadedProposal = await authorize((token) => gateway.load(token, id));
        if (activeRequestIdRef.current !== requestId) {
          return;
        }
        setProposal(loadedProposal);
        setLoaded(true);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('bookingId', id);
          window.history.replaceState({}, '', url.toString());
        }
        onBookingChange?.(id);
      } catch (caught) {
        if (activeRequestIdRef.current !== requestId) {
          return;
        }
        setProposal(null);
        setLoaded(true);
        setError(errorMessage(caught));
      } finally {
        if (activeRequestIdRef.current === requestId) {
          setPending(false);
        }
      }
    },
    [authorize, gateway, onBookingChange],
  );
  /**
   * Tự mở đúng tiệc, không bắt người dùng nhập mã:
   * 1) `?bookingId=` hợp lệ trên URL (đến từ sidebar, tổng quan, email) → mở ngay;
   * 2) không có → đợi danh sách tiệc, mở tiệc đầu tiên;
   * 3) không có tiệc nào → hiện trạng thái trống.
   * `requestedRef` đảm bảo chỉ tự mở một lần; đổi tiệc sau đó do người dùng chọn.
   */
  useEffect(() => {
    if (requestedRef.current) return;
    const fromUrl = new URLSearchParams(window.location.search).get('bookingId');
    if (fromUrl && uuidPattern.test(fromUrl)) {
      requestedRef.current = true;
      queueMicrotask(() => void load(fromUrl));
      return;
    }
    if (availableBookings === null) return;
    requestedRef.current = true;
    const first = availableBookings[0];
    queueMicrotask(() => (first ? void load(first.bookingId) : setLoaded(true)));
  }, [availableBookings, load]);
  const command = async (operation: (token: string) => Promise<void>, success: string) => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await authorize(operation);
      setMessage(success);
      if (proposal)
        setProposal(await authorize((token) => gateway.load(token, proposal.bookingId)));
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0))
        setProposal(null);
      setError(errorMessage(caught, proposal?.proposal.shift));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="collab-shell">
      <a className="skip-link" href="#proposal-content">
        Đi đến đề xuất
      </a>
      <section className="collab-intro">
        <div>
          <p className="script-heading">Thống nhất</p>
          <h1>Đề xuất & kịch bản</h1>
          <span className="collab-access">
            {access === 'full' ? 'Không gian cặp đôi' : 'Không gian tư vấn'}
          </span>
          <p>Xem lại lựa chọn của tiệc, cùng nhà hàng duyệt kịch bản và gửi yêu cầu khi cần.</p>
        </div>
        {availableBookings && availableBookings.length > 1 ? (
          <label className="collab-switch">
            Đổi tiệc cưới
            <select
              value={proposal?.bookingId ?? ''}
              disabled={pending}
              onChange={(event) => {
                if (event.target.value) void load(event.target.value);
              }}
            >
              {proposal ? null : <option value="">Chọn tiệc…</option>}
              {availableBookings.map((item) => (
                <option key={item.bookingId} value={item.bookingId}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>
      <div className="collab-live" aria-live="polite">
        {pending ? <p role="status">Đang đồng bộ hồ sơ…</p> : null}
        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <section id="proposal-content">
        {!loaded ? (
          <Skeleton label="Đang mở đề xuất của hai bạn…" />
        ) : proposal === null && availableBookings?.length === 0 && !error ? (
          <EmptyState
            title="Chưa có hồ sơ tiệc cưới"
            body="Nhà hàng sẽ mở đề xuất sau buổi tư vấn và gửi lời mời vào không gian cưới qua email."
          >
            <Link className="button" href="/tu-van">
              Liên hệ tư vấn
            </Link>
          </EmptyState>
        ) : proposal === null ? (
          <EmptyState
            title="Chưa thể mở đề xuất"
            body="Liên kết có thể đã cũ hoặc tài khoản chưa được cấp quyền cho tiệc này. Hãy chọn lại tiệc hoặc liên hệ nhà hàng."
          />
        ) : (
          <ProposalWorkspace
            access={access}
            proposal={proposal}
            pending={pending}
            command={command}
            gateway={gateway}
          />
        )}
      </section>
    </div>
  );
}

function ProposalWorkspace({
  access,
  command,
  gateway,
  pending,
  proposal,
}: Readonly<{
  access: 'restricted' | 'full';
  proposal: ProposalView;
  pending: boolean;
  gateway: CollaborationGateway;
  command: (operation: (token: string) => Promise<void>, success: string) => Promise<void>;
}>) {
  const timeline = proposal.timeline;
  const billingHref = `/khong-gian/thanh-toan?bookingId=${proposal.bookingId}`;
  const bothApproved = Boolean(timeline?.managerApprovedAt && timeline?.coupleApprovedAt);
  const confirmed = proposal.phase === 'CONFIRMED';
  // Bước tiếp theo theo giai đoạn: giữ đúng câu chữ cũ để người dùng (và test) nhận ra.
  const next =
    proposal.phase === 'CANCELLED' ? (
      <NextStep
        tone="muted"
        title="Hồ sơ tiệc đã hủy"
        body="Hồ sơ tiệc cưới này đã kết thúc hoặc bị hủy."
      />
    ) : proposal.phase === 'COMPLETED' ? (
      <NextStep
        tone="done"
        title="Tiệc cưới đã hoàn tất"
        body="Sự kiện đã diễn ra thành công. Bạn có thể kiểm tra lịch sử quyết toán tại trang công nợ."
        href={billingHref}
        action="Xem quyết toán công nợ →"
      />
    ) : confirmed ? (
      <NextStep
        tone="done"
        title="Tiệc cưới đã xác nhận chính thức"
        body="Hồ sơ đã được đặt cọc. Mọi điều chỉnh kịch bản lúc này sẽ gửi dưới dạng yêu cầu thay đổi để nhà hàng duyệt."
        href={billingHref}
        action="Xem công nợ & thanh toán số dư →"
      />
    ) : proposal.phase === 'AWAITING_DEPOSIT' || (proposal.phase === 'DRAFT' && bothApproved) ? (
      <NextStep
        tone="done"
        title="Đã thống nhất kịch bản"
        body="Kịch bản đã được cả hai bên phê duyệt. Hồ sơ đủ điều kiện để tiến hành đặt cọc giữ sảnh chính thức."
        href={billingHref}
        action="Chuyển sang đặt cọc →"
      />
    ) : (
      <NextStep
        tone="muted"
        title="Đang chờ thống nhất kịch bản"
        body="Khi nhà hàng và hai bạn cùng duyệt một bản kịch bản, bạn có thể lập hợp đồng và đặt cọc."
      />
    );
  return (
    <div className="collab-layout">
      <div className="collab-main">
        <section className="collab-proposal" aria-label="Tóm tắt đề xuất">
          <div className="collab-proposal-title">
            <span>{phaseLabels[proposal.phase] ?? proposal.phase}</span>
            <h2>{proposal.proposal.hall.name}</h2>
            <p>
              {proposal.eventDate.split('-').reverse().join('/')} ·{' '}
              {proposal.proposal.shift.code === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}{' '}
              {proposal.proposal.shift.startTime}–{proposal.proposal.shift.endTime}
            </p>
          </div>
          <dl>
            <div>
              <dt>Thực đơn</dt>
              <dd>
                <ProposalMenus offer={proposal.proposal} />
              </dd>
            </div>
            <div>
              <dt>Số bàn</dt>
              <dd>{proposal.proposal.tableCount}</dd>
            </div>
            <div>
              <dt>Khách dự kiến</dt>
              <dd>{proposal.planningHeadcount}</dd>
            </div>
            <div>
              <dt>Tổng dự kiến</dt>
              <dd>{money(proposal.proposal.baseChargeVnd)}</dd>
            </div>
            <div>
              <dt>Tiền cọc (30%)</dt>
              <dd>{money(proposal.proposal.depositAmountVnd)}</dd>
            </div>
          </dl>
        </section>

        <article className="collab-timeline">
          <div className="collab-card-head">
            <div>
              <p className="collab-kicker">
                Kịch bản hiện tại · Bản {timeline?.revisionNumber ?? 0}
              </p>
              <h2>Dòng thời gian</h2>
            </div>
            <span className="collab-shift-note">
              Giờ hợp lệ: {proposal.proposal.shift.startTime}–{proposal.proposal.shift.endTime}
            </span>
          </div>
          {timeline === null || timeline.items.length === 0 ? (
            <EmptyState
              title="Chưa có mốc chương trình"
              body="Thêm mốc đầu tiên để hai bên cùng xem và phê duyệt."
            />
          ) : (
            <ol>
              {timeline.items.map((item) => (
                <li key={item.itemId}>
                  <time>{item.startTime}</time>
                  <span>
                    <strong>{item.title}</strong>
                    {item.description ? <small>{item.description}</small> : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {/* Form sửa chỉ mở khi cần, để trang gọn; mở sẵn khi chưa có mốc nào. */}
          <details className="collab-edit" open={timeline === null || timeline.items.length === 0}>
            <summary>{confirmed ? 'Đề xuất thay đổi kịch bản' : 'Chỉnh sửa kịch bản'}</summary>
            <p className="collab-hint">
              Giờ bắt đầu mỗi mốc phải từ {proposal.proposal.shift.startTime} đến trước{' '}
              {proposal.proposal.shift.endTime} theo ca tiệc đã chọn.
              {confirmed ? ' Tiệc đã cọc nên thay đổi cần nhà hàng duyệt.' : ''}
            </p>
            <TimelineEditor
              key={proposal.bookingId + ':' + (timeline?.revisionId ?? 'empty')}
              disabled={pending || !proposal.capabilities.canEditTimeline}
              initialItems={timeline?.items ?? []}
              needsReason={confirmed}
              onSave={(items, reason) => {
                const input = {
                  bookingId: proposal.bookingId,
                  expectedRevision: proposal.revision,
                  predecessorRevisionId: timeline?.revisionId ?? null,
                  items,
                };
                return command(
                  (token) =>
                    confirmed
                      ? gateway.requestChange(token, { ...input, reason })
                      : gateway.saveTimeline(token, input),
                  confirmed ? 'Đã gửi yêu cầu thay đổi kịch bản.' : 'Đã lưu revision kịch bản mới.',
                );
              }}
            />
          </details>
        </article>
      </div>

      <aside className="collab-side">
        <section className="collab-decisions" aria-label="Phê duyệt kịch bản">
          <p className="collab-kicker">Quyết định của hai bên</p>
          <h2>Phê duyệt</h2>
          <Approval label="Nhà hàng" value={timeline?.managerApprovedAt ?? null} />
          <Approval label="Hai bạn" value={timeline?.coupleApprovedAt ?? null} />
          {timeline === null ? (
            <p className="collab-hint">Chưa có kịch bản để duyệt.</p>
          ) : (
            <>
              <button
                className="collab-approve"
                disabled={pending || !proposal.capabilities.canApproveTimeline}
                type="button"
                onClick={() =>
                  void command(
                    (token) =>
                      gateway.approve(token, {
                        bookingId: proposal.bookingId,
                        revisionId: timeline.revisionId,
                        expectedRevision: proposal.revision,
                      }),
                    'Đã ghi nhận phê duyệt revision hiện tại.',
                  )
                }
              >
                Phê duyệt revision này
              </button>
              <details className="collab-more">
                <summary>Rút lại phê duyệt</summary>
                <form
                  className="collab-withdraw"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const reason = field(new FormData(event.currentTarget), 'reason');
                    void command(
                      (token) =>
                        gateway.withdraw(token, {
                          bookingId: proposal.bookingId,
                          revisionId: timeline.revisionId,
                          expectedRevision: proposal.revision,
                          reason,
                        }),
                      'Đã rút phê duyệt.',
                    );
                  }}
                >
                  <label>
                    Lý do rút phê duyệt
                    <textarea name="reason" required maxLength={500} rows={2} />
                  </label>
                  <button
                    className="collab-secondary"
                    disabled={pending || !proposal.capabilities.canWithdrawApproval}
                    type="submit"
                  >
                    Rút phê duyệt
                  </button>
                </form>
              </details>
            </>
          )}
        </section>

        <section className="collab-next-card" aria-label="Bước tiếp theo">
          <p className="collab-kicker">Bước tiếp theo</p>
          {next}
        </section>

        {access === 'full' && proposal.capabilities.canRequestCancellation ? (
          <details className="collab-more collab-cancel-box">
            <summary>Cần đổi hoặc huỷ tiệc?</summary>
            <p className="collab-hint">
              Muốn đổi giờ hay nội dung chương trình, hãy dùng “Đề xuất thay đổi kịch bản”. Yêu cầu
              huỷ sẽ được Quản lý xem xét theo chính sách đã ký.
            </p>
            <form
              className="collab-cancel"
              onSubmit={(event) => {
                event.preventDefault();
                const reason = field(new FormData(event.currentTarget), 'reason');
                void command(
                  (token) =>
                    gateway.requestCancellation(token, {
                      bookingId: proposal.bookingId,
                      expectedRevision: proposal.revision,
                      reason,
                    }),
                  'Đã gửi yêu cầu hủy để Quản lý xem xét.',
                );
              }}
            >
              <h3>Yêu cầu hủy</h3>
              <label>
                Lý do
                <textarea name="reason" required maxLength={500} rows={3} />
              </label>
              <button disabled={pending} type="submit">
                Gửi yêu cầu hủy
              </button>
            </form>
          </details>
        ) : null}
      </aside>
    </div>
  );
}

function Approval({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div className="approval-row">
      <span>{label}</span>
      <strong>
        {value === null
          ? 'Chờ duyệt'
          : `Đã duyệt · ${new Intl.DateTimeFormat('vi-VN').format(new Date(value))}`}
      </strong>
    </div>
  );
}
function EmptyState({
  body,
  children,
  title,
}: Readonly<{ body: string; title: string; children?: React.ReactNode }>) {
  return (
    <div className="collab-empty">
      <strong>{title}</strong>
      <p>{body}</p>
      {children}
    </div>
  );
}

/** Thẻ "Bước tiếp theo" ở cột phải – nội dung tuỳ giai đoạn của tiệc. */
function NextStep({
  tone,
  title,
  body,
  href,
  action,
}: Readonly<{
  tone: 'done' | 'muted';
  title: string;
  body: string;
  href?: string;
  action?: string;
}>) {
  return (
    <div className={'collab-next collab-next-' + tone}>
      <strong>{title}</strong>
      <p>{body}</p>
      {href && action ? (
        <Link className="button" href={href}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}
function AccessState({ children, title }: Readonly<{ children?: React.ReactNode; title: string }>) {
  return (
    <div className="collab-access-state">
      <p className="collab-kicker">Hỷ Yến</p>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
function money(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}
function errorMessage(error: unknown, shift?: ProposalView['proposal']['shift']): string {
  if (!(error instanceof ApiClientError))
    return 'Không thể đồng bộ hồ sơ. Nội dung bạn nhập vẫn được giữ lại.';
  if (error.code === 'TIMELINE_ITEM_TIME_INVALID')
    return shift
      ? `Giờ bắt đầu mốc chương trình phải từ ${shift.startTime} đến trước ${shift.endTime}. Hãy sửa giờ rồi lưu lại. Nội dung đã nhập vẫn được giữ lại.`
      : 'Giờ bắt đầu mốc chương trình phải nằm trong ca tiệc đã chọn. Hãy sửa giờ rồi lưu lại.';
  if (error.code === 'TIMELINE_APPROVAL_REQUIRES_ITEM')
    return 'Chưa thể phê duyệt kịch bản trống. Hãy thêm và lưu ít nhất một mốc chương trình trước khi phê duyệt.';
  if (error.code === 'TIMELINE_ITEM_COUNT_INVALID')
    return 'Kịch bản chỉ được có tối đa 100 mốc. Hãy xóa bớt mốc rồi lưu lại.';
  if (error.code === 'TIMELINE_ITEM_TEXT_INVALID')
    return 'Nội dung mỗi mốc cần từ 1–120 ký tự; ghi chú tối đa 2.000 ký tự. Hãy sửa nội dung rồi lưu lại.';
  if (error.code === 'STALE_BOOKING_REVISION' || error.code === 'TIMELINE_REVISION_SUPERSEDED')
    return 'Đề xuất vừa được cập nhật. Hãy tải lại rồi thực hiện trên revision mới nhất.';
  if (error.code === 'DEPOSIT_INTENT_ACTIVE')
    return 'Đang có giao dịch tiền cọc chưa kết thúc nên chưa thể thay đổi nội dung này.';
  if (error.status === 403 || error.status === 404)
    return 'Không tìm thấy hồ sơ hoặc tài khoản chưa được cấp quyền.';
  return 'Yêu cầu chưa hoàn tất. Vui lòng kiểm tra dữ liệu và thử lại.';
}
