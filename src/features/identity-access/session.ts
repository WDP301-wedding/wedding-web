import type { components } from '../../lib/api/generated/schema';
import { ApiClientError, createApiClient, type ApiClient } from '../../lib/api/client';
import { sharedCoupleRealtime } from '../realtime/realtime-client';

type Role = components['schemas']['AccountSummary']['roles'][number];

export type BootstrapCredential = Readonly<{
  kind: 'invitation' | 'reset';
  token: string;
}>;

export type CurrentActor = Readonly<{
  accountId: string;
  displayEmail: string;
  roles: readonly Role[];
  sessionId: string;
}>;

type SessionCredential = Readonly<{
  accessToken: string;
  accessExpiresAt: string;
  sessionId: string;
}>;

type IssuedSession = SessionCredential &
  Readonly<{
    account: Omit<CurrentActor, 'sessionId'>;
  }>;

export interface IdentityApi {
  acceptInvitation(this: void, token: string, password: string): Promise<IssuedSession>;
  createSession(this: void, email: string, password: string): Promise<IssuedSession>;
  getCurrentUser(this: void, accessToken: string): Promise<CurrentActor>;
  logout(this: void, accessToken: string): Promise<void>;
  refreshSession(this: void): Promise<SessionCredential>;
}

export type WebSessionSnapshot =
  | Readonly<{ status: 'anonymous'; denial: null }>
  | Readonly<{
      status: 'authenticated';
      access: 'restricted' | 'full';
      actor: CurrentActor;
      denial: 'forbidden' | 'not-found' | null;
    }>;

const anonymousSnapshot = { status: 'anonymous', denial: null } as const;
const invitationPattern = /^wii_[A-Za-z0-9_-]{43}$/u;
const resetPattern = /^wip_[A-Za-z0-9_-]{43}$/u;

export function consumeCredentialFragment(
  href: string,
  replaceHistory: (safePath: string) => void,
): BootstrapCredential | null {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const raw = url.hash.slice(1);
  const invitationToken =
    fragment.get('invitationToken') ?? (invitationPattern.test(raw) ? raw : null);
  const resetToken = fragment.get('resetToken') ?? (resetPattern.test(raw) ? raw : null);
  replaceHistory(`${url.pathname}${url.search}`);

  if (invitationToken !== null && invitationPattern.test(invitationToken)) {
    return { kind: 'invitation', token: invitationToken };
  }
  if (resetToken !== null && resetPattern.test(resetToken)) {
    return { kind: 'reset', token: resetToken };
  }
  return null;
}

const COUPLE_STORAGE_KEY = 'wedding_couple_token_meta';
const COUPLE_AUTH_CHANNEL = 'wedding_couple_auth_channel';
const COUPLE_REFRESH_LOCK = 'wedding_couple_refresh_lock';

interface CachedCoupleToken {
  token: string;
  expiresAt: string;
  savedAt: number;
}

function readCachedCoupleToken(): CachedCoupleToken | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(COUPLE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedCoupleToken;
  } catch {
    return null;
  }
}

function saveCachedCoupleToken(token: string, expiresAt: string): void {
  if (typeof window === 'undefined') return;
  try {
    const record: CachedCoupleToken = { token, expiresAt, savedAt: Date.now() };
    window.sessionStorage.setItem(COUPLE_STORAGE_KEY, JSON.stringify(record));
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(COUPLE_AUTH_CHANNEL);
      channel.postMessage({ type: 'COUPLE_TOKEN_REFRESHED', token, expiresAt });
      channel.close();
    }
  } catch {
    // Storage or BroadcastChannel may be restricted in private browsing mode
  }
}

function clearCachedCoupleToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(COUPLE_STORAGE_KEY);
  } catch {
    // Ignore storage clearing error in restricted contexts
  }
}

function isCoupleTokenFresh(expiresAtStr: string): boolean {
  const expiry = new Date(expiresAtStr).getTime();
  if (isNaN(expiry)) return false;
  return expiry > Date.now() + 30_000;
}

