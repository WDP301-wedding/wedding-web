'use client';
import fieldStyles from './identity-field.module.css';

import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { PublicHeader } from '../public-website/public-shell';
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

type IdentityView = 'invitation' | 'login' | 'reset-request' | 'restoring';

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

    void session.restore().then((nextSnapshot) => {
      if (!active) return;
      setSnapshot(nextSnapshot);
      setView(startView);
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

function PublicShell({
  children,
  session,
}: Readonly<{ children: React.ReactNode; session: WebIdentitySession }>) {
  return (
    <>
      <a className="skip-link" href="#identity-content">
        Đi đến nội dung chính
      </a>
      <PublicHeader
        className={fieldStyles.authHeader ?? ''}
        session={session}
        restoreSession={false}
      />
      <div className="invitation-ribbon">Một nơi riêng tư cho mọi quyết định quan trọng</div>
      <main id="identity-content" className={'identity-layout ' + fieldStyles.authLayout}>
        <section
          className="invitation-visual"
          role="img"
          aria-label="Hình ảnh cặp đôi trong ngày cưới"
        >
          <div className="visual-caption">
            <span>Bảo mật</span>
            <strong>Riêng tư</strong>
            <span>Đồng hành</span>
          </div>
        </section>
        <section className="invitation-content">{children}</section>
      </main>
    </>
  );
}

function AuthForm({
  children,
  description,
  onSubmit,
  pending,
  submitLabel,
  title,
}: Readonly<{
  children: React.ReactNode;
  description: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  submitLabel: string;
  title: string;
}>) {
  return (
    <form className="identity-form" onSubmit={onSubmit}>
      <span className="preview-label">Tài khoản Hỷ Yến</span>
      <p className="script-heading">Hành trình của hai bạn</p>
      <h1>{title}</h1>
      <p className="invitation-lead">{description}</p>
      <div className="identity-fields">{children}</div>
      <button className="primary-action" type="submit" disabled={pending}>
        {pending ? 'Đang xử lý…' : submitLabel}
        <span aria-hidden="true">→</span>
      </button>
      <p className="form-security-note">Thông tin đăng nhập không được lưu trong trình duyệt.</p>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Field({
  label,
  name,
  className,
  error,
  ...input
}: Readonly<React.InputHTMLAttributes<HTMLInputElement>> & {
  label: string;
  name: string;
  error?: string | null | undefined;
}) {
  const [visible, setVisible] = useState(false);
  const password = input.type === 'password';
  const id = `identity-${name}`;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={fieldStyles.inputWrap}>
        <input
          {...input}
          type={password && visible ? 'text' : input.type}
          id={id}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`${className ?? ''} ${password ? fieldStyles.passwordInput : ''} ${error ? fieldStyles.inputError : ''}`.trim() || undefined}
          required
        />
        {password ? (
          <button
            className={fieldStyles.toggle}
            type="button"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-controls={id}
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className={fieldStyles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function identityErrorMessage(error: unknown, view?: IdentityView): string {
  if (error instanceof ApiClientError) {
    if (error.kind === 'network' || error.kind === 'timeout') {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
    }
    if (error.status === 400 || error.code === 'VALIDATION_ERROR' || error.status === 422) {
      if (error.details && error.details.length > 0) {
        const pwDetail = error.details.find(
          (d) => d.path === 'password' || d.path === 'newPassword',
        );
        if (pwDetail) {
          if (pwDetail.code === 'too_small') {
            return 'Mật khẩu quá ngắn. Mật khẩu phải từ 1 đến 128 ký tự.';
          }
          if (pwDetail.code === 'too_big') {
            return 'Mật khẩu quá dài (tối đa 128 ký tự).';
          }
          return `Mật khẩu chưa hợp lệ: ${pwDetail.message}`;
        }
        return (
          error.details
            .map((d) => d.message)
            .filter(Boolean)
            .join(' ') || 'Thông tin nhập vào chưa hợp lệ. Vui lòng kiểm tra lại.'
        );
      }
      if (view === 'invitation') {
        return 'Mật khẩu chưa hợp lệ hoặc không đáp ứng chính sách. Mật khẩu phải từ 1 đến 128 ký tự.';
      }
      if (view === 'login') {
        return 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.';
      }
      return 'Thông tin nhập vào chưa hợp lệ. Vui lòng kiểm tra lại.';
    }
    if (
      error.status === 401 ||
      error.code === 'AUTHENTICATION_REQUIRED' ||
      error.code === 'INVALID_CREDENTIALS' ||
      error.code === 'INVALID_OR_EXPIRED_TOKEN'
    ) {
      if (view === 'login') {
        return 'Email hoặc mật khẩu chưa chính xác. Vui lòng kiểm tra và thử lại.';
      }
      if (view === 'invitation') {
        return 'Liên kết lời mời đã hết hạn hoặc mật khẩu tài khoản hiện tại chưa chính xác. Nếu đã có tài khoản, hãy nhập đúng mật khẩu hiện tại.';
      }
      return 'Thông tin xác thực không hợp lệ hoặc phiên làm việc đã hết hạn.';
    }
    if (error.status === 403) {
      return 'Bạn chưa có quyền thực hiện thao tác này.';
    }
    if (error.status === 404) {
      return 'Liên kết không còn tồn tại hoặc tài nguyên không tìm thấy.';
    }
    if (error.status === 409) {
      return view === 'invitation'
        ? 'Lời mời này đã được chấp nhận trước đó. Vui lòng đăng nhập để tiếp tục.'
        : 'Dữ liệu có xung đột hoặc thao tác đã được thực hiện trước đó. Vui lòng làm mới trang.';
    }
    if (error.status === 429) {
      return 'Bạn đã thực hiện thao tác quá nhiều lần. Vui lòng chờ ít phút rồi thử lại.';
    }
    if (error.status && error.status >= 500) {
      return 'Máy chủ đang gặp sự cố tạm thời. Vui lòng thử lại sau.';
    }
    if (
      error.message &&
      error.message !== 'The request is invalid.' &&
      error.message !== 'Password does not satisfy the configured policy.'
    ) {
      return error.message;
    }
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
}
