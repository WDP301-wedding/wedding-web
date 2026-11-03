import Link from 'next/link';
import { cn } from 'cn';
import { InlineError } from '../../design-system/inline-error';
import { routes, withBooking } from '../../routes';
import { notificationHref } from '../notifications/notification-api';
import { panel, panelTitle } from './space-classes';
import type { useLatestNotifications } from './use-overview';
import { formatDateTime } from './use-couple-workspace';

export function OverviewNotifications({
  inbox,
  bookingId,
}: Readonly<{ inbox: ReturnType<typeof useLatestNotifications>; bookingId: string }>) {
  return (
    <section className={cn(panel, 'flex flex-col gap-4')} aria-labelledby="latest-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="latest-title" className={panelTitle}>
            Thông báo mới
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Những cập nhật gần đây cho hồ sơ của bạn.
          </p>
        </div>
        <Link
          className="shrink-0 rounded text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={withBooking(routes.notifications, bookingId)}
        >
          Mở hộp thông báo
        </Link>
      </header>
      <InlineError error={inbox.latestError} onRetry={inbox.retry} />
      {inbox.latest === null && inbox.latestError ? null : inbox.latest === null ? (
        <p className="py-3 text-sm text-muted-foreground" role="status">
          Đang tải thông báo…
        </p>
      ) : inbox.latest.length === 0 ? (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          Chưa có thông báo nào. Các cập nhật mới sẽ xuất hiện tại đây.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {inbox.latest.map((item) => {
            const href = notificationHref(item);
            const content = (
              <>
                <span
                  className={cn(
                    'mt-1.5 size-1.5 shrink-0 rounded-full',
                    item.readAt ? 'bg-transparent' : 'bg-primary',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  {!item.readAt ? <span className="sr-only">Chưa đọc: </span> : null}
                  <p
                    className={cn(
                      'break-words text-sm leading-relaxed',
                      item.readAt ? 'text-foreground' : 'font-semibold text-foreground',
                    )}
                  >
                    {item.title}
                  </p>
                  <time
                    className="mt-0.5 block text-xs text-muted-foreground tabular-nums"
                    dateTime={item.createdAt}
                  >
                    {formatDateTime(item.createdAt)}
                  </time>
                </div>
                {href ? (
                  <span
                    className="shrink-0 self-center text-xs font-semibold text-primary"
                    aria-hidden="true"
                  >
                    Xem chi tiết
                  </span>
                ) : null}
              </>
            );
            const className = 'flex min-w-0 items-start gap-3 rounded-lg px-3 py-3';
            return (
              <li key={item.id}>
                {href ? (
                  <Link
                    href={href}
                    className={cn(
                      className,
                      '-mx-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={cn(className, '-mx-3')}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
