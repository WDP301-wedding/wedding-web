import styles from './invitation.module.css';

import Image from 'next/image';

/** Các trường thiệp cần để hiển thị (chung cho thiệp công khai và thiệp cá nhân của Guest). */
export type InvitationContent = Readonly<{
  title: string;
  textFields: Readonly<{
    brideName?: string;
    groomName?: string;
    greeting?: string;
    message?: string;
    footer?: string;
  }>;
  event: Readonly<{ eventDate: string; hallName: string; shiftCode: 'LUNCH' | 'DINNER' }>;
  timeline: readonly Readonly<{ order: number; startTime: string; title: string }>[];
  assets: readonly Readonly<{ url: string; width: number; height: number }>[];
}>;

/**
 * Giao diện thiệp chỉ đọc. Guest không có nút RSVP hay check-in (đã loại khỏi nghiệp vụ).
 * `recipientGreeting` chỉ có ở thiệp cá nhân.
 */
export function PublicInvitationView({
  invitation,
  apiBase,
  recipientGreeting,
}: Readonly<{ invitation: InvitationContent; apiBase: string; recipientGreeting?: string }>) {
  const { title, textFields, event, timeline } = invitation;
  return (
    <div className="v0-workspace">
      <main className={styles.shell}>
        <div className="public-invitation-layout">
          <Image
            className="public-invitation-photo"
            src={
              invitation.assets[0]
                ? new URL(invitation.assets[0].url, apiBase).href
                : '/images/v0-wedding-venue.png'
            }
            alt={invitation.assets[0] ? 'Hình ảnh đã xuất bản trên thiệp' : 'Ảnh sân vườn minh họa'}
            width={1000}
            height={1200}
            unoptimized
          />
          <article className="hy-invite-card">
            <header className="hy-invite-head">
              <p className="hy-invite-overline">Thiệp cưới báo hỷ</p>
              <span className="hy-invite-rule" aria-hidden="true" />
              <h1>{title}</h1>
            </header>

            {invitation.assets.map((asset) => (
              <Image
                key={asset.url}
                className="hy-invite-asset"
                src={new URL(asset.url, apiBase).href}
                alt="Hình ảnh thiệp cưới"
                width={asset.width}
                height={asset.height}
                unoptimized
              />
            ))}
            {recipientGreeting ? <p className="hy-invite-recipient">{recipientGreeting}</p> : null}
            <section className="hy-invite-names">
              <p className="hy-invite-greeting">
                {textFields.greeting ?? 'Trân trọng kính mời quý khách'}
              </p>
              <p className="hy-invite-couple">
                <span>{textFields.groomName ?? 'Chú Rể'}</span>
                <span className="hy-invite-amp" aria-hidden="true">
                  &amp;
                </span>
                <span className="visually-hidden"> và </span>
                <span>{textFields.brideName ?? 'Cô Dâu'}</span>
              </p>
              <p className="hy-invite-message">
                {textFields.message ?? 'Đến tham dự buổi tiệc chung vui cùng gia đình chúng tôi'}
              </p>
            </section>

            {event && (
              <section className="hy-invite-event">
                <p className="hy-invite-section-title">Thời gian &amp; địa điểm tiệc cưới</p>
                <dl>
                  <div>
                    <dt>Ngày tổ chức</dt>
                    <dd>{event.eventDate}</dd>
                  </div>
                  <div>
                    <dt>Sảnh tiệc</dt>
                    <dd>{event.hallName}</dd>
                  </div>
                  <div>
                    <dt>Buổi tiệc</dt>
                    <dd>{event.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}</dd>
                  </div>
                </dl>
              </section>
            )}

            {timeline && timeline.length > 0 && (
              <section className="hy-invite-timeline">
                <h2 className="hy-invite-section-title">Chương trình tiệc cưới</h2>
                <ol>
                  {timeline.map((item) => (
                    <li key={item.order}>
                      <time>{item.startTime}</time>
                      <span>{item.title}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {textFields.footer && <footer className="hy-invite-footer">{textFields.footer}</footer>}
          </article>
        </div>
      </main>
    </div>
  );
}
