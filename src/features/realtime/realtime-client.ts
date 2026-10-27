'use client';

import { io, type Socket } from 'socket.io-client';
import { readPublicEnv } from '../../lib/env';

export type RealtimeEventType =
  | 'booking.updated'
  | 'proposal.updated'
  | 'timeline.updated'
  | 'contract.updated'
  | 'deposit.received'
  | 'billing.updated'
  | 'guest.updated'
  | 'seating.updated'
  | 'print_order.updated'
  | 'catalog.updated'
  | 'notification.received'
  | 'session.revoked';

export interface RealtimeScope {
  readonly entityType: 'booking' | 'catalog' | 'account' | 'print_order' | 'session';
  readonly entityId?: string | undefined;
  readonly bookingId?: string | undefined;
  readonly revision?: number | undefined;
}

export interface RealtimeEvent<T = Record<string, unknown>> {
  readonly eventId: string;
  readonly schemaVersion: 1;
  readonly type: RealtimeEventType;
  readonly scope: RealtimeScope;
  readonly resources: readonly string[];
  readonly occurredAt: string;
  readonly payload?: T | undefined;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type TokenRefreshHandler = () => Promise<string | null>;

export function resolveRealtimeSocketUrl(): string {
  const env = readPublicEnv();
  if (env.NEXT_PUBLIC_REALTIME_URL) return new URL(env.NEXT_PUBLIC_REALTIME_URL).origin;
  const api = new URL(env.NEXT_PUBLIC_API_BASE_URL);
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname);
  if (
    process.env.NODE_ENV !== 'production' &&
    isLoopback &&
    (api.port === '3000' || api.port === '3002')
  ) {
    api.port = '3001';
  }
  if (typeof window !== 'undefined' && api.origin === window.location.origin && !isLoopback) {
    throw new Error(
      'Configure NEXT_PUBLIC_REALTIME_URL with the backend origin; the HTTP API proxy does not forward WebSocket connections.',
    );
  }
  return api.origin;
}

export class CoupleRealtimeManager {
  private socket: Socket | null = null;
  private token: string | null = null;
  private sessionRevokedHandler: (() => void) | null = null;

  setSessionRevokedHandler(handler: () => void): void {
    this.sessionRevokedHandler = handler;
  }
  private status: ConnectionStatus = 'disconnected';
  private tokenRefreshHandler: TokenRefreshHandler | null = null;
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();
  private readonly eventListeners = new Set<(event: RealtimeEvent) => void>();
  private readonly resyncListeners = new Set<() => void>();
  private readonly activeSubscriptions = new Map<string, number>();
  private readonly seenEventIds = new Set<string>();

  setTokenRefreshHandler(handler: TokenRefreshHandler | null): void {
    this.tokenRefreshHandler = handler;
  }

