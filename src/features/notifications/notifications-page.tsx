'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { EmptyPanel, ErrorPanel } from '../couple-workspace/couple-page';
import { formatDateTime, useCommand } from '../couple-workspace/use-couple-workspace';
import { WorkspaceShell } from '../couple-workspace/workspace-shell';
import { browserSession } from '../identity-access/browser-session';
import {
  notificationApi,
  notificationHref,
  type InboxItem,
  type Preferences,
} from './notification-api';
import { Skeleton } from '../../design-system/skeleton';
import { useSpaceExtras } from '../couple-workspace/space-provider';

const vnDay = (iso: string) =>
  new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

/**
 * Nhóm thông báo theo ngày (giờ Việt Nam): "Hôm nay", "Hôm qua", rồi dd/mm/yyyy (prototype B6).
 * Danh sách từ backend đã xếp mới → cũ nên chỉ cần gom các phần tử liền kề cùng ngày.
 */
export function groupByDay(
  items: readonly InboxItem[],
  now = new Date(),
): { label: string; items: InboxItem[] }[] {
  const today = vnDay(now.toISOString());
  const yesterday = vnDay(new Date(now.getTime() - 86_400_000).toISOString());
  const groups: { key: string; label: string; items: InboxItem[] }[] = [];
  for (const item of items) {
    const key = vnDay(item.createdAt);
    let group = groups.at(-1);
    if (group?.key !== key) {
      const label =
        key === today
          ? 'Hôm nay'
          : key === yesterday
            ? 'Hôm qua'
            : key.split('-').reverse().join('/');
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.map(({ label, items: list }) => ({ label, items: list }));
}

export function NotificationsPage() {
  const [state, setState] = useState<'loading' | 'anonymous' | 'ready'>('loading');
  const [items, setItems] = useState<InboxItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const command = useCommand();
  const { refreshUnread } = useSpaceExtras();
  // Sau khi đánh dấu đã đọc: tải lại hộp thư VÀ số trên chuông/sidebar (lớp cache dùng chung).
  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    let active = true;
    void browserSession.restore().then(async (snapshot) => {
      if (!active) return;
      if (snapshot.status === 'anonymous') {
        setState('anonymous');
        return;
      }
      try {
        const [page, prefs] = await browserSession.authorize((token) =>
          Promise.all([notificationApi.inbox(token), notificationApi.preferences(token)]),
        );
        if (!active) return;
        setItems([...page.items]);
        setCursor(page.nextCursor);
        setPreferences(prefs);
        setLoadError(null);
        setState('ready');
      } catch (error) {
        if (active) setLoadError(describeApiError(error));
      }
    });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const unread = items.filter((item) => item.readAt === null).length;

  // Cập nhật tại chỗ thay vì tải lại hộp thư + cài đặt thông báo (2 API, cài đặt không liên quan):
  // backend đã trả đúng trạng thái mới của thông báo; chỉ cần làm mới số trên chuông.
  const markLocal = (read: Readonly<{ id: string; readAt: string; revision: number }>) => {
    setItems((current) =>
      current.map((item) =>
        item.id === read.id ? { ...item, readAt: read.readAt, revision: read.revision } : item,
      ),
    );
    refreshUnread();
  };
  const markAllLocal = (throughCreatedAt: string) => {
    setItems((current) =>
      current.map((item) =>
        item.readAt === null && item.createdAt <= throughCreatedAt
          ? { ...item, readAt: throughCreatedAt }
          : item,
      ),
    );
    refreshUnread();
  };

  return (
    <WorkspaceShell active="notifications">
      <div className="cw-page">
        <header className="cw-heading">
          <p className="eyebrow">Cập nhật</p>
          <h1>Thông báo</h1>
        </header>
        {state === 'loading' && !loadError ? <Skeleton label="Đang tải thông báo…" /> : null}
        {state === 'anonymous' ? (
          <EmptyPanel title="Cần đăng nhập">
            <Link className="button" href="/dang-nhap">
              Đăng nhập
            </Link>
          </EmptyPanel>
        ) : null}
        {loadError ? <ErrorPanel error={loadError} onRetry={reload} /> : null}
        {state === 'ready' ? (
          <>
            <section className="cw-card">
              <div className="cw-card-header">
                <h2>Hộp thư ({unread} chưa đọc)</h2>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={command.pending || unread === 0}
                  onClick={() => {
                    const through = new Date().toISOString();
                    void command
                      .run(
                        (token, key) => notificationApi.markAllRead(token, key, through),
                        'Đã đánh dấu tất cả là đã đọc.',
                      )
                      .then((result) => result && markAllLocal(through));
                  }}
                >
                  Đánh dấu tất cả đã đọc
                </button>
              </div>
              {items.length === 0 ? (
                <p className="cw-note">Chưa có thông báo nào.</p>
              ) : (
                groupByDay(items).map((group) => (
                  <div key={group.label} className="hy-notif-group">
                    <h3>{group.label}</h3>
                    <ul className="cw-list">
                      {group.items.map((item) => {
                        const href = notificationHref(item);
                        return (
                          <li
                            key={item.id}
                            style={{
                              borderLeft: item.readAt ? undefined : '3px solid var(--champagne)',
                              paddingLeft: 8,
                            }}
                          >
                            <strong>{item.title}</strong>
                            <p style={{ margin: '4px 0' }}>{item.message}</p>
                            <small className="muted">{formatDateTime(item.createdAt)}</small>
                            <div className="cw-actions">
                              {href ? (
                                <Link
                                  className="cw-text-button"
                                  href={href}
                                  onClick={() => {
                                    if (item.readAt === null)
                                      void command
                                        .run((token, key) =>
                                          notificationApi.markRead(
                                            token,
                                            key,
                                            item.id,
                                            item.revision,
                                          ),
                                        )
                                        .then((result) => result && markLocal(result));
                                  }}
                                >
                                  Mở
                                </Link>
                              ) : null}
                              {item.readAt === null ? (
                                <button
                                  className="cw-text-button"
                                  type="button"
                                  disabled={command.pending}
                                  onClick={() =>
                                    void command
                                      .run((token, key) =>
                                        notificationApi.markRead(
                                          token,
                                          key,
                                          item.id,
                                          item.revision,
                                        ),
                                      )
                                      .then((result) => result && markLocal(result))
                                  }
                                >
                                  Đánh dấu đã đọc
                                </button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
              {cursor ? (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={command.pending}
                  onClick={() =>
                    void command
                      .run((token) => notificationApi.inbox(token, cursor))
                      .then((page) => {
                        if (!page) return;
                        setItems((previous) => [...previous, ...page.items]);
                        setCursor(page.nextCursor);
                      })
                  }
                >
                  Xem thêm
                </button>
              ) : null}
            </section>
            {preferences ? (
              <section className="cw-card">
                <h2>Nhắc nhở</h2>
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.reminderEmail}
                    disabled={command.pending}
                    onChange={(event) =>
                      void command
                        .run(
                          (token, key) =>
                            notificationApi.updatePreferences(token, key, {
                              expectedRevision: preferences.revision,
                              reminderEmail: event.target.checked,
                            }),
                          'Đã lưu tuỳ chọn.',
                        )
                        .then((next) => next && setPreferences(next))
                    }
                  />{' '}
                  Nhận email nhắc trước ngày cưới và hạn chỉnh ảnh
                </label>
                <p className="cw-note">Thông báo đẩy (push) chỉ có trên ứng dụng Android.</p>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}
