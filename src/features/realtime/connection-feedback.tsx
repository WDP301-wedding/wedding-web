'use client';
import { useState, useSyncExternalStore } from 'react';
import { buttonVariants } from '../../components/ui/button';
import { InlineError } from '../../design-system/inline-error';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { browserSession } from '../identity-access/browser-session';
import { sharedCoupleRealtime, type ConnectionStatus } from './realtime-client';

const subscribe = (changed: () => void) => sharedCoupleRealtime.addStatusListener(() => changed());
const snapshot = () => sharedCoupleRealtime.getStatus();
const serverSnapshot = (): ConnectionStatus => 'connecting';
const subscribeOnline = (changed: () => void) => {
  window.addEventListener('online', changed);
  window.addEventListener('offline', changed);
  return () => {
    window.removeEventListener('online', changed);
    window.removeEventListener('offline', changed);
  };
};
const onlineSnapshot = () => navigator.onLine;
const serverOnline = () => true;

export function ConnectionFeedback() {
  const status = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const online = useSyncExternalStore(subscribeOnline, onlineSnapshot, serverOnline);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const retry = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await browserSession.authorize((token) => {
        sharedCoupleRealtime.retryConnection(token);
        return Promise.resolve();
      });
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setPending(false);
    }
  };
  if (!online || status === 'connected') return null;
  return (
    <aside
      className="mx-auto my-4 flex max-w-[1180px] flex-wrap items-center gap-3 rounded-lg bg-hy-warning-bg px-4 py-3 text-sm text-hy-warning"
      aria-label="Trạng thái cập nhật dữ liệu"
    >
      <p role="status">
        {status === 'connecting'
          ? 'Đang kết nối cập nhật trực tiếp…'
          : 'Cập nhật trực tiếp đang gián đoạn. Dữ liệu đang xem có thể chưa mới nhất.'}
      </p>
      <button
        type="button"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
        disabled={pending}
        onClick={() => void retry()}
      >
        {pending ? 'Đang kết nối…' : 'Thử kết nối lại'}
      </button>
      <InlineError error={error} />
    </aside>
  );
}
