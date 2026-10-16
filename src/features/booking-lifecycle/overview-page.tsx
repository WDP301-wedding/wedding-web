'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { WorkspaceShell } from '../couple-workspace/workspace-shell';
import { browserSession } from '../identity-access/identity-page';
import { createExperienceGateway, type Overview } from '../identity-access/experience-api';
import type { WebSessionSnapshot } from '../identity-access/session';
import { ApiClientError } from '../../lib/api/client';

const gateway = createExperienceGateway();
const phases = {
  DRAFT: 'Đang trao đổi',
  AWAITING_DEPOSIT: 'Đã thống nhất kịch bản',
  CONFIRMED: 'Đã xác nhận tiệc',
  COMPLETED: 'Tiệc đã hoàn tất',
  CANCELLED: 'Đã hủy',
};
export function CoupleOverview() {
  const [session, setSession] = useState<WebSessionSnapshot | null>(null);
  const [page, setPage] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    void browserSession
      .restore()
      .then(async (snapshot) => {
        if (!active) return;
        setSession(snapshot);
        if (snapshot.status === 'authenticated') {
          const result = await browserSession.authorize((token) => gateway.overview(token));
          if (active) {
            setPage(result);
            setError(null);
          }
        }
      })
      .catch(() => {
        if (active) {
          setPage(null);
          setError('Chưa tải được kế hoạch. Hãy thử lại.');
        }
      });
    return () => {
      active = false;
    };
  }, [retry]);
  async function more() {
    if (!page?.nextCursor || pending) return;
    setPending(true);
    try {
      const next = await browserSession.authorize((token) =>
        gateway.overview(token, page.nextCursor!),
      );
      setPage({ ...next, data: [...page.data, ...next.data] });
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0)) {
        setPage(null);
        setSession(browserSession.snapshot());
      }
      setError('Chưa tải được các hồ sơ tiếp theo.');
    } finally {
      setPending(false);
    }
  }
  return (
    <WorkspaceShell active="overview" bookingId={page?.data[0]?.bookingId}>
      <section className="public-section overview-section">
        <div className="public-section-heading">
          <div>
            <span className="public-kicker">Hành trình của hai bạn</span>
            <h1>Kế hoạch ngày chung đôi</h1>
          </div>
          <Link href="/account">Hồ sơ & bảo mật →</Link>
        </div>
        {session === null && !error ? <p role="status">Đang mở không gian riêng…</p> : null}
        {session?.status === 'anonymous' ? (
          <div className="overview-empty">
            <h2>Tiếp tục hành trình của bạn</h2>
            <p>Đăng nhập bằng tài khoản đã được nhà hàng mời để mở hồ sơ tư vấn.</p>
            <Link className="public-button" href="/account">
              Đăng nhập →
            </Link>
          </div>
        ) : null}
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <button onClick={() => setRetry((value) => value + 1)}>Thử lại</button>
          </div>
        ) : null}
        {session?.status === 'authenticated' && !page && !error ? (
          <p role="status">Đang tải hồ sơ của bạn…</p>
        ) : null}
        {page?.data.length === 0 ? (
          <div className="overview-empty">
            <h2>Hồ sơ đang được chuẩn bị</h2>
            <p>Nhà hàng sẽ mở đề xuất sau khi thống nhất các lựa chọn trong buổi tư vấn.</p>
            <Link href="/consultation">Liên hệ nhà hàng →</Link>
          </div>
        ) : null}
        {page?.data.map((booking) => (
          <article key={booking.bookingId} className="overview-booking">
            <div className="hero-card">
              <Image
                className="overview-image"
                src="/images/v0-wedding-venue.png"
                alt="Không gian sân vườn minh họa cho thiết kế"
                width={1000}
                height={700}
              />
              <div className="overview-event">
                <span>{phases[booking.phase]}</span>
                <h2>
                  {new Date(`${booking.eventDate}T00:00:00+07:00`).toLocaleDateString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
                <p>
                  {booking.hallName} · {booking.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}
                </p>
                <p>{booking.planningHeadcount} khách dự kiến</p>
                <div
                  className="overview-links"
                  style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}
                >
                  <Link
                    className="public-button"
                    href={`/workspace?bookingId=${booking.bookingId}`}
                  >
                    Mở đề xuất & kịch bản →
                  </Link>
                  <Link
                    className="button button-secondary"
                    href={`/contract?bookingId=${booking.bookingId}`}
                  >
                    Hợp đồng
                  </Link>
                  {booking.accessLevel === 'FULL' ? (
                    <>
                      <Link
                        className="button button-secondary"
                        href={`/guests?bookingId=${booking.bookingId}`}
                      >
                        Khách mời
                      </Link>
                      <Link
                        className="button button-secondary"
                        href={`/invitations?bookingId=${booking.bookingId}`}
                      >
                        Thiệp cưới
                      </Link>
                    </>
                  ) : null}
                  <Link
                    className="button button-secondary"
                    href={`/billing?bookingId=${booking.bookingId}`}
                  >
                    Công nợ
                  </Link>
                </div>
              </div>
            </div>
            <div className="overview-next">
              <h3>Cùng chuẩn bị bước tiếp theo</h3>
              <ul>
                <li>
                  <strong>Đề xuất tiệc</strong>
                  <span>Đã mở cho hai bạn</span>
                </li>
                <li>
                  <strong>Kịch bản</strong>
                  <span>
                    {booking.hasTimeline
                      ? 'Đã có bản để cùng xem lại'
                      : 'Đang chờ kịch bản đầu tiên'}
                  </span>
                </li>
                <li>
                  <strong>Nhà hàng duyệt</strong>
                  <span>
                    {booking.managerApproved
                      ? 'Đã duyệt phiên bản hiện tại'
                      : 'Chưa duyệt phiên bản hiện tại'}
                  </span>
                </li>
                <li>
                  <strong>Hai bạn duyệt</strong>
                  <span>
                    {booking.coupleApproved
                      ? 'Đã duyệt phiên bản hiện tại'
                      : 'Cần xem lại và xác nhận'}
                  </span>
                </li>
              </ul>
              <p className="public-muted">
                {booking.phase === 'CANCELLED' || booking.phase === 'COMPLETED'
                  ? 'Hồ sơ được giữ lại để bạn xem lịch sử.'
                  : booking.hasTimeline && !booking.coupleApproved
                    ? 'Mở kịch bản để xem lại các mốc và gửi phê duyệt.'
                    : 'Trao đổi với nhà hàng khi cần điều chỉnh kế hoạch.'}
              </p>
            </div>
          </article>
        ))}
        {page?.nextCursor ? (
          <button disabled={pending} onClick={() => void more()}>
            Xem thêm hồ sơ
          </button>
        ) : null}
      </section>
    </WorkspaceShell>
  );
}
