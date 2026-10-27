'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BrandMark } from '../../design-system/brand-mark';
import { Skeleton } from '../../design-system/skeleton';
import { routes } from '../../routes';
import { AccountSettings } from './account-settings';
import { browserSession } from './browser-session';
import { PublicIdentityPage } from './identity-page';
import type { WebSessionSnapshot } from './session';
import styles from './profile-page.module.css';

export function ProfilePage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<WebSessionSnapshot>(() => browserSession.snapshot());
  const [restoring, setRestoring] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    void browserSession.restore().then((nextSnapshot) => {
      if (!active) return;
      setSnapshot(nextSnapshot);
      setRestoring(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await browserSession.logout();
    } catch {
      // Bỏ qua lỗi mạng khi logout để xóa trạng thái cục bộ
    } finally {
      setSnapshot(browserSession.snapshot());
      setLoggingOut(false);
      router.replace(routes.login);
    }
  };

  if (restoring) {
    return (
      <div className={styles.profilePageWrapper}>
        <main className={styles.profileMain}>
          <Skeleton label="Đang tải hồ sơ của bạn…" />
        </main>
      </div>
    );
  }

  if (snapshot.status !== 'authenticated') {
    return (
      <PublicIdentityPage
        startView="login"
        onAuthenticated={() => setSnapshot(browserSession.snapshot())}
      />
    );
  }

  const email = snapshot.actor.displayEmail;
  const initial = email.slice(0, 1).toUpperCase();

  return (
    <div className={styles.profilePageWrapper}>
      <header className={styles.profileHeaderBar}>
        <div className={styles.headerInner}>
          <Link href={routes.space} style={{ textDecoration: 'none' }}>
            <BrandMark compact />
          </Link>
          <div className={styles.headerActions}>
            <Link className={styles.backLink} href={routes.space}>
              <span aria-hidden="true">←</span> Quay lại Kế hoạch cưới
            </Link>
            <button
              className={styles.logoutButton}
              type="button"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
          </div>
        </div>
      </header>

      <main className={styles.profileMain} id="profile-content">
        <nav aria-label="Đường dẫn" className={styles.breadcrumb}>
          <Link href={routes.space}>Không gian cưới</Link>
          <span aria-hidden="true">/</span>
          <span>Hồ sơ & Bảo mật tài khoản</span>
        </nav>

        <section className={styles.profileHeroCard} aria-label="Tài khoản hiện tại">
          <div className={styles.profileIdentity}>
            <div className={styles.profileAvatar} aria-hidden="true">
              {initial}
            </div>
            <div className={styles.profileMeta}>
              <span className={styles.kicker}>Tài khoản Hỷ Yến</span>
              <h1 className={styles.profileTitle}>Hồ sơ & Bảo mật</h1>
              <p className={styles.profileEmail}>{email}</p>
            </div>
          </div>
          <div className={styles.profileBadges}>
            <span className={styles.verifiedBadge}>
              <span aria-hidden="true">✓</span> Đã xác thực
            </span>
            <span className={styles.roleBadge}>Quyền truy cập: Cặp đôi</span>
          </div>
        </section>

        <div className={styles.settingsSection}>
          <AccountSettings
            session={browserSession}
            onSignedOut={() => {
              setSnapshot(browserSession.snapshot());
              router.replace(routes.login);
            }}
          />
        </div>
      </main>
    </div>
  );
}
