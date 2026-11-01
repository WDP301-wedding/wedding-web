import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import React, { useState, type FormEvent } from 'react';
import { cn } from 'cn';

import { Button } from '../../components/ui/button';
import { PageTransition } from '../../design-system/page-transition';
import { control, field, fieldError } from '../public-website/public-classes';
import { PublicHeader } from '../public-website/public-shell';
import type { WebIdentitySession } from './session';

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
    <div className={field}>
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          {...input}
          type={password && visible ? 'text' : input.type}
          id={id}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(control, password && 'pr-12', className)}
          required
        />
        {password ? (
          <button
            className="absolute top-1/2 right-1 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            type="button"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-controls={id}
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className={fieldError} role="alert">
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
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Đang xử lý…' : submitLabel}
      </Button>
      <p className="text-xs text-muted-foreground">
        Thông tin đăng nhập không được lưu trong trình duyệt.
      </p>
    </form>
  );
}

/** Khung trang tài khoản: header công khai, ảnh cưới bên trái (màn rộng), form bên phải. */
export function PublicShell({
  children,
  session,
}: Readonly<{ children: React.ReactNode; session: WebIdentitySession }>) {
  return (
    <div data-ui-v3 className="flex min-h-dvh flex-col bg-background">
      <a
        className="sr-only z-50 rounded-lg bg-card px-4 py-2 text-sm font-semibold text-primary shadow-hy-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#identity-content"
      >
        Đi đến nội dung chính
      </a>
      <PublicHeader session={session} restoreSession={false} />
      <main
        id="identity-content"
        className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(480px,560px)]"
      >
        <div className="relative max-lg:hidden">
          <Image
            className="object-cover"
            src="/images/khoanh-khac/co-dau-chu-re.webp"
            alt="Hình ảnh cặp đôi trong ngày cưới"
            fill
            sizes="(max-width: 1024px) 0px, 60vw"
            priority
          />
        </div>
        <section className="flex flex-col justify-center bg-card px-4 py-10 sm:px-12 lg:px-16">
          <PageTransition>
            <div className="mx-auto flex w-full max-w-md flex-col gap-4">{children}</div>
          </PageTransition>
        </section>
      </main>
    </div>
  );
}
