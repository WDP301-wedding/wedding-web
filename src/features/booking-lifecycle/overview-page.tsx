'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { JourneyStepper, journeyIndex, journeySteps } from '../../design-system/journey-stepper';
import { WorkspaceShell } from '../couple-workspace/workspace-shell';
import { browserSession } from '../identity-access/identity-page';
import { createExperienceGateway, type Overview } from '../identity-access/experience-api';
import type { WebSessionSnapshot } from '../identity-access/session';
import { ApiClientError } from '../../lib/api/client';
import { Skeleton } from '../../design-system/skeleton';
import { useRealtimeSubscription } from '../realtime/use-realtime';

const gateway = createExperienceGateway();

/** Số ngày còn lại tới ngày cưới, tính theo lịch Việt Nam (không phụ thuộc múi giờ máy). */
function daysUntil(eventDate: string): number {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const diff = Date.parse(`${eventDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(diff / 86_400_000);
}
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

  const activeBookingId = page?.data[0]?.bookingId;
  useRealtimeSubscription({
    bookingId: activeBookingId,
    onEvent: (event) => {
      if (!activeBookingId || !event.scope.bookingId || event.scope.bookingId === activeBookingId) {
        setRetry((value) => value + 1);
      }
    },
    onResync: () => {
      setRetry((value) => value + 1);
    },
  });
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
            <h1>Tổng quan</h1>
          </div>
          <Link href="/ho-so">Hồ sơ & bảo mật →</Link>
        </div>
        {session === null && !error ? <Skeleton label="Đang mở không gian riêng…" /> : null}
        {session?.status === 'anonymous' ? (
          <div className="overview-empty">
            <h2>Tiếp tục hành trình của bạn</h2>
            <p>Đăng nhập bằng tài khoản đã được nhà hàng mời để mở hồ sơ tư vấn.</p>
            <Link className="public-button" href="/dang-nhap">
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
          <Skeleton label="Đang tải hồ sơ của bạn…" />
        ) : null}
        {page?.data.length === 0 ? (
          <div className="overview-empty">
            <h2>Hồ sơ đang được chuẩn bị</h2>
            <p>Nhà hàng sẽ mở đề xuất sau khi thống nhất các lựa chọn trong buổi tư vấn.</p>
            <Link href="/tu-van">Liên hệ nhà hàng →</Link>
          </div>
        ) : null}
        {page?.data.map((booking) => {
          const days = daysUntil(booking.eventDate);
          const step = journeyIndex(booking.phase, booking.eventDate);
          return (
            <article key={booking.bookingId} className="overview-booking hy-overview">
              <div className="hy-overview-top">
                <div className="hy-countdown">
                  <span className="hy-countdown-phase">{phases[booking.phase]}</span>
                  {days > 0 && booking.phase !== 'CANCELLED' ? (
                    <p className="hy-countdown-days">
                      <small>Còn đến ngày cưới</small>
                      <strong>{days}</strong> ngày
                    </p>
                  ) : null}
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
                </div>
                <nav className="hy-overview-links" aria-label="Lối tắt của tiệc">
                  <Link
                    className="public-button"
                    href={`/khong-gian/thoa-thuan/kich-ban?bookingId=${booking.bookingId}`}
                  >
                    Mở đề xuất & kịch bản →
                  </Link>
                  <Link
                    className="button button-secondary"
                    href={`/khong-gian/thoa-thuan/hop-dong?bookingId=${booking.bookingId}`}
                  >
                    Hợp đồng
                  </Link>
                  {booking.accessLevel === 'FULL' ? (
                    <>
                      <Link
                        className="button button-secondary"
                        href={`/khong-gian/chuan-bi/khach?bookingId=${booking.bookingId}`}
                      >
                        Khách mời
                      </Link>
                      <Link
                        className="button button-secondary"
                        href={`/khong-gian/chuan-bi/thiep?bookingId=${booking.bookingId}`}
                      >
                        Thiệp cưới
                      </Link>
                    </>
                  ) : null}
                  <Link
                    className="button button-secondary"
                    href={`/khong-gian/thanh-toan?bookingId=${booking.bookingId}`}
                  >
                    Công nợ
                  </Link>
                </nav>
              </div>
              <section className="hy-journey-card" aria-label="Hành trình cưới">
                <div className="hy-journey-head">
                  <h3>Hành trình cưới</h3>
                  <span>
                    {step < 0 ? 'Tiệc đã huỷ' : `Bước ${step + 1}/6 · ${journeySteps[step]}`}
                  </span>
                </div>
                <JourneyStepper current={step} />
              </section>
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
          );
        })}
        {page?.nextCursor ? (
          <button disabled={pending} onClick={() => void more()}>
            Xem thêm hồ sơ
          </button>
        ) : null}
      </section>
    </WorkspaceShell>
  );
}
