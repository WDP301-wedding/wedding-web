import type { CurrentActor } from './session-types';

export const COUPLE_STORAGE_KEY = 'wedding_couple_token_meta';
export const COUPLE_SESSION_KEY = 'wedding_couple_session';
export const COUPLE_AUTH_CHANNEL = 'wedding_couple_auth_channel';
export const COUPLE_REFRESH_LOCK = 'wedding_couple_refresh_lock';

export interface CachedCoupleToken {
  token: string;
  expiresAt: string;
  savedAt: number;
}

export interface PersistedCoupleSession {
  accessToken: string;
  accessExpiresAt: string;
  sessionId: string;
  actor: CurrentActor;
  access: 'restricted' | 'full';
  savedAt: number;
}

export function readPersistedCoupleSession(): PersistedCoupleSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      window.localStorage.getItem(COUPLE_SESSION_KEY) ??
      window.sessionStorage.getItem(COUPLE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedCoupleSession;
  } catch {
    return null;
  }
}

export function savePersistedCoupleSession(
  session: Omit<PersistedCoupleSession, 'savedAt'>,
  options: { broadcast?: boolean } = {},
): void {
  if (typeof window === 'undefined') return;
  const record: PersistedCoupleSession = { ...session, savedAt: Date.now() };
  const serialized = JSON.stringify(record);
  try {
    window.localStorage.setItem(COUPLE_SESSION_KEY, serialized);
  } catch {
    // Storage may be restricted in private browsing mode
  }
  try {
    window.sessionStorage.setItem(COUPLE_SESSION_KEY, serialized);
  } catch {
    // Storage may be restricted in private browsing mode
  }
  saveCachedCoupleToken(session.accessToken, session.accessExpiresAt, options);
}

export function clearPersistedCoupleSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(COUPLE_SESSION_KEY);
  } catch {
    // Ignore storage clearing error in restricted contexts
  }
  try {
    window.sessionStorage.removeItem(COUPLE_SESSION_KEY);
  } catch {
    // Ignore storage clearing error in restricted contexts
  }
  clearCachedCoupleToken();
}

export function readCachedCoupleToken(): CachedCoupleToken | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      window.sessionStorage.getItem(COUPLE_STORAGE_KEY) ??
      window.localStorage.getItem(COUPLE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedCoupleToken;
  } catch {
    return null;
  }
}

export function saveCachedCoupleToken(
  token: string,
  expiresAt: string,
  { broadcast = true }: { broadcast?: boolean } = {},
): void {
  if (typeof window === 'undefined') return;
  try {
    const record: CachedCoupleToken = { token, expiresAt, savedAt: Date.now() };
    const serialized = JSON.stringify(record);
    try {
      window.sessionStorage.setItem(COUPLE_STORAGE_KEY, serialized);
    } catch {
      // Storage restricted
    }
    try {
      window.localStorage.setItem(COUPLE_STORAGE_KEY, serialized);
    } catch {
      // Storage restricted
    }
    if (broadcast && typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(COUPLE_AUTH_CHANNEL);
      channel.postMessage({ type: 'COUPLE_TOKEN_REFRESHED', token, expiresAt });
      channel.close();
    }
  } catch {
    // Storage or BroadcastChannel may be restricted in private browsing mode
  }
}

export function clearCachedCoupleToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(COUPLE_STORAGE_KEY);
  } catch {
    // Ignore storage clearing error in restricted contexts
  }
  try {
    window.localStorage.removeItem(COUPLE_STORAGE_KEY);
  } catch {
    // Ignore storage clearing error in restricted contexts
  }
}

export function isCoupleTokenFresh(expiresAtStr: string): boolean {
  const expiry = new Date(expiresAtStr).getTime();
  if (isNaN(expiry)) return false;
  return expiry > Date.now() + 30_000;
}
