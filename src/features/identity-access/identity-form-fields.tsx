import React, { useState, type FormEvent } from 'react';
import fieldStyles from './identity-field.module.css';
import { PublicHeader } from '../public-website/public-shell';
import type { WebIdentitySession } from './session';

export function EyeIcon() {
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

export function EyeOffIcon() {
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

export function Field({
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
          className={
            `${className ?? ''} ${password ? fieldStyles.passwordInput : ''} ${error ? fieldStyles.inputError : ''}`.trim() ||
            undefined
          }
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

export function AuthForm({
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

export function PublicShell({
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
