'use client';
import { describeApiError } from '../../lib/api/api-errors';
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { routes } from '../../routes';
import { PasswordResetOtpForm } from './password-reset-otp-form';
import { ApiClientError } from '../../lib/api/client';
import { browserSession } from './browser-session';
import {
  consumeCredentialFragment,
  type WebIdentitySession,
  type BootstrapCredential,
  type WebSessionSnapshot,
} from './session';
import { AuthForm, Field, PublicShell } from './identity-form-fields';
import { identityErrorMessage, readField, type IdentityView } from './identity-error-utils';

const browserCredential =
  typeof window === 'undefined'
    ? null
    : consumeCredentialFragment(window.location.href, (safePath) =>
        window.history.replaceState(null, '', safePath),
      );
export { browserSession } from './browser-session';
export function hasBootstrapCredential() {
  return browserCredential !== null;
}

type IdentityExperienceProps = Readonly<{
  session: WebIdentitySession;
  initialCredential: BootstrapCredential | null;
  /** Màn mở đầu khi chưa đăng nhập: `/dang-nhap` → login, `/quen-mat-khau` → reset. */
  startView?: 'login' | 'reset-request';
  /**
   * Gọi khi đã đăng nhập (sẵn phiên hoặc vừa đăng nhập xong). Trang `/dang-nhap` dùng để
   * chuyển thẳng vào /khong-gian thay vì hiện trang hồ sơ. Để trống → hiện hồ sơ như cũ.
   */
  onAuthenticated?: (() => void) | undefined;
}>;

export function PublicIdentityPage({
  startView = 'login',
  onAuthenticated,
}: Readonly<{
  startView?: 'login' | 'reset-request';
  onAuthenticated?: (() => void) | undefined;
}> = {}) {
  useLayoutEffect(removeCredentialFragmentAfterHydration, []);
  return (
    <IdentityExperience
      session={browserSession}
      initialCredential={browserCredential}
      startView={startView}
      onAuthenticated={onAuthenticated}
    />
  );
}

function removeCredentialFragmentAfterHydration() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (!fragment.has('invitationToken') && !fragment.has('resetToken')) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

