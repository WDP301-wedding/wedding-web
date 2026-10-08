'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import { TimelineEditor } from './timeline-editor';
import {
  createIdentityApi,
  WebIdentitySession,
  type WebSessionSnapshot,
} from '../identity-access/session';
import {
  createCollaborationGateway,
  type CollaborationGateway,
  type ProposalView,
} from './collaboration-api';

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
const session = new WebIdentitySession(createIdentityApi());
const gateway = createCollaborationGateway();

export function CollaborationPage() {
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
        <Link href="/account">Về trang đăng nhập</Link>
      </AccessState>
    );
  return (
    <CollaborationWorkspace
      access={snapshot.access}
      authorize={(operation) => session.authorize(operation)}
      gateway={gateway}
    />
  );
}

export function CollaborationWorkspace({
  access,
  authorize,
  gateway,
}: Readonly<{
  access: 'restricted' | 'full';
  authorize: Authorize;
  gateway: CollaborationGateway;
}>) {
  const [bookingId, setBookingId] = useState('');
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (id: string) => {
      setPending(true);
      setError(null);
      setMessage(null);
      try {
        setProposal(await authorize((token) => gateway.load(token, id)));
        setLoaded(true);
      } catch (caught) {
        setProposal(null);
        setLoaded(true);
        setError(errorMessage(caught));
      } finally {
        setPending(false);
      }
    },
    [authorize, gateway],
  );
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('bookingId');
    if (value)
      queueMicrotask(() => {
        setBookingId(value);
        if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value))
          void load(value);
      });
  }, [load]);
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
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="collab-shell">
      <a className="skip-link" href="#proposal-content">
        Đi đến đề xuất
      </a>
      <header className="collab-header">
        <Link className="collab-brand" href="/overview">
          <small>THE</small>
          <strong>WEDDING ESTATE</strong>
        </Link>
        <span className="collab-access">
          {access === 'full' ? 'Không gian cặp đôi' : 'Không gian tư vấn'}
        </span>
      </header>
      <section className="collab-intro">
        <p className="script-heading">Một kế hoạch cùng vun đắp</p>
        <h1>Đề xuất ngày trọng đại</h1>
        <p>
          Xem lại lựa chọn, cùng duyệt kịch bản và gửi yêu cầu bằng hồ sơ được nhà hàng xác thực.
        </p>
        <form
          className="collab-lookup"
          onSubmit={(event) => {
            event.preventDefault();
            void load(bookingId.trim());
          }}
        >
          <label>
            Mã hồ sơ đặt tiệc
            <input
              value={bookingId}
              onChange={(event) => setBookingId(event.target.value)}
              required
              placeholder="Mã trong lời mời của bạn"
            />
          </label>
          <button disabled={pending || bookingId.trim() === ''} type="submit">
            Mở đề xuất
          </button>
        </form>
      </section>
      <div className="collab-live" aria-live="polite">
        {pending ? <p role="status">Đang đồng bộ hồ sơ…</p> : null}
        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <section id="proposal-content">
        {!loaded ? (
          <EmptyState
            title="Sẵn sàng khi bạn có mã hồ sơ"
            body="Mã booking được cung cấp trong quá trình tư vấn. Dữ liệu chỉ hiển thị sau khi máy chủ xác nhận quyền."
          />
        ) : proposal === null ? (
          <EmptyState
            title="Chưa thể mở đề xuất"
            body="Kiểm tra lại mã hồ sơ hoặc yêu cầu Quản lý cấp quyền cộng tác."
          />
        ) : (
          <ProposalWorkspace
            access={access}
            proposal={proposal}
            pending={pending || error !== null}
            command={command}
            gateway={gateway}
          />
        )}
      </section>
    </main>
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
  return (
    <>
      <section className="collab-proposal" aria-label="Tóm tắt đề xuất">
        <div className="collab-proposal-title">
          <span>{proposal.phase.replaceAll('_', ' ')}</span>
          <h2>{proposal.proposal.hall.name}</h2>
          <p>
            {proposal.eventDate} · {proposal.proposal.shift.startTime}–
            {proposal.proposal.shift.endTime}
          </p>
        </div>
        <dl>
          <div>
            <dt>Thực đơn</dt>
            <dd>{proposal.proposal.menu.name}</dd>
          </div>
          <div>
            <dt>Số bàn</dt>
            <dd>{proposal.proposal.tableCount}</dd>
          </div>
          <div>
            <dt>Tổng dự kiến</dt>
            <dd>{money(proposal.proposal.baseChargeVnd)}</dd>
          </div>
          <div>
            <dt>Tiền cọc</dt>
            <dd>{money(proposal.proposal.depositAmountVnd)}</dd>
          </div>
        </dl>
      </section>
      <section className="collab-columns">
        <article className="collab-timeline">
          <p className="collab-kicker">
            Kịch bản hiện tại · Revision {timeline?.revisionNumber ?? 0}
          </p>
          <h2>Dòng thời gian</h2>
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
          <TimelineEditor
            key={proposal.bookingId + ':' + (timeline?.revisionId ?? 'empty')}
            disabled={pending || !proposal.capabilities.canEditTimeline}
            initialItems={timeline?.items ?? []}
            needsReason={proposal.phase === 'CONFIRMED'}
            onSave={(items, reason) => {
              const input = {
                bookingId: proposal.bookingId,
                expectedRevision: proposal.revision,
                predecessorRevisionId: timeline?.revisionId ?? null,
                items,
              };
              return command(
                (token) =>
                  proposal.phase === 'CONFIRMED'
                    ? gateway.requestChange(token, { ...input, reason })
                    : gateway.saveTimeline(token, input),
                proposal.phase === 'CONFIRMED'
                  ? 'Đã gửi yêu cầu thay đổi kịch bản.'
                  : 'Đã lưu revision kịch bản mới.',
              );
            }}
          />
        </article>
        <aside className="collab-decisions">
          <p className="collab-kicker">Quyết định của hai bên</p>
          <h2>Phê duyệt</h2>
          <Approval label="Quản lý" value={timeline?.managerApprovedAt ?? null} />
          <Approval label="Cặp đôi" value={timeline?.coupleApprovedAt ?? null} />
          {timeline === null ? null : (
            <>
              <button
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
            </>
          )}
          {access === 'full' && proposal.capabilities.canRequestCancellation ? (
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
          ) : null}
        </aside>
      </section>
    </>
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
function EmptyState({ body, title }: Readonly<{ body: string; title: string }>) {
  return (
    <div className="collab-empty">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
function AccessState({ children, title }: Readonly<{ children?: React.ReactNode; title: string }>) {
  return (
    <main className="collab-access-state">
      <p className="collab-kicker">Wedding Estate</p>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
function money(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}
function errorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError))
    return 'Không thể đồng bộ hồ sơ. Nội dung bạn nhập vẫn được giữ lại.';
  if (error.code === 'STALE_BOOKING_REVISION')
    return 'Đề xuất vừa được cập nhật. Hãy tải lại rồi thực hiện trên revision mới nhất.';
  if (error.code === 'DEPOSIT_INTENT_ACTIVE')
    return 'Đang có giao dịch tiền cọc chưa kết thúc nên chưa thể thay đổi nội dung này.';
  if (error.status === 403 || error.status === 404)
    return 'Không tìm thấy hồ sơ hoặc tài khoản chưa được cấp quyền.';
  return 'Yêu cầu chưa hoàn tất. Vui lòng kiểm tra dữ liệu và thử lại.';
}
