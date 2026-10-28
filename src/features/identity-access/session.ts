import { ApiClientError } from '../../lib/api/client';
import { sharedCoupleRealtime } from '../realtime/realtime-client';
import {
  type IdentityApi,
  type SessionCredential,
  type WebSessionSnapshot,
  anonymousSnapshot,
} from './session-types';
import {
  COUPLE_AUTH_CHANNEL,
  COUPLE_REFRESH_LOCK,
  clearCachedCoupleToken,
  isCoupleTokenFresh,
  readCachedCoupleToken,
  saveCachedCoupleToken,
} from './session-token-cache';

export * from './session-types';
export { createIdentityApi } from './identity-api';

export class WebIdentitySession {
  private accessToken: string | null = null;
  private authGeneration = 0;
  private restoreOperation: Promise<WebSessionSnapshot> | null = null;
  /** true khi backend đã từ chối cookie refresh (401): `restore()` không thử lại cho đến khi đăng nhập. */
  private refreshRejected = false;
  private state: WebSessionSnapshot = anonymousSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly api: IdentityApi) {
    sharedCoupleRealtime.setSessionRevokedHandler(() => {
      this.refreshRejected = true;
      this.clear();
    });
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(COUPLE_AUTH_CHANNEL);
        channel.onmessage = (event: MessageEvent<unknown>) => {
          const data = event.data;
          if (
            data !== null &&
            typeof data === 'object' &&
            'type' in data &&
            data.type === 'COUPLE_TOKEN_REFRESHED' &&
            'token' in data &&
            typeof data.token === 'string' &&
            'expiresAt' in data &&
            typeof data.expiresAt === 'string'
          ) {
            if (this.refreshRejected) return;
            this.accessToken = data.token;
            this.scheduleProactiveRefresh(data.expiresAt);
            if (this.state.status === 'authenticated') sharedCoupleRealtime.connect(data.token);
          }
        };
      } catch {
        // BroadcastChannel might fail in sandboxed iframes
      }
    }
    sharedCoupleRealtime.setTokenRefreshHandler(async () => {
      return await this.renewAccessToken();
    });
  }

  snapshot(): WebSessionSnapshot {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateSnapshot(next: WebSessionSnapshot): void {
    if (this.state === next) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  discardRevokedSession(): void {
    this.clear();
  }

  async login(email: string, password: string): Promise<WebSessionSnapshot> {
    return this.finishSignIn(await this.api.createSession(email, password));
  }

  async acceptInvitation(token: string, password: string): Promise<WebSessionSnapshot> {
    return this.finishSignIn(await this.api.acceptInvitation(token, password));
  }

  /**
   * Khôi phục phiên từ cookie refresh — chỉ gọi mạng khi thật sự cần.
   *
   * Nhiều trang/khung cùng gọi `restore()` khi mở; trước đây mỗi lần đều refresh + `auth/me`
   * dù phiên còn hạn (≈12 refresh / 9 phút). Nay: đã đăng nhập thì trả ngay trạng thái hiện có
   * (token hết hạn do `authorize` và hẹn giờ làm mới lo); cookie đã bị backend từ chối (401) thì
   * nhớ là chưa đăng nhập đến khi đăng nhập lại. Lỗi mạng không được nhớ để lần sau thử lại.
   */
  restore(): Promise<WebSessionSnapshot> {
    if (this.state.status === 'authenticated' && this.accessToken !== null) {
      return Promise.resolve(this.state);
    }
    if (this.refreshRejected) return Promise.resolve(this.state);
    this.restoreOperation ??= this.restoreFromCookie().finally(() => {
      this.restoreOperation = null;
    });
    return this.restoreOperation;
  }

  async logout(): Promise<void> {
    const token = this.accessToken;
    try {
      if (token !== null) await this.api.logout(token);
    } finally {
      this.clear();
      // Đăng xuất đã thu hồi cookie refresh: không cần thử khôi phục lại.
      this.refreshRejected = true;
    }
  }

  /**
   * Chạy một lệnh gọi API cần đăng nhập.
   *
   * Access token chỉ sống 10 phút. Nếu backend trả 401 (token hết hạn), ta thử làm mới
   * phiên đúng một lần bằng cookie refresh HttpOnly rồi chạy lại lệnh. Trước đây lỗi 401
   * xoá phiên ngay, khiến người dùng bị đăng xuất sau mỗi 10 phút dù cookie vẫn còn hạn.
   * Lệnh ghi được chạy lại an toàn vì dùng cùng Idempotency-Key (backend không tạo bản ghi trùng).
   */
  async authorize<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
    if (this.accessToken === null) throw new Error('Authentication is required.');

    try {
      return await operation(this.accessToken);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        const renewed = await this.renewAccessToken();
        if (renewed === null) throw error;
        try {
          return await operation(renewed);
        } catch (retryError) {
          this.handleDenial(retryError);
          throw retryError;
        }
      }
      this.handleDenial(error);
      throw error;
    }
  }

  // Nhiều lệnh cùng gặp 401 sẽ dùng chung một lần refresh (cookie refresh bị xoay vòng,
  // gọi song song có thể làm backend thu hồi phiên).
  private renewOperation: Promise<string | null> | null = null;
  private proactiveTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleProactiveRefresh(expiresAtStr: string): void {
    if (typeof window === 'undefined') return;
    if (this.proactiveTimer) {
      clearTimeout(this.proactiveTimer);
      this.proactiveTimer = null;
    }
    const expiry = new Date(expiresAtStr).getTime();
    if (isNaN(expiry)) return;
    const delay = Math.max(15_000, expiry - Date.now() - 60_000);
    this.proactiveTimer = setTimeout(() => {
      void this.renewAccessToken();
    }, delay);
  }

  private async renewAccessToken(): Promise<string | null> {
    if (this.refreshRejected) return null;
    if (typeof window === 'undefined') return null;

    if (this.renewOperation !== null) {
      return this.renewOperation;
    }

    const generation = this.authGeneration;
    this.renewOperation = (async () => {
      try {
        if (typeof navigator !== 'undefined' && 'locks' in navigator) {
          return await navigator.locks.request(COUPLE_REFRESH_LOCK, async () => {
            if (generation !== this.authGeneration) return null;
            const cached = readCachedCoupleToken();
            if (cached && isCoupleTokenFresh(cached.expiresAt)) {
              this.accessToken = cached.token;
              this.scheduleProactiveRefresh(cached.expiresAt);
              sharedCoupleRealtime.updateToken(cached.token);
              return cached.token;
            }
            return await this.performSingleRefresh();
          });
        }
        const cached = readCachedCoupleToken();
        if (cached && isCoupleTokenFresh(cached.expiresAt)) {
          this.accessToken = cached.token;
          this.scheduleProactiveRefresh(cached.expiresAt);
          sharedCoupleRealtime.updateToken(cached.token);
          return cached.token;
        }
        return await this.performSingleRefresh();
      } finally {
        this.renewOperation = null;
      }
    })();

    return this.renewOperation;
  }

  private async performSingleRefresh(): Promise<string | null> {
    const generation = this.authGeneration;
    try {
      const credential = await this.api.refreshSession();
      if (generation !== this.authGeneration) return null;
      this.accessToken = credential.accessToken;
      saveCachedCoupleToken(credential.accessToken, credential.accessExpiresAt);
      this.scheduleProactiveRefresh(credential.accessExpiresAt);
      void sharedCoupleRealtime.connect(credential.accessToken);
      return credential.accessToken;
    } catch (error) {
      if (generation !== this.authGeneration) return null;
      if (error instanceof ApiClientError && error.status === 401) {
        this.clear();
        this.refreshRejected = true;
      }
      return null;
    }
  }

  private handleDenial(error: unknown): void {
    if (error instanceof ApiClientError && error.status === 401) {
      this.clear();
    } else if (
      this.state.status === 'authenticated' &&
      error instanceof ApiClientError &&
      (error.status === 403 || error.status === 404)
    ) {
      this.updateSnapshot({
        ...this.state,
        denial: error.status === 403 ? 'forbidden' : 'not-found',
      });
    }
  }

  private async restoreFromCookie(): Promise<WebSessionSnapshot> {
    const generation = this.authGeneration;
    let refreshed: SessionCredential;
    try {
      refreshed = await this.api.refreshSession();
      if (generation !== this.authGeneration) return this.state;
    } catch (error) {
      if (generation !== this.authGeneration) return this.state;
      this.clear();
      if (error instanceof ApiClientError && error.status === 401) this.refreshRejected = true;
      return this.state;
    }
    try {
      return await this.finishSignIn(refreshed);
    } catch {
      return this.state;
    }
  }

  private async finishSignIn(credential: SessionCredential): Promise<WebSessionSnapshot> {
    const generation = this.authGeneration;
    this.refreshRejected = false;
    this.accessToken = credential.accessToken;
    saveCachedCoupleToken(credential.accessToken, credential.accessExpiresAt);
    this.scheduleProactiveRefresh(credential.accessExpiresAt);
    try {
      const actor = await this.api.getCurrentUser(credential.accessToken);
      if (generation !== this.authGeneration) return this.state;
      this.updateSnapshot({
        status: 'authenticated',
        access: actor.roles.includes('COUPLE') ? 'full' : 'restricted',
        actor,
        denial: null,
      });
      void sharedCoupleRealtime.connect(credential.accessToken);
      return this.state;
    } catch (error) {
      if (generation === this.authGeneration) this.clear();
      throw error;
    }
  }

  private clear(): void {
    this.authGeneration++;
    if (this.proactiveTimer) {
      clearTimeout(this.proactiveTimer);
      this.proactiveTimer = null;
    }
    this.accessToken = null;
    clearCachedCoupleToken();
    sharedCoupleRealtime.disconnect();
    this.updateSnapshot(anonymousSnapshot);
  }
}
