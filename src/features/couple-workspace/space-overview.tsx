'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { JourneyStepper, journeyIndex, journeySteps } from '../../design-system/journey-stepper';
import { routes, withBooking } from '../../routes';
import { browserSession } from '../identity-access/browser-session';
import {
  notificationApi,
  notificationHref,
  type InboxItem,
} from '../notifications/notification-api';
import { SpaceGate } from './space-gate';
import { menuLines, ProposalMenus } from './proposal-menus';
import { useSpaceExtras } from './space-provider';
import {
  formatDateTime,
  formatEventDate,
  formatVnd,
  shiftLabel,
  useCoupleWorkspace,
  type BookingSummary,
  type Proposal,
} from './use-couple-workspace';

/** Số ngày còn lại tới ngày cưới, tính theo lịch Việt Nam (không phụ thuộc múi giờ máy). */
export function daysUntil(eventDate: string, now = new Date()): number {
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const diff = Date.parse(`${eventDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(diff / 86_400_000);
}

export type Task = Readonly<{
  title: string;
  detail: string;
  href: string | null;
  action: string;
  status: 'wait' | 'info' | 'done';
}>;

/**
 * "Việc cần làm ngay" suy ra từ phase + cờ duyệt do backend trả về. Đặt thành hàm thuần
 * (không gọi API, không đọc state) để dễ test và để mọi logic nghiệp vụ nằm một chỗ.
 */
export function nextTasks(proposal: Proposal, summary: BookingSummary | undefined): Task[] {
  const id = proposal.bookingId;
  const timeline = proposal.effectiveTimeline;
  switch (proposal.phase) {
    case 'DRAFT': {
      if (!summary?.hasTimeline && !timeline)
        return [
          {
            title: 'Chờ nhà hàng gửi kịch bản',
            detail: 'Quản lý tiệc đang soạn kịch bản đầu tiên cho tiệc của hai bạn.',
            href: withBooking(routes.script, id),
            action: 'Xem đề xuất',
            status: 'info',
          },
        ];
      const version = timeline ? ` phiên bản ${timeline.revisionNumber}` : '';
      if (summary && !summary.coupleApproved)
        return [
          {
            title: `Duyệt kịch bản${version}`,
            detail: summary.managerApproved
              ? 'Nhà hàng đã duyệt. Hai bạn xem lại các mốc rồi xác nhận.'
              : 'Xem lại các mốc, có thể đề xuất chỉnh sửa trước khi duyệt.',
            href: withBooking(routes.script, id),
            action: 'Xem kịch bản',
            status: 'wait',
          },
          {
            title: 'Điền tên cô dâu chú rể',
            detail: 'Tên dùng cho hợp đồng và thiệp cưới.',
            href: withBooking(routes.names, id),
            action: 'Nhập tên',
            status: 'info',
          },
        ];
      return [
        {
          title: 'Chờ nhà hàng duyệt kịch bản',
          detail: 'Hai bạn đã duyệt. Khi nhà hàng duyệt, bước Hợp đồng sẽ mở.',
          href: withBooking(routes.script, id),
          action: 'Xem kịch bản',
          status: 'info',
        },
      ];
    }
    case 'AWAITING_DEPOSIT':
      return [
        {
          title: 'Duyệt hợp đồng',
          detail: 'Cần hai bên duyệt cùng một phiên bản trước khi đặt cọc.',
          href: withBooking(routes.contract, id),
          action: 'Xem hợp đồng',
          status: 'wait',
        },
        {
          title: `Đặt cọc ${formatVnd(proposal.proposal.depositAmountVnd)}`,
          detail: '30% tổng theo đề xuất, thanh toán qua VNPay.',
          href: withBooking(routes.payment, id),
          action: 'Đi tới Thanh toán',
          status: 'wait',
        },
      ];
    case 'CONFIRMED':
      return [
        {
          title: 'Số khách & nhóm khách',
          detail: 'Chốt số khách dự kiến và chia nhóm để xếp bàn.',
          href: withBooking(routes.guests, id),
          action: 'Mở danh sách khách',
          status: 'info',
        },
        {
          title: 'Sơ đồ bàn',
          detail: 'Chọn mẫu sơ đồ và xếp nhóm khách vào bàn.',
          href: withBooking(routes.seating, id),
          action: 'Xếp sơ đồ',
          status: 'info',
        },
        {
          title: 'Thiệp cưới',
          detail: 'Chọn mẫu, xuất bản thiệp online và đặt in.',
          href: withBooking(routes.card, id),
          action: 'Mở Studio thiệp',
          status: 'info',
        },
      ];
    case 'COMPLETED':
      return [
        {
          title: 'Xem quyết toán',
          detail: 'Chi phí phát sinh và hoá đơn cuối của tiệc.',
          href: withBooking(routes.settle, id),
          action: 'Mở quyết toán',
          status: 'done',
        },
      ];
    default:
      return [];
  }
}

export function SpaceOverview() {
  return (
    <SpaceGate label="Đang mở tổng quan…">
      <OverviewContent />
    </SpaceGate>
  );
}

function OverviewContent() {
  const { state, bookings, bookingId } = useCoupleWorkspace();
  const { restaurant } = useSpaceExtras();
  const [latest, setLatest] = useState<readonly InboxItem[] | null>(null);

  useEffect(() => {
    let active = true;
    browserSession
      .authorize((token) => notificationApi.inbox(token))
      .then((page) => active && setLatest(page.items.slice(0, 3)))
      .catch(() => active && setLatest([]));
    return () => {
      active = false;
    };
  }, []);

  if (state.status !== 'ready') return null;
  const proposal = state.proposal;
  const summary = bookings.find((booking) => booking.bookingId === bookingId);
  const step = journeyIndex(proposal.phase, proposal.eventDate);
  const days = daysUntil(proposal.eventDate);
  const tasks = nextTasks(proposal, summary);
  const { proposal: offer } = proposal;

  return (
    <div className="hy-overview2">
      <h1 className="visually-hidden">Tổng quan tiệc cưới</h1>
      {proposal.phase === 'CANCELLED' ? (
        <p className="hy-banner is-error" role="status">
          Tiệc đã huỷ. Hồ sơ được giữ lại để hai bạn xem lịch sử.
        </p>
      ) : null}
      <div className="hy-overview2-top">
        <section className="hy-countdown2" aria-label="Đếm ngược ngày cưới">
          {days > 0 && proposal.phase !== 'CANCELLED' ? (
            <>
              <p>Còn đến ngày cưới</p>
              <p className="hy-countdown2-days">
                <strong>{days}</strong> ngày
              </p>
            </>
          ) : (
            <p className="hy-countdown2-days">
              <strong>{days === 0 ? 'Hôm nay' : 'Đã diễn ra'}</strong>
            </p>
          )}
          <hr />
          <p>
            {formatEventDate(proposal.eventDate)} · {shiftLabel(offer.shift.code)}{' '}
            {offer.shift.startTime} – {offer.shift.endTime}
          </p>
          <p>
            {offer.hall.name} · {offer.tableCount} bàn · {proposal.planningHeadcount} khách dự kiến
          </p>
        </section>
        <section className="hy-money-card" aria-labelledby="money-title">
          <header>
            <h2 id="money-title">Tóm tắt tiền</h2>
            <Link href={withBooking(routes.payment, proposal.bookingId)}>Ví tiệc</Link>
          </header>
          <p className="hy-muted hy-small">Tổng theo đề xuất</p>
          <p className="hy-money-total">{formatVnd(offer.baseChargeVnd)}</p>
          <dl>
            <div>
              <dt>{menuLines(offer).length > 1 ? 'Thực đơn (nhiều gói)' : 'Thực đơn'}</dt>
              <dd>
                <ProposalMenus offer={offer} />
              </dd>
            </div>
            <div>
              <dt>Tiền cọc (30%)</dt>
              <dd>{formatVnd(offer.depositAmountVnd)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="hy-journey-card" aria-labelledby="journey-title">
        <div className="hy-journey-head">
          <h2 id="journey-title">Hành trình cưới</h2>
          <span>{step < 0 ? 'Tiệc đã huỷ' : `Bước ${step + 1}/6 · ${journeySteps[step]}`}</span>
        </div>
        <JourneyStepper current={step} />
      </section>

      {tasks.length > 0 ? (
        <section aria-labelledby="tasks-title">
          <h2 id="tasks-title" className="hy-section-title">
            Việc cần làm ngay
          </h2>
          <div className="hy-task-grid">
            {tasks.map((task) => (
              <article key={task.title} className={`hy-task is-${task.status}`}>
                {task.status === 'wait' ? (
                  <span className="hy-chip is-warning">Chờ bạn</span>
                ) : null}
                <h3>{task.title}</h3>
                <p>{task.detail}</p>
                {task.href ? (
                  <Link
                    className={task.status === 'wait' ? 'button' : 'button button-secondary'}
                    href={task.href}
                  >
                    {task.action}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="hy-overview2-bottom">
        <section className="hy-card" aria-labelledby="latest-title">
          <header className="hy-card-head">
            <h2 id="latest-title">Thông báo mới</h2>
            <Link href={withBooking(routes.notifications, proposal.bookingId)}>Xem tất cả</Link>
          </header>
          {latest === null ? (
            <p className="hy-muted" role="status">
              Đang tải thông báo…
            </p>
          ) : latest.length === 0 ? (
            <p className="hy-muted">Chưa có thông báo nào.</p>
          ) : (
            <ul className="hy-notice-list">
              {latest.map((item) => {
                const href = notificationHref(item);
                return (
                  <li key={item.id} className={item.readAt ? undefined : 'is-unread'}>
                    {href ? <Link href={href}>{item.title}</Link> : <span>{item.title}</span>}
                    <small>{formatDateTime(item.createdAt)}</small>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="hy-card hy-contact-card" aria-labelledby="contact-title">
          <h2 id="contact-title">Liên hệ nhà hàng</h2>
          <p>{restaurant?.displayName ?? 'Nhà hàng Hỷ Yến'}</p>
          <div className="hy-actions">
            {restaurant?.publicPhone ? (
              <a className="button" href={`tel:${restaurant.publicPhone.replace(/[^+\d]/gu, '')}`}>
                Gọi {restaurant.publicPhone}
              </a>
            ) : null}
            {restaurant?.publicEmail ? (
              <a className="button button-secondary" href={`mailto:${restaurant.publicEmail}`}>
                Email
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
