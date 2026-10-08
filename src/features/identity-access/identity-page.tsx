'use client';

import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { PasswordResetOtpForm } from './password-reset-otp-form';
import { ApiClientError } from '../../lib/api/client';
import { AccountSettings } from './account-settings';
import {
  consumeCredentialFragment,
  createIdentityApi,
  WebIdentitySession,
  type BootstrapCredential,
  type WebSessionSnapshot,
} from './session';

const browserCredential =
  typeof window === 'undefined'
    ? null
    : consumeCredentialFragment(window.location.href, (safePath) =>
        window.history.replaceState(null, '', safePath),
      );
export const browserSession = new WebIdentitySession(createIdentityApi());
export function hasBootstrapCredential() {
  return browserCredential !== null;
}

type IdentityView = 'invitation' | 'login' | 'reset-request' | 'restoring';

type IdentityExperienceProps = Readonly<{
  session: WebIdentitySession;
  initialCredential: BootstrapCredential | null;
}>;

export function PublicIdentityPage() {
  useLayoutEffect(removeCredentialFragmentAfterHydration, []);
  return <IdentityExperience session={browserSession} initialCredential={browserCredential} />;
}

function removeCredentialFragmentAfterHydration() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (!fragment.has('invitationToken') && !fragment.has('resetToken')) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

