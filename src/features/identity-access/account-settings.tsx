'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { createExperienceGateway, type Profile } from './experience-api';
import type { WebIdentitySession } from './session';

const gateway = createExperienceGateway();
export function AccountSettings({
  session,
  onSignedOut,
}: {
  session: WebIdentitySession;
  onSignedOut: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    void session
      .authorize((token) => gateway.profile(token))
      .then((value) => {
        if (active) {
          setProfile(value);
          setName(value.displayName ?? '');
          setError(null);
        }
      })
      .catch(() => {
        if (active) setError('Chưa tải được hồ sơ. Hãy thử lại.');
      });
    return () => {
      active = false;
    };
  }, [session, reload]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || profile === null) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const next = await session.authorize((token) =>
        gateway.updateProfile(token, name.trim(), profile.revision),
      );
      setProfile(next);
      setNotice('Đã lưu tên hiển thị.');
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.status === 409
          ? 'Hồ sơ đã thay đổi ở nơi khác. Tải lại trước khi tiếp tục.'
          : 'Chưa lưu được hồ sơ. Nội dung của bạn vẫn được giữ lại.',
      );
    } finally {
      setPending(false);
    }
  }
  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget),
      current = form.get('currentPassword'),
      next = form.get('newPassword');
    if (typeof current !== 'string' || typeof next !== 'string') return;
    if (next !== form.get('confirmation')) {
      setError('Hai mật khẩu mới chưa trùng khớp.');
      return;
    }
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await session.authorize((token) => gateway.changePassword(token, current, next));
      session.discardRevokedSession();
      onSignedOut();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.code === 'CURRENT_PASSWORD_INVALID'
          ? 'Mật khẩu hiện tại chưa đúng.'
          : 'Chưa đổi được mật khẩu. Hãy thử lại.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="account-settings" aria-label="Cài đặt tài khoản">
      <div className="public-section-heading">
        <div>
          <span className="public-kicker">Thông tin của bạn</span>
          <h2>Hồ sơ và bảo mật</h2>
        </div>
        <button type="button" disabled={pending} onClick={() => setReload((value) => value + 1)}>
          Tải lại hồ sơ
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {!profile && !error ? <p role="status">Đang tải hồ sơ…</p> : null}
      {profile ? (
        <div className="account-settings-grid">
          <form onSubmit={(event) => void save(event)}>
            <h3>Hồ sơ</h3>
            <label>
              Email
              <input value={profile.displayEmail} readOnly autoComplete="email" />
            </label>
            <label>
              Tên hiển thị
              <input
                name="displayName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
                autoComplete="name"
              />
            </label>
            <button className="public-button" disabled={pending} type="submit">
              Lưu thay đổi
            </button>
          </form>
          <form onSubmit={(event) => void change(event)}>
            <h3>Đổi mật khẩu</h3>
            <label>
              Mật khẩu hiện tại
              <input
                name="currentPassword"
                required
                type="password"
                autoComplete="current-password"
                maxLength={512}
              />
            </label>
            <label>
              Mật khẩu mới
              <input
                name="newPassword"
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            <label>
              Xác nhận mật khẩu mới
              <input
                name="confirmation"
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            <p className="public-muted">
              Dùng 12–128 ký tự. Sau khi đổi, bạn cần đăng nhập lại trên các thiết bị.
            </p>
            <button className="public-button" disabled={pending} type="submit">
              Cập nhật mật khẩu
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
