import { PublicIdentityPage } from '../../src/features/identity-access/identity-page';

/**
 * T3 · Nhận lời mời vào không gian cưới: `/loi-moi#invitationToken=…`.
 * Mã nằm trong #fragment (không gửi lên server, không lọt vào log), trang đọc rồi xoá ngay.
 * Prototype ghi `/loi-moi/[token]` nhưng đưa mã vào đường dẫn sẽ lộ trong log/Referer nên không làm.
 */
export default function InvitationPage() {
  return <PublicIdentityPage />;
}
