'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { OtpChallenge } from './password-otp-api';
import { ApiClientError } from '../../lib/api/client';
import { createExperienceGateway, type Profile } from './experience-api';
import type { WebIdentitySession } from './session';
import { Skeleton } from '../../design-system/skeleton';
import { useToastFeedback } from '../../design-system/toast';

const gateway = createExperienceGateway();
function waitLabel(seconds: number) {
  return seconds >= 60 ? `${Math.ceil(seconds / 60)} phút` : `${seconds} giây`;
}
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
  // Thành công → toast; lỗi (OTP sai, phải chờ, mật khẩu chưa khớp) giữ inline cạnh form vì
  // người dùng cần đọc trong lúc sửa, không được tự biến mất.
  useToastFeedback(notice, null);
  const [reload, setReload] = useState(0);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [remaining, setRemaining] = useState(0);
  const passwordForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  async function sendCode(current: string) {
    const value = await session.authorize((token) => gateway.requestPasswordChange(token, current));
    setChallenge(value);
    setRemaining(value.resendAfterSeconds);
    setNotice('Mã OTP đã được gửi vào email của bạn. Mã có hiệu lực 10 phút.');
  }
  function requestFailed(caught: unknown) {
    if (caught instanceof ApiClientError) {
      if (caught.status === 429) {
        const seconds = caught.retryAfterSeconds ?? 60;
        setRemaining(seconds);
        setError(
          `Bạn đã yêu cầu mã quá nhiều lần. Hãy chờ ${waitLabel(seconds)} trước khi thử lại.`,
        );
        return;
      }
      if (caught.code === 'CURRENT_PASSWORD_INVALID') {
        setError('Mật khẩu hiện tại chưa đúng.');
        return;
      }
      if (caught.code === 'EMAIL_NOT_CONFIGURED' || caught.code === 'OTP_EMAIL_DELIVERY_FAILED') {
        setError('Dịch vụ email đang gặp sự cố nên chưa gửi được mã OTP. Hãy thử lại sau.');
        return;
      }
    }
    setError('Chưa gửi được mã xác nhận. Hãy kiểm tra kết nối rồi thử lại.');
  }
  async function resend() {
    if (pending || remaining > 0 || !passwordForm.current) return;
    const current = new FormData(passwordForm.current).get('currentPassword');
    if (typeof current !== 'string') return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await sendCode(current);
    } catch (caught) {
      requestFailed(caught);
    } finally {
      setPending(false);
    }
  }
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
    if (pending || (!challenge && remaining > 0)) return;
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
      if (!challenge) {
        await sendCode(current);
        return;
      }
      await session.authorize((token) =>
        gateway.changePassword(
          token,
          challenge.challengeId,
          typeof form.get('code') === 'string' ? (form.get('code') as string) : '',
          next,
        ),
      );
      session.discardRevokedSession();
      onSignedOut();
    } catch (caught) {
      if (challenge) {
        setError('Mã OTP chưa đúng hoặc đã hết hạn. Kiểm tra mã mới nhất hoặc gửi lại.');
      } else {
        requestFailed(caught);
      }
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
      {!profile && !error ? <Skeleton label="Đang tải hồ sơ…" /> : null}
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
          <form ref={passwordForm} onSubmit={(event) => void change(event)}>
            <h3>Đổi mật khẩu</h3>
            <label>
              Mật khẩu hiện tại
              <input
                name="currentPassword"
                required
                type="password"
                autoComplete="current-password"
                maxLength={512}
                readOnly={challenge !== null}
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
            {challenge && (
              <label>
                Mã OTP
                <input
                  key={challenge.challengeId}
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </label>
            )}
            <p className="public-muted">
              Dùng 12–128 ký tự. Sau khi đổi, bạn cần đăng nhập lại trên các thiết bị.
            </p>
            <button
              className="public-button"
              disabled={pending || (!challenge && remaining > 0)}
              type="submit"
            >
              {challenge
                ? 'Xác nhận và cập nhật mật khẩu'
                : remaining > 0
                  ? `Thử lại sau ${waitLabel(remaining)}`
                  : 'Gửi mã OTP'}
            </button>
            {challenge && (
              <button
                type="button"
                disabled={pending || remaining > 0}
                onClick={() => void resend()}
              >
                {remaining > 0 ? `Gửi lại sau ${remaining}s` : 'Gửi lại mã OTP'}
              </button>
            )}
          </form>
        </div>
      ) : null}
    </section>
  );
}