export class WebIdentitySession {
  private accessToken: string | null = null;
  private restoreOperation: Promise<WebSessionSnapshot> | null = null;
  /** true khi backend đã từ chối cookie refresh (401): `restore()` không thử lại cho đến khi đăng nhập. */
  private refreshRejected = false;
  private state: WebSessionSnapshot = anonymousSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly api: IdentityApi) {
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
            this.accessToken = data.token;
            this.scheduleProactiveRefresh(data.expiresAt);
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
    if (typeof window === 'undefined') return null;

    if (this.renewOperation !== null) {
      return this.renewOperation;
    }

    this.renewOperation = (async () => {
      try {
        if (typeof navigator !== 'undefined' && 'locks' in navigator) {
          return await navigator.locks.request(COUPLE_REFRESH_LOCK, async () => {
            const cached = readCachedCoupleToken();
            if (cached && isCoupleTokenFresh(cached.expiresAt)) {
              this.accessToken = cached.token;
              this.scheduleProactiveRefresh(cached.expiresAt);
              return cached.token;
            }
            return await this.performSingleRefresh();
          });
        }
        const cached = readCachedCoupleToken();
        if (cached && isCoupleTokenFresh(cached.expiresAt)) {
          this.accessToken = cached.token;
          this.scheduleProactiveRefresh(cached.expiresAt);
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
    try {
      const credential = await this.api.refreshSession();
      this.accessToken = credential.accessToken;
      saveCachedCoupleToken(credential.accessToken, credential.accessExpiresAt);
      this.scheduleProactiveRefresh(credential.accessExpiresAt);
      void sharedCoupleRealtime.connect(credential.accessToken);
      return credential.accessToken;
    } catch (error) {
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
    let refreshed: SessionCredential;
    try {
      refreshed = await this.api.refreshSession();
    } catch (error) {
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
    this.refreshRejected = false;
    this.accessToken = credential.accessToken;
    saveCachedCoupleToken(credential.accessToken, credential.accessExpiresAt);
    this.scheduleProactiveRefresh(credential.accessExpiresAt);
    try {
      const actor = await this.api.getCurrentUser(credential.accessToken);
      this.updateSnapshot({
        status: 'authenticated',
        access: actor.roles.includes('COUPLE') ? 'full' : 'restricted',
        actor,
        denial: null,
      });
      void sharedCoupleRealtime.connect(credential.accessToken);
      return this.state;
    } catch (error) {
      this.clear();
      throw error;
    }
  }

  private clear(): void {
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

function requireData<T>(data: T | undefined): T {
  if (data === undefined) throw new Error('The identity response did not include data.');
  return data;
}

export function createIdentityApi(client?: ApiClient): IdentityApi {
  let resolvedClient = client;
  const api = () => (resolvedClient ??= createApiClient());

  return {
    async acceptInvitation(token, password) {
      const { data } = await api().POST('/workspace-invitation-acceptances', {
        body: { invitationToken: token, password },
        credentials: 'include',
      });
      return normalizeIssuedSession(requireData(data).data);
    },
    async createSession(email, password) {
      const { data } = await api().POST('/auth/web-sessions', {
        body: { email, password },
        credentials: 'include',
      });
      return normalizeIssuedSession(requireData(data).data);
    },
    async getCurrentUser(accessToken) {
      const { data } = await api().GET('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return normalizeActor(requireData(data).data);
    },
    async logout(accessToken) {
      await api().DELETE('/auth/sessions/current', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    async refreshSession() {
      const { data } = await api().POST('/auth/web-session-refreshes', {
        body: {},
        credentials: 'include',
        params: { cookie: { '__Host-wedding-refresh': '' } },
      });
      return requireData(data).data;
    },
  };
}

function normalizeActor(
  actor: Readonly<{
    accountId: string;
    displayEmail: string;
    roles: ArrayLike<Role>;
    sessionId: string;
  }>,
): CurrentActor {
  return { ...actor, roles: Array.from(actor.roles) };
}

function normalizeIssuedSession(
  session: Readonly<{
    accessExpiresAt: string;
    accessToken: string;
    account: Readonly<{ accountId: string; displayEmail: string; roles: ArrayLike<Role> }>;
    sessionId: string;
  }>,
): IssuedSession {
  return {
    accessExpiresAt: session.accessExpiresAt,
    accessToken: session.accessToken,
    account: {
      ...session.account,
      roles: Array.from(session.account.roles),
    },
    sessionId: session.sessionId,
  };
}