export function IdentityExperience({
  session,
  initialCredential,
  startView = 'login',
  onAuthenticated,
}: IdentityExperienceProps) {
  const [snapshot, setSnapshot] = useState<WebSessionSnapshot>(() => session.snapshot());
  const [view, setView] = useState<IdentityView>('restoring');
  const [pending, setPending] = useState(false);
  const [credentialConsumed, setCredentialConsumed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const credentialSubmitted = useRef(false);

  useEffect(() => {
    let active = true;
    if (initialCredential !== null) {
      queueMicrotask(() => {
        if (!active) return;
        setView(initialCredential.kind === 'invitation' ? 'invitation' : 'reset-request');
      });
      return () => {
        active = false;
      };
    }

    void session
      .restore()
      .then((nextSnapshot) => {
        if (!active) return;
        setSnapshot(nextSnapshot);
        setView(startView);
      })
      .catch((caught: unknown) => {
        if (active) {
          setSnapshot(session.snapshot());
          setView(startView);
          setError(describeApiError(caught).message);
        }
      });
    return () => {
      active = false;
    };
  }, [initialCredential, session, startView]);

  const authenticated = snapshot.status === 'authenticated';
  useEffect(() => {
    if (authenticated) {
      if (onAuthenticated) {
        onAuthenticated();
      } else if (typeof window !== 'undefined') {
        window.location.assign(routes.space);
      }
    }
  }, [authenticated, onAuthenticated]);

  if (snapshot.status === 'authenticated') {
    return (
      <PublicShell session={session}>
        <div className="auth-panel">
          <div className="auth-state" role="status" aria-busy="true">
            <h1>Đang mở không gian cưới…</h1>
          </div>
        </div>
      </PublicShell>
    );
  }

  const run = async (operation: () => Promise<void>) => {
    setPending(true);
    setError(null);
    setFieldErrors({});
    setNotice(null);
    try {
      await operation();
    } catch (caught) {
      credentialSubmitted.current = false;
      setCredentialConsumed(false);

      if (caught instanceof ApiClientError && caught.details && caught.details.length > 0) {
        const errors: Record<string, string> = {};
        for (const detail of caught.details) {
          if (detail.path) {
            let msg = detail.message;
            if (detail.path === 'password' || detail.path === 'newPassword') {
              if (detail.code === 'too_small') {
                msg = 'Mật khẩu quá ngắn. Vui lòng nhập mật khẩu hợp lệ.';
              } else if (detail.code === 'too_big') {
                msg = 'Mật khẩu quá dài (tối đa 128 ký tự).';
              } else {
                msg = detail.message || 'Mật khẩu không hợp lệ.';
              }
            } else if (detail.path === 'email') {
              msg = 'Email không hợp lệ.';
            }
            errors[detail.path] = msg;
          }
        }
        setFieldErrors(errors);
        setError(null);
      } else if (
        caught instanceof ApiClientError &&
        (caught.status === 422 || caught.code === 'VALIDATION_ERROR') &&
        view === 'invitation'
      ) {
        setFieldErrors({
          password: 'Mật khẩu chưa hợp lệ hoặc không đáp ứng chính sách bảo mật.',
        });
        setError(null);
      } else {
        setError(identityErrorMessage(caught, view));
      }
    } finally {
      setPending(false);
    }
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = readField(form, 'email');
    const password = readField(form, 'password');
    const errors: Record<string, string> = {};
    if (!email) {
      errors.email = 'Vui lòng nhập email.';
    }
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }
    void run(async () => {
      const nextSnapshot = await session.login(email, password);
      setSnapshot(nextSnapshot);
    });
  };

  const handleInvitation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (credentialSubmitted.current || initialCredential?.kind !== 'invitation') return;
    const form = new FormData(event.currentTarget);
    const password = readField(form, 'password');
    const passwordConfirmation = readField(form, 'passwordConfirmation');
    const errors: Record<string, string> = {};
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }
    if (!passwordConfirmation) {
      errors.passwordConfirmation = 'Vui lòng xác nhận mật khẩu.';
    } else if (password !== passwordConfirmation) {
      errors.passwordConfirmation = 'Hai mật khẩu chưa trùng khớp.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }
    credentialSubmitted.current = true;
    setCredentialConsumed(true);
    void run(async () => {
      const nextSnapshot = await session.acceptInvitation(initialCredential.token, password);
      setSnapshot(nextSnapshot);
    });
  };

  return (
    <PublicShell session={session}>
      <div className="auth-panel" aria-live="polite">
        {view === 'restoring' ? (
          <div className="auth-state" role="status" aria-busy="true">
            <span className="preview-label">Phiên riêng tư</span>
            <h1>Đang khôi phục hành trình</h1>
            <p>Hỷ Yến đang kiểm tra phiên an toàn của bạn.</p>
          </div>
        ) : null}

        {view === 'login' ? (
          <AuthForm
            title="Tiếp tục hành trình của bạn"
            description="Đăng nhập để mở không gian tư vấn hoặc kế hoạch cưới đầy đủ."
            submitLabel="Đăng nhập"
            pending={pending}
            onSubmit={handleLogin}
          >
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              error={fieldErrors.email}
            />
            <Field
              label="Mật khẩu"
              name="password"
              type="password"
              autoComplete="current-password"
              error={fieldErrors.password}
            />
          </AuthForm>
        ) : null}

        {view === 'invitation' ? (
          <AuthForm
            title="Hoàn tất lời mời của bạn"
            description="Tài khoản mới sẽ dùng mật khẩu này. Nếu đã có tài khoản, hãy nhập mật khẩu hiện tại."
            submitLabel="Xác nhận lời mời"
            pending={pending || credentialConsumed}
            onSubmit={handleInvitation}
          >
            <Field
              label="Mật khẩu"
              name="password"
              type="password"
              autoComplete="new-password"
              error={fieldErrors.password}
            />
            <Field
              label="Xác nhận mật khẩu"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              error={fieldErrors.passwordConfirmation}
            />
          </AuthForm>
        ) : null}

        {view === 'reset-request' ? (
          <PasswordResetOtpForm
            onCompleted={() => {
              setView('login');
              setNotice('Mật khẩu đã được cập nhật. Hãy đăng nhập lại.');
            }}
          />
        ) : null}

        {error === null ? null : (
          <p className="form-message form-error" role="alert">
            {error}
          </p>
        )}
        {notice === null ? null : (
          <p className="form-message form-success" role="status">
            {notice}
          </p>
        )}

        {view === 'login' ? (
          <button className="text-action" type="button" onClick={() => setView('reset-request')}>
            Quên mật khẩu?
          </button>
        ) : null}
        {view === 'reset-request' ? (
          <button className="text-action" type="button" onClick={() => setView('login')}>
            Quay lại đăng nhập
          </button>
        ) : null}
      </div>
    </PublicShell>
  );
}
