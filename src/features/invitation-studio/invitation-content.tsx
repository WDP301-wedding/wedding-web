import Image from 'next/image';

export type InvitationEvent = Readonly<{
  eventDate: string;
  hallName: string;
  shiftCode: 'LUNCH' | 'DINNER';
  startTime?: string;
}>;
export type InvitationText = Readonly<{
  brideName?: string;
  groomName?: string;
  greeting?: string;
  message?: string;
  footer?: string;
}>;
export type InvitationSection = Readonly<{
  kind: 'HERO' | 'MESSAGE' | 'EVENT' | 'TIMELINE' | 'SEATING' | 'FOOTER';
  textKey: keyof InvitationText | null;
  imageUrl: string | null;
}>;
export type InvitationContent = Readonly<{
  title: string;
  textFields: InvitationText;
  event: InvitationEvent | null;
  timeline: readonly Readonly<{
    order: number;
    startTime: string;
    title: string;
    description?: string | null;
  }>[];
  sections?: readonly InvitationSection[];
  assets: readonly Readonly<{ url: string; width: number; height: number }>[];
}>;

/** Shared renderer for editable preview and the immutable published response. */
export function InvitationContents({
  invitation,
  apiBase,
  recipientGreeting,
}: Readonly<{ invitation: InvitationContent; apiBase: string; recipientGreeting?: string }>) {
  const { title, textFields: text, event, timeline, assets } = invitation;
  const configured = invitation.sections ?? [];
  const kinds = ['HERO', 'MESSAGE', 'EVENT', 'TIMELINE', 'FOOTER'] as const;
  const sections: readonly InvitationSection[] = [
    ...configured,
    ...kinds
      .filter((kind) => !configured.some((section) => section.kind === kind))
      .map((kind) => ({ kind, textKey: null, imageUrl: null })),
  ];
  const assigned = new Set(sections.map((section) => section.imageUrl));
  const photo = (url: string, key: string) => {
    const asset = assets.find((item) => item.url === url);
    return (
      <Image
        key={key}
        className="hy-invite-asset"
        src={new URL(url, apiBase).href}
        alt="Hình ảnh thiệp cưới"
        width={asset?.width ?? 800}
        height={asset?.height ?? 600}
        unoptimized
      />
    );
  };
  const date = event
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(event.eventDate + 'T00:00:00Z'),
      )
    : null;
  return (
    <>
      <header id="hy-invite-sec-header" className="hy-invite-head">
        <p className="hy-invite-overline">Thiệp cưới báo hỷ</p>
        <h1>{title}</h1>
      </header>
      {recipientGreeting ? <p className="hy-invite-recipient">{recipientGreeting}</p> : null}
      {sections.map((section, index) => (
        <section
          key={index}
          id={'hy-invite-sec-' + section.kind.toLowerCase()}
          className={'hy-invite-' + section.kind.toLowerCase()}
        >
          {section.imageUrl ? photo(section.imageUrl, 'image') : null}
          {section.textKey ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{text[section.textKey]}</p>
          ) : null}
          {section.kind === 'HERO' &&
          sections.findIndex((item) => item.kind === 'HERO') === index ? (
            <>
              {section.textKey !== 'greeting' ? <p>{text.greeting}</p> : null}
              <p className="hy-invite-couple">
                <span>{text.groomName || 'Chưa bổ sung tên chú rể'}</span>
                <span aria-hidden="true"> &amp; </span>
                <span>{text.brideName || 'Chưa bổ sung tên cô dâu'}</span>
              </p>
            </>
          ) : null}
          {section.kind === 'MESSAGE' && section.textKey !== 'message' ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{text.message}</p>
          ) : null}
          {section.kind === 'EVENT' ? (
            <>
              <h2>Thời gian và địa điểm</h2>
              {event ? (
                <dl>
                  <div>
                    <dt>Ngày tổ chức</dt>
                    <dd>{date}</dd>
                  </div>
                  <div>
                    <dt>Sảnh tiệc</dt>
                    <dd>{event.hallName}</dd>
                  </div>
                  <div>
                    <dt>Buổi tiệc</dt>
                    <dd>
                      {event.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}
                      {event.startTime ? ' · ' + event.startTime : ''}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p>Đang chờ thông tin tiệc từ hồ sơ.</p>
              )}
            </>
          ) : null}
          {section.kind === 'TIMELINE' && timeline.length ? (
            <>
              <h2>Chương trình tiệc cưới</h2>
              <ol>
                {[...timeline]
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <li key={item.order}>
                      <time>{item.startTime}</time> {item.title}
                      {item.description ? (
                        <p style={{ whiteSpace: 'pre-wrap' }}>{item.description}</p>
                      ) : null}
                    </li>
                  ))}
              </ol>
            </>
          ) : null}
          {section.kind === 'SEATING' && !section.imageUrl ? (
            <p>
              Sơ đồ bàn chưa có hình ảnh trong nội dung xuất bản này. Vui lòng liên hệ người tổ chức
              để được hướng dẫn chỗ ngồi.
            </p>
          ) : null}
          {section.kind === 'FOOTER' && section.textKey !== 'footer' && text.footer ? (
            <footer style={{ whiteSpace: 'pre-wrap' }}>{text.footer}</footer>
          ) : null}
        </section>
      ))}
      {assets
        .filter((asset) => !assigned.has(asset.url))
        .map((asset) => photo(asset.url, asset.url))}
    </>
  );
}
