import { PublicIdentityPage } from '../../src/features/identity-access/identity-page';

/** T2 · Quên mật khẩu (OTP qua email). Link cũ /reset-password#… chuyển hướng 308 về đây. */
export default function ForgotPasswordPage() {
  return <PublicIdentityPage startView="reset-request" />;
}
