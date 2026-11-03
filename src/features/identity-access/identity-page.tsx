'use client';
import { useLayoutEffect } from 'react';

import { PasswordResetOtpForm } from './password-reset-otp-form';
import { browserSession } from './browser-session';
import {
  consumeCredentialFragment,
  type WebIdentitySession,
  type BootstrapCredential,
} from './session';
import { AuthForm, Field, PublicShell } from './identity-form-fields';
import { useIdentityExperience } from './use-identity-experience';
import { alert } from '../public-website/public-classes';

const browserCredential =
  typeof window === 'undefined'
    ? null
    : consumeCredentialFragment(window.location.href, (safePath) =>
        window.history.replaceState(null, '', safePath),
      );
export { browserSession } from './browser-session';

const textAction =
  'self-center rounded-lg px-2 py-2 text-sm font-semibold text-primary transition-colors hover:text-hy-wine-pressed';

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
  /** Ghi chú hiện trên form đăng nhập (ví dụ `/loi-moi` mở mà không có mã lời mời). */
  loginHint?: string | undefined;
}>;

export function PublicIdentityPage({
  startView = 'login',
  onAuthenticated,
  loginHint,
}: Readonly<{
  startView?: 'login' | 'reset-request';
  onAuthenticated?: (() => void) | undefined;
  loginHint?: string | undefined;
}> = {}) {
  useLayoutEffect(removeCredentialFragmentAfterHydration, []);
  return (
    <IdentityExperience
      session={browserSession}
      initialCredential={browserCredential}
      startView={startView}
      onAuthenticated={onAuthenticated}
      loginHint={browserCredential === null ? loginHint : undefined}
    />
  );
}

function removeCredentialFragmentAfterHydration() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (!fragment.has('invitationToken') && !fragment.has('resetToken')) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

function StatusPanel({ title, children }: Readonly<{ title: string; children?: string }>) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-busy="true">
      <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
      {children ? <p className="text-sm text-muted-foreground">{children}</p> : null}
    </div>
  );
}

export function IdentityExperience({
  session,
  initialCredential,
  startView = 'login',
  onAuthenticated,
  loginHint,
}: IdentityExperienceProps) {
  const {
    snapshot,
    view,
    setView,
    pending,
    credentialConsumed,
    error,
    fieldErrors,
    notice,
    setNotice,
    handleLogin,
    handleInvitation,
    maskedEmail,
  } = useIdentityExperience({ session, initialCredential, startView, onAuthenticated });

  if (snapshot.status === 'authenticated') {
    return (
      <PublicShell session={session}>
        <StatusPanel title="Đang mở không gian cưới…" />
      </PublicShell>
    );
  }

  return (
    <PublicShell session={session}>
      <div className="flex flex-col gap-4" aria-live="polite">
        {view === 'restoring' ? (
          <StatusPanel title="Đang khôi phục hành trình">
            Hỷ Yến đang kiểm tra phiên an toàn của bạn.
          </StatusPanel>
        ) : null}

        {view === 'login' && loginHint ? (
          <p className="rounded-lg bg-hy-info-bg px-4 py-3 text-sm text-hy-info" role="status">
            {loginHint}
          </p>
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
            description={
              maskedEmail
                ? `Lời mời được gửi tới ${maskedEmail}. Tài khoản mới sẽ dùng mật khẩu này. Nếu đã có tài khoản, hãy nhập mật khẩu hiện tại.`
                : 'Tài khoản mới sẽ dùng mật khẩu này. Nếu đã có tài khoản, hãy nhập mật khẩu hiện tại.'
            }
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
          <p className={alert} role="alert">
            {error}
          </p>
        )}
        {notice === null ? null : (
          <p
            className="rounded-lg bg-hy-success-bg px-4 py-3 text-sm text-hy-success"
            role="status"
          >
            {notice}
          </p>
        )}

        {view === 'login' ? (
          <button className={textAction} type="button" onClick={() => setView('reset-request')}>
            Quên mật khẩu?
          </button>
        ) : null}
        {view === 'reset-request' ? (
          <button className={textAction} type="button" onClick={() => setView('login')}>
            Quay lại đăng nhập
          </button>
        ) : null}
      </div>
    </PublicShell>
  );
}
