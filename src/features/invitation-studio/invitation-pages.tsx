import { InvitationFamily } from './invitation-family';
import type { ReactNode } from 'react';
import Image from 'next/image';
import type { InvitationContent } from './invitation-content';
import { InvitationSeatingView } from './invitation-seating-view';
import { DEFAULT_PRESENTATION } from './invitation-presentation';
import { formatDate } from '../../lib/format-date';
import styles from './interactive-invitation.module.css';

function invitationImages(invitation: InvitationContent, apiBase: string) {
  const image = (url: string, index: number) => {
    const asset = invitation.assets.find((a) => a.url === url);
    return (
      <Image
        key={url + index}
        className={styles.photo}
        src={new URL(url, apiBase).href}
        alt="Ảnh trên thiệp cưới"
        width={asset?.width ?? 800}
        height={asset?.height ?? 600}
        unoptimized
      />
    );
  };
  const urls = [
    ...new Set([
      ...invitation.assets.map((a) => a.url),
      ...(invitation.sections ?? []).flatMap((s) => (s.imageUrl ? [s.imageUrl] : [])),
    ]),
  ];
  return { image, urls };
}

/** One source for the editor, guest reading pages and retained print document. */
export function buildInvitationPages(
  invitation: InvitationContent,
  apiBase: string,
  recipientGreeting?: string,
) {
  const presentation = invitation.presentation ?? DEFAULT_PRESENTATION;
  const text = invitation.textFields;
  const event = invitation.event;
  const eventDate = event ? formatDate(event.eventDate) : null;
  const { image, urls } = invitationImages(invitation, apiBase);
  const pages = [
    {
      title: 'Lời mời',
      content: (
        <>
          <p className={styles.eyebrow}>{text.greeting}</p>
          <h2>{invitation.title}</h2>
          <p className={styles.names}>
            {text.groomName || 'Chưa bổ sung tên chú rể'}
            <span>&amp;</span>
            {text.brideName || 'Chưa bổ sung tên cô dâu'}
          </p>
          {recipientGreeting ? <p className={styles.recipient}>{recipientGreeting}</p> : null}
          <InvitationFamily names={text} />
          <p className={styles.message}>{text.message}</p>
          {presentation.layout === 'album' && urls[0] ? image(urls[0], 0) : null}
        </>
      ),
    },
    {
      title: 'Buổi tiệc',
      content: (
        <>
          <p className={styles.eyebrow}>Ngày vui của chúng tôi</p>
          <h2>Thời gian & địa điểm</h2>
          {event ? (
            <dl className={styles.facts}>
              <div>
                <dt>Ngày tổ chức</dt>
                <dd>{eventDate}</dd>
              </div>
              <div>
                <dt>Buổi tiệc</dt>
                <dd>
                  {event.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'}
                  {event.startTime ? ' · ' + event.startTime : ''}
                </dd>
              </div>
              <div>
                <dt>Sảnh tiệc</dt>
                <dd>{event.hallName}</dd>
              </div>
            </dl>
          ) : (
            <p>Đang chờ thông tin chính thức từ hồ sơ tiệc.</p>
          )}
          {text.footer ? <p className={styles.message}>{text.footer}</p> : null}
        </>
      ),
    },
    ...(invitation.timeline.length
      ? [
          {
            title: 'Chương trình',
            content: (
              <>
                <h2>Chương trình tiệc cưới</h2>
                <ol className={styles.timeline}>
                  {[...invitation.timeline]
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <li key={item.order}>
                        <time>{item.startTime}</time>
                        <div>
                          <strong>{item.title}</strong>
                          {item.description ? <p>{item.description}</p> : null}
                        </div>
                      </li>
                    ))}
                </ol>
              </>
            ),
          },
        ]
      : []),
    ...(urls.length
      ? [
          {
            title: 'Hình ảnh',
            content: (
              <>
                <h2>Khoảnh khắc của chúng tôi</h2>
                <div className={styles.gallery}>{urls.map(image)}</div>
              </>
            ),
          },
        ]
      : []),
    ...(invitation.seating
      ? [{ title: 'Sơ đồ bàn', content: <InvitationSeatingView tables={invitation.seating} /> }]
      : []),
    ...((invitation.sections ?? []).some((s) => s.kind === 'SEATING') && !invitation.seating
      ? [
          {
            title: 'Chỗ ngồi',
            content: (
              <>
                <h2>Thông tin chỗ ngồi</h2>
                <p>Vui lòng liên hệ người tổ chức để được hướng dẫn chỗ ngồi.</p>
              </>
            ),
          },
        ]
      : []),
  ];
  return pages;
}

export function InvitationCoverContent({
  invitation,
  apiBase,
  recipientGreeting,
  children,
}: Readonly<{
  invitation: InvitationContent;
  apiBase: string;
  recipientGreeting?: string;
  children?: ReactNode;
}>) {
  const presentation = invitation.presentation ?? DEFAULT_PRESENTATION;
  const text = invitation.textFields;
  const event = invitation.event;
  const eventDate = event ? formatDate(event.eventDate) : null;
  const { image, urls } = invitationImages(invitation, apiBase);
  return (
    <div className={styles.coverContent}>
      <p className={styles.eyebrow}>Trân trọng kính mời</p>
      <h1>{invitation.title}</h1>
      <p className={styles.coverNames}>
        {text.groomName || 'Tên chú rể'}
        <span>&amp;</span>
        {text.brideName || 'Tên cô dâu'}
      </p>
      {eventDate ? <p>{eventDate}</p> : null}
      {recipientGreeting ? <p>{recipientGreeting}</p> : null}
      {presentation.layout === 'album' && urls[0] ? image(urls[0], 0) : null}
      {children}
    </div>
  );
}
