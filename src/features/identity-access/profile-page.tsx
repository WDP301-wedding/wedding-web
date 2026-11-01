'use client';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from 'cn';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BrandMark } from '../../design-system/brand-mark';
import { InlineError } from '../../design-system/inline-error';
import { Skeleton } from '../../design-system/skeleton';
import { routes } from '../../routes';
import { useInSpace } from '../couple-workspace/space-provider';
import { AccountSettings } from './account-settings';
import { browserSession } from './browser-session';
import { PublicIdentityPage } from './identity-page';
import { useProfileSession } from './use-profile-session';

/** Trong Không gian cưới trang nằm gọn trong khung sẵn có; mở riêng thì có nền và header riêng. */
function ProfileFrame({ inSpace, children }: Readonly<{ inSpace: boolean; children: ReactNode }>) {
  return (
    <div data-ui-v3 className={cn('flex flex-col', !inSpace && 'min-h-dvh bg-muted')}>
      {children}
    </div>
  );
}

const mainClass = (inSpace: boolean) =>
  cn(
    'flex w-full flex-col gap-6',
    inSpace ? 'pb-12' : 'mx-auto max-w-5xl flex-1 px-4 pt-8 pb-16 sm:px-6',
  );

export function ProfilePage() {
  const inSpace = useInSpace();
  const { snapshot, restoring, restoreError, loggingOut, retry, logout, signedOut, refresh } =
    useProfileSession();

  if (restoreError)
    return (
      <ProfileFrame inSpace={inSpace}>
        <main className={mainClass(inSpace)}>
          <InlineError error={restoreError} onRetry={retry} />
        </main>
      </ProfileFrame>
    );
  if (restoring) {
    return (
      <ProfileFrame inSpace={inSpace}>
        <main className={mainClass(inSpace)}>
          <Skeleton label="Đang tải hồ sơ của bạn…" />
        </main>
      </ProfileFrame>
    );
  }

  if (snapshot.status !== 'authenticated') {
    return <PublicIdentityPage startView="login" onAuthenticated={refresh} />;
  }

  const email = snapshot.actor.displayEmail;
  const initial = email.slice(0, 1).toUpperCase();

  return (
    <ProfileFrame inSpace={inSpace}>
      {!inSpace ? (
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href={routes.space}>
              <BrandMark compact />
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-accent"
                href={routes.space}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span className="max-sm:sr-only">Quay lại Kế hoạch cưới</span>
              </Link>
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={loggingOut}
                onClick={() => void logout()}
              >
                {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
              </Button>
            </div>
          </div>
        </header>
      ) : null}

      <main className={mainClass(inSpace)} id="profile-content">
        <nav
          aria-label="Đường dẫn"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Link className="text-primary hover:underline" href={routes.space}>
            Không gian cưới
          </Link>
          <span aria-hidden="true">/</span>
          <span>Hồ sơ & Bảo mật tài khoản</span>
        </nav>

        <section
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          aria-label="Tài khoản hiện tại"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-primary"
              aria-hidden="true"
            >
              {initial}
            </div>
            <div className="flex min-w-0 flex-col">
              <h1 className="text-xl font-bold">Hồ sơ & Bảo mật</h1>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">
              <Check aria-hidden="true" />
              Đã xác thực
            </Badge>
            <Badge>Quyền truy cập: Cặp đôi</Badge>
          </div>
        </section>

        <AccountSettings session={browserSession} onSignedOut={signedOut} />
      </main>
    </ProfileFrame>
  );
}
