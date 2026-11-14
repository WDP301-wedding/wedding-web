import { Eye, EyeOff, Heart, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import React, { useState, type FormEvent } from 'react';
import { cn } from 'cn';

import { Button } from '../../components/ui/button';
import { control, fieldError } from '../public-website/public-classes';
import { PublicHeader } from '../public-website/public-shell';
import type { WebIdentitySession } from './session';

export function Field({
  label,
  name,
  className,
  error,
  icon: Icon,
  ...input
}: Readonly<React.InputHTMLAttributes<HTMLInputElement>> & {
  label: string;
  name: string;
  error?: string | null | undefined;
  /** Icon trang trí bên trái ô nhập (phong bì, ổ khoá…). */
  icon?: LucideIcon;
}) {
  const [visible, setVisible] = useState(false);
  const password = input.type === 'password';
  const id = `identity-${name}`;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {/* Nhãn ẩn về mặt hình ảnh (placeholder hiển thị thay) nhưng trình đọc màn hình vẫn đọc. */}
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
        <input
          placeholder={label}
          {...input}
          type={password && visible ? 'text' : input.type}
          id={id}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            control,
            'h-[50px] rounded-xl border-border bg-muted/60',
            Icon && 'pl-12',
            password && 'pr-12',
            className,
          )}
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
  submitIcon: SubmitIcon,
  title,
}: Readonly<{
  children: React.ReactNode;
  description: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  submitLabel: string;
  submitIcon?: LucideIcon;
  title: string;
}>) {
  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl leading-snug font-bold text-primary sm:text-2xl xl:text-[1.75rem]">
          {title}
        </h1>
        <p className="text-sm leading-6 text-pretty text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
      <Button className="rounded-xl" type="submit" size="lg" disabled={pending}>
        {SubmitIcon ? <SubmitIcon aria-hidden="true" /> : null}
        {pending ? 'Đang xử lý…' : submitLabel}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Thông tin đăng nhập không được lưu trong trình duyệt.
      </p>
    </form>
  );
}

/** Biểu tượng hai chiếc nhẫn cưới (lucide không có sẵn) – thuần trang trí. */
function WeddingRings() {
  return (
    <svg
      className="mx-auto h-16 w-20 text-primary"
      viewBox="0 0 80 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="26" cy="42" r="17" />
      <circle cx="46" cy="42" r="17" />
      {/* Viên kim cương trên nhẫn phải + tia lấp lánh */}
      <path d="M38 12h14l5 6-12 9-12-9 5-6Zm-5 6h24" strokeWidth="2.5" />
      <path d="M64 10l4-4M68 20h5M60 4V1" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * Khung trang tài khoản: header công khai, ảnh sảnh tiệc + lời giới thiệu bên trái (60%),
 * thẻ form bên phải (40%). Màn hẹp: xếp một cột, ảnh thu thành dải ngắn phía trên.
 */
export function PublicShell({
  children,
  session,
}: Readonly<{ children: React.ReactNode; session: WebIdentitySession }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        className="sr-only z-50 rounded-lg bg-card px-4 py-2 text-sm font-semibold text-primary shadow-hy-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#identity-content"
      >
        Đi đến nội dung chính
      </a>
      {/*
        Màn rộng: header trong suốt nằm đè lên trang (logo trên ảnh, menu trên khu vực form) như
        thiết kế. Menu có nền kem bo tròn để vẫn đọc được khi màn hẹp làm nó lấn sang ảnh.
      */}
      <PublicHeader
        className="lg:absolute lg:inset-x-0 lg:border-transparent lg:bg-transparent lg:[&_nav]:rounded-full lg:[&_nav]:bg-background/85 lg:[&_nav]:px-1.5 lg:[&>div]:max-w-none lg:[&>div]:px-10 xl:[&>div]:px-14"
        session={session}
        restoreSession={false}
      />
      <main id="identity-content" className="grid flex-1 lg:grid-cols-[3fr_2fr]">
        <div className="relative flex min-h-56 items-center overflow-hidden text-white sm:min-h-72">
          {/* Đổi ảnh sảnh tiệc: thay file này trong public/images (giữ tỉ lệ ngang, rộng ≥ 2000px). */}
          <Image
            className="object-cover"
            src="/images/hero-sanh-tiec.webp"
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
          {/* Lớp phủ tối dần từ trái để chữ trắng đủ tương phản trên ảnh. */}
          <div
            className="absolute inset-0 bg-linear-to-r from-hy-ink/75 via-hy-ink/40 to-hy-ink/10"
            aria-hidden="true"
          />
          {/* Vầng sáng kem ở góc trên trái để logo (màu rượu vang) nổi trên ảnh. */}
          <div
            className="absolute top-0 left-0 h-44 w-[30rem] bg-radial-[at_0%_0%] from-background/95 from-15% via-background/45 via-45% to-transparent to-70% max-lg:hidden"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-3 px-6 py-8 sm:px-12 lg:gap-5 lg:pr-28 lg:pl-[15%]">
            <p className="text-xs font-semibold text-white/90 sm:text-sm">
              Nâng tầm khoảnh khắc đáng nhớ
            </p>
            <p className="text-5xl leading-tight font-semibold sm:text-6xl lg:text-7xl xl:text-8xl">
              Hỷ Yến
            </p>
            <p className="max-w-md text-base leading-relaxed lg:max-w-xl text-pretty text-white/95 italic sm:text-xl lg:text-2xl">
              Đồng hành cùng bạn tạo nên những buổi tiệc trọn vẹn và ý nghĩa
            </p>
            <div className="flex items-center gap-3 pl-1 lg:pl-10" aria-hidden="true">
              <span className="h-px w-16 bg-white/80" />
              <Heart className="size-4 fill-current" />
              <span className="h-px w-16 bg-white/80" />
            </div>
          </div>
        </div>
        <section className="relative flex flex-col justify-center bg-linear-to-r from-background to-hy-wine-soft/60 px-4 py-10 sm:px-8 lg:pt-28">
          {/* Mép cong mềm lấn sang ảnh, cùng màu nền với đầu trái của khu vực form. */}
          <svg
            className="absolute inset-y-0 right-[calc(100%-1px)] h-full w-24 fill-background max-lg:hidden"
            viewBox="0 0 96 800"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M96 0C74 130 20 270 10 460c-6 130 2 250 14 340h72Z" />
          </svg>
          <div className="relative mx-auto flex w-full max-w-[30rem] animate-in flex-col gap-5 rounded-[30px] bg-card px-6 py-9 shadow-[0_18px_50px_rgb(43_29_34/0.08)] duration-300 ease-hy-decelerate fade-in fill-mode-backwards slide-in-from-bottom-2 motion-reduce:animate-none sm:px-10">
            <WeddingRings />
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
