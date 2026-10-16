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
          <article className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-[#D4AF37]/30 overflow-hidden p-8 sm:p-12 text-center">
            <header className="mb-8">
              <p className="text-xs   text-[#879883] mb-2 font-medium">Thiệp Cưới Báo Hỷ</p>
              <div className="h-0.5 w-16 bg-[#D4AF37] mx-auto mb-4" />
              <h1 className="text-3xl sm:text-4xl  text-[#1E3A2F] font-bold">{title}</h1>
            </header>

            {invitation.assets.map((asset) => (
              <Image
                key={asset.url}
                src={new URL(asset.url, apiBase).href}
                alt="Hình ảnh thiệp cưới"
                width={asset.width}
                height={asset.height}
                unoptimized
              />
            ))}
            {recipientGreeting ? (
              <p className="text-base font-semibold text-[#1E3A2F]">{recipientGreeting}</p>
            ) : null}
            <section className="my-8 space-y-4">
              <p className="text-lg italic text-[#556952]">
                {textFields.greeting ?? 'Trân trọng kính mời quý khách'}
              </p>
              <div className="text-2xl  text-[#1E3A2F] py-4 border-y border-[#E8E4D9]">
                <span>{textFields.groomName ?? 'Chú Rể'}</span>
                <span className="mx-3 text-[#D4AF37] font-sans">&amp;</span>
                <span>{textFields.brideName ?? 'Cô Dâu'}</span>
              </div>
              <p className="text-sm text-[#879883]">
                {textFields.message ?? 'Đến tham dự buổi tiệc chung vui cùng gia đình chúng tôi'}
              </p>
            </section>

            {event && (
              <section className="mt-8 bg-[#FDFBF7] border border-[#D4AF37]/20 p-5 rounded-xl text-sm text-[#2C3E2D] space-y-1.5 text-left">
                <p className="font-semibold text-[#1E3A2F]  text-xs  mb-2 text-center">
                  Thời Gian &amp; Địa Điểm Tiệc Cưới
                </p>
                <div className="flex justify-between border-b border-[#E8E4D9] pb-1">
                  <span className="text-[#879883]">Ngày tổ chức:</span>
                  <span className="font-medium text-[#1E3A2F]">{event.eventDate}</span>
                </div>
                <div className="flex justify-between border-b border-[#E8E4D9] pb-1">
                  <span className="text-[#879883]">Sảnh tiệc:</span>
                  <span className="font-medium text-[#1E3A2F]">{event.hallName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#879883]">Buổi tiệc:</span>
                  <span className="font-medium text-[#1E3A2F]">
                    {event.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}
                  </span>
                </div>
              </section>
            )}

            {timeline && timeline.length > 0 && (
              <section className="mt-6 text-left">
                <h2 className="text-xs font-semibold text-[#1E3A2F]   mb-3 text-center">
                  Chương Trình Tiệc Cưới
                </h2>
                <div className="space-y-2">
                  {timeline.map((item) => (
                    <div key={item.order} className="flex gap-3 text-xs text-[#2C3E2D]">
                      <span className="font-mono font-medium text-[#D4AF37]">{item.startTime}</span>
                      <span className="font-medium text-[#1E3A2F]">{item.title}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {textFields.footer && (
              <footer className="mt-8 pt-4 text-xs text-[#879883] border-t border-[#E8E4D9]">
                {textFields.footer}
              </footer>
            )}
          </article>
        </div>
      </main>
    </div>
  );
}