  connect(token: string): void {
    if (typeof window === 'undefined') return;

    const tokenChanged = this.token !== token;
    this.token = token;

    if (this.socket) {
      this.socket.auth = { token };
      if (this.socket.connected) {
        if (!tokenChanged) return;
        this.socket.disconnect().connect();
        return;
      }
      this.socket.connect();
      return;
    }

    let socketUrl: string;
    try {
      socketUrl = resolveRealtimeSocketUrl();
    } catch (error) {
      this.setStatus('disconnected');
      console.error('Realtime configuration is invalid.', error);
      return;
    }
    this.setStatus('connecting');

    const socket = io(socketUrl, {
      path: '/realtime',
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      randomizationFactor: 0.3,
      timeout: 10_000,
    });

    this.socket = socket;

    socket.on('connect', () => {
      this.setStatus('connected');
      // Resubscribe to active bookings with refcount > 0
      for (const bookingId of this.activeSubscriptions.keys()) {
        socket.emit('subscribe:booking', { bookingId });
      }
      // Authoritative resync on reconnect
      this.triggerResync();
    });

    socket.on('disconnect', (reason) => {
      this.setStatus('disconnected');
      if (reason === 'io server disconnect' && this.token !== null && this.tokenRefreshHandler) {
        void this.tokenRefreshHandler()
          .then((renewed) => {
            if (renewed && this.socket === socket && this.token !== null) {
              this.token = renewed;
              socket.auth = { token: renewed };
              socket.connect();
            }
          })
          .catch(() => {
            /* Session layer handles refresh denial. */
          });
      }
    });

    socket.on('connect_error', async (err: unknown) => {
      this.setStatus('disconnected');
      const errorMessage =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : '';
      const isAuthError =
        errorMessage.includes('AUTHENTICATION') ||
        errorMessage.includes('TOKEN') ||
        errorMessage.includes('REVOKED') ||
        errorMessage.includes('UNAUTHORIZED');

      if (isAuthError && this.tokenRefreshHandler) {
        try {
          const renewed = await this.tokenRefreshHandler();
          if (renewed && this.socket) {
            this.token = renewed;
            this.socket.auth = { token: renewed };
            if (this.socket.disconnected) {
              this.socket.connect();
            }
          }
        } catch {
          // Token refresh failure handled by session layer
        }
      }
    });

    socket.on('realtime:event', (event: unknown) => {
      if (!this.isValidEvent(event)) return;
      if (event.type === 'session.revoked') {
        this.disconnect();
        this.sessionRevokedHandler?.();
        return;
      }
      if (this.seenEventIds.has(event.eventId)) {
        return;
      }
      if (this.seenEventIds.size >= 10_000) {
        const iter = this.seenEventIds.values();
        for (let i = 0; i < 2_000; i++) {
          const next = iter.next();
          if (next.done) break;
          this.seenEventIds.delete(next.value);
        }
      }
      this.seenEventIds.add(event.eventId);

      for (const listener of this.eventListeners) {
        try {
          listener(event);
        } catch {
          // Prevent listener error from breaking socket event loop
        }
      }
    });

    socket.on('realtime:resync', () => {
      this.triggerResync();
    });

    socket.on('subscription:confirmed', () => {
      this.setStatus('connected');
    });

    socket.on('subscription:denied', () => {
      this.setStatus('connected');
    });
  }

  updateToken(token: string): void {
    if (this.socket) this.connect(token);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.setStatus('disconnected');
    this.activeSubscriptions.clear();
  }

  subscribeBooking(bookingId: string): () => void {
    const current = this.activeSubscriptions.get(bookingId) ?? 0;
    this.activeSubscriptions.set(bookingId, current + 1);

    if (current === 0 && this.socket?.connected) {
      this.socket.emit('subscribe:booking', { bookingId });
    }

    return () => {
      const remaining = (this.activeSubscriptions.get(bookingId) ?? 1) - 1;
      if (remaining <= 0) {
        this.activeSubscriptions.delete(bookingId);
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe:booking', { bookingId });
        }
      } else {
        this.activeSubscriptions.set(bookingId, remaining);
      }
    };
  }

  addEventListener(listener: (event: RealtimeEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  addResyncListener(listener: () => void): () => void {
    this.resyncListeners.add(listener);
    return () => {
      this.resyncListeners.delete(listener);
    };
  }

  addStatusListener(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch {
        // Ignore
      }
    }
  }

  private triggerResync(): void {
    for (const listener of this.resyncListeners) {
      try {
        listener();
      } catch {
        // Ignored
      }
    }
  }

  private isValidEvent(payload: unknown): payload is RealtimeEvent {
    if (!payload || typeof payload !== 'object') return false;
    const evt = payload as Record<string, unknown>;
    return (
      typeof evt.eventId === 'string' &&
      evt.schemaVersion === 1 &&
      typeof evt.type === 'string' &&
      typeof evt.occurredAt === 'string' &&
      typeof evt.scope === 'object' &&
      evt.scope !== null &&
      Array.isArray(evt.resources)
    );
  }
}

export const sharedCoupleRealtime = new CoupleRealtimeManager();