export function IdentityExperience({ session, initialCredential }: IdentityExperienceProps) {
  const [snapshot, setSnapshot] = useState<WebSessionSnapshot>(() => session.snapshot());
  const [view, setView] = useState<IdentityView>('restoring');
  const [pending, setPending] = useState(false);
  const [credentialConsumed, setCredentialConsumed] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setView('login');
    });
    return () => {
      active = false;
    };
  }, [initialCredential, session]);

  if (snapshot.status === 'authenticated') {
    return (
      <AuthenticatedWorkspace
        snapshot={snapshot}
        session={session}
        onSignedOut={() => {
          setSnapshot(session.snapshot());
          setView('login');
          setNotice('Đã đổi mật khẩu. Hãy đăng nhập lại để tiếp tục.');
        }}
        pending={pending}
        onLogout={() => {
          setPending(true);
          setError(null);
          void session
            .logout()
            .catch(() =>
              setError('Không thể kết nối máy chủ. Trạng thái trên thiết bị đã được xóa.'),
            )
            .finally(() => {
              setSnapshot(session.snapshot());
              setView('login');
              setPending(false);
            });
        }}
      />
    );
  }

  const run = async (operation: () => Promise<void>) => {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await operation();
    } catch (caught) {
      setError(identityErrorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      const nextSnapshot = await session.login(
        readField(form, 'email'),
        readField(form, 'password'),
      );
      setSnapshot(nextSnapshot);
    });
  };

  const handleInvitation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (credentialSubmitted.current || initialCredential?.kind !== 'invitation') return;
    const form = new FormData(event.currentTarget);
    const password = readField(form, 'password');
    if (password !== readField(form, 'passwordConfirmation')) {
      setError('Hai mật khẩu chưa trùng khớp.');
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
    <PublicShell>
      <div className="auth-panel" aria-live="polite">
        {view === 'restoring' ? (
          <div className="auth-state" role="status" aria-busy="true">
            <span className="preview-label">Phiên riêng tư</span>
            <h1>Đang khôi phục hành trình</h1>
            <p>Wedding Estate đang kiểm tra phiên an toàn của bạn.</p>
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
            <Field label="Email" name="email" type="email" autoComplete="email" />
            <Field
              label="Mật khẩu"
              name="password"
              type="password"
              autoComplete="current-password"
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
              minLength={12}
            />
            <Field
              label="Xác nhận mật khẩu"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
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

function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a className="skip-link" href="#identity-content">
        Đi đến nội dung chính
      </a>
      <div className="announcement-bar">
        <span>Lời mời riêng tư</span>
        <span aria-hidden="true">•</span>
        <span>Wedding Estate</span>
      </div>
      <header className="site-header">
        <div className="estate-brand" aria-label="The Wedding Estate">
          <small>THE</small>
          <strong className="latin-wordmark" lang="en">
            WEDDING ESTATE
          </strong>
          <span>Hành trình của hai bạn</span>
        </div>
      </header>
      <div className="invitation-ribbon">Một nơi riêng tư cho mọi quyết định quan trọng</div>
      <main id="identity-content" className="identity-layout">
        <section
          className="invitation-visual"
          role="img"
          aria-label="Cặp đôi trong không gian lễ cưới với hoa trắng"
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
      <span className="preview-label">Tài khoản Wedding Estate</span>
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

function Field({
  label,
  name,
  ...input
}: Readonly<React.InputHTMLAttributes<HTMLInputElement>> & {
  label: string;
  name: string;
}) {
  const id = `identity-${name}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input {...input} id={id} name={name} required />
    </div>
  );
}

function AuthenticatedWorkspace({
  session,
  onSignedOut,
  onLogout,
  pending,
  snapshot,
}: Readonly<{
  session: WebIdentitySession;
  onSignedOut: () => void;
  onLogout: () => void;
  pending: boolean;
  snapshot: Extract<WebSessionSnapshot, { status: 'authenticated' }>;
}>) {
  const full = snapshot.access === 'full';
  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <div className="estate-brand">
          <small>THE</small>
          <strong className="latin-wordmark" lang="en">
            WEDDING ESTATE
          </strong>
        </div>
        <div className="account-actions">
          <span>{snapshot.actor.displayEmail}</span>
          <button type="button" onClick={onLogout} disabled={pending}>
            Đăng xuất
          </button>
        </div>
      </header>
      <section className="workspace-hero">
        <span className="preview-label">{full ? 'Không gian cặp đôi' : 'Không gian tư vấn'}</span>
        <p className="script-heading">Hành trình của hai bạn</p>
        <h1>{full ? 'Kế hoạch ngày trọng đại' : 'Cùng hoàn thiện đề xuất'}</h1>
        <p>
          {full
            ? 'Tài khoản của bạn đã có quyền truy cập đầy đủ vào kế hoạch cưới.'
            : 'Bạn đang có quyền truy cập giới hạn để xem đề xuất và cùng cập nhật mốc tư vấn.'}
        </p>
        <Link className="primary-action workspace-entry" href="/overview">
          Mở kế hoạch của chúng tôi
        </Link>
      </section>
      <AccountSettings session={session} onSignedOut={onSignedOut} />
      <section className="access-summary" aria-label="Phạm vi truy cập hiện tại">
        <article>
          <span>Đang mở</span>
          <strong>Đề xuất dịch vụ</strong>
          <p>Xem nội dung đã được nhà hàng chuẩn bị cho buổi tư vấn.</p>
        </article>
        <article>
          <span>Đang mở</span>
          <strong>Dòng thời gian tư vấn</strong>
          <p>Cùng theo dõi những bước cần thống nhất trước ngày đặt cọc.</p>
        </article>
        <article aria-disabled={!full} className={full ? '' : 'access-locked'}>
          <span>Đang chuẩn bị</span>
          <strong>Khách mời, thiệp và sơ đồ bàn</strong>
          <p>Mọi thao tác vẫn được máy chủ kiểm tra quyền trước khi thực hiện.</p>
        </article>
      </section>
    </main>
  );
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function identityErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Thông tin xác thực không hợp lệ hoặc đã hết hạn.';
    if (error.status === 403 || error.status === 404) {
      return 'Bạn chưa có quyền thực hiện thao tác này. Dữ liệu hiển thị đã được làm mới.';
    }
    if (error.status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.';
  }
  return 'Không thể kết nối máy chủ. Vui lòng thử lại.';
}
