'use client';

import { useCallback, useId, useState } from 'react';
import { AnimatePresence, LazyMotion, domMax, m, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import type { InvitationContent } from './invitation-content';
import { InvitationSeatingView } from './invitation-seating-view';
import { DEFAULT_PRESENTATION } from './invitation-presentation';
import styles from './interactive-invitation.module.css';

/** The editor and published guest link use this same declarative renderer. */
export function InteractiveInvitation({
  invitation,
  apiBase,
  recipientGreeting,
}: Readonly<{
  invitation: InvitationContent;
  apiBase: string;
  recipientGreeting?: string;
}>) {
  const [opened, setOpened] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [readAll, setReadAll] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const focusOpened = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);
  const presentation = invitation.presentation ?? DEFAULT_PRESENTATION;
  const text = invitation.textFields;
  const event = invitation.event;
  const eventDate = event
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(event.eventDate + 'T00:00:00Z'),
      )
    : null;
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
  const page = Math.min(pageIndex, pages.length - 1);
  const duration = reduceMotion ? 0 : 0.38;
  return (
    <LazyMotion features={domMax} strict>
      <div
        className={styles.invitation}
        data-theme={presentation.theme}
        data-layout={presentation.layout}
      >
        <div className={styles.toolbar}>
          <button
            type="button"
            onClick={() => setReadAll((value) => !value)}
            aria-pressed={readAll}
          >
            {readAll ? 'Trở về thiệp tương tác' : 'Đọc toàn bộ nội dung'}
          </button>
          {opened && !readAll ? (
            <button
              type="button"
              onClick={() => {
                setOpened(false);
                setPageIndex(0);
              }}
            >
              Đóng thiệp
            </button>
          ) : null}
        </div>
        {readAll ? (
          <div className={styles.readAll}>
            {pages.map((item) => (
              <section key={item.title} className={styles.paper}>
                {item.content}
              </section>
            ))}
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait" initial={false}>
              {!opened ? (
                <m.div
                  key="cover"
                  className={styles.cover}
                  exit={{
                    rotateX: presentation.layout === 'envelope' ? -65 : 0,
                    rotateY: presentation.layout === 'album' ? -75 : 0,
                    opacity: 0,
                  }}
                  transition={{ duration }}
                  style={{ transformOrigin: presentation.layout === 'envelope' ? 'top' : 'left' }}
                >
                  {presentation.layout === 'gatefold' ? (
                    <>
                      <m.span
                        className={styles.leftDoor}
                        aria-hidden="true"
                        exit={{ rotateY: -110 }}
                        transition={{ duration }}
                      />
                      <m.span
                        className={styles.rightDoor}
                        aria-hidden="true"
                        exit={{ rotateY: 110 }}
                        transition={{ duration }}
                      />
                    </>
                  ) : (
                    <div className={styles.envelopeFlap} aria-hidden="true" />
                  )}
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
                    <button
                      type="button"
                      className={styles.openButton}
                      onClick={() => setOpened(true)}
                    >
                      Mở thiệp mời
                    </button>
                  </div>
                </m.div>
              ) : (
                <m.div
                  key="opened"
                  ref={focusOpened}
                  tabIndex={-1}
                  role="region"
                  aria-label="Nội dung thiệp mời"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration }}
                >
                  <nav className={styles.pages} aria-label="Các trang thiệp">
                    {pages.map((item, index) => (
                      <button
                        type="button"
                        key={item.title}
                        aria-pressed={index === page}
                        aria-controls={panelId}
                        onClick={() => setPageIndex(index)}
                      >
                        {item.title}
                      </button>
                    ))}
                  </nav>
                  <div className={styles.stage}>
                    <AnimatePresence mode="wait" initial={false}>
                      <m.section
                        id={panelId}
                        key={page}
                        className={styles.paper}
                        initial={{
                          rotateY: presentation.layout === 'gatefold' ? -65 : 75,
                          opacity: 0,
                        }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: -55, opacity: 0 }}
                        transition={{ duration, ease: 'easeInOut' }}
                        style={{
                          transformOrigin: presentation.layout === 'gatefold' ? 'center' : 'left',
                        }}
                        onPanEnd={(_event, info) => {
                          if (Math.abs(info.offset.x) > 70 && Math.abs(info.offset.y) < 45)
                            setPageIndex((current) =>
                              Math.max(
                                0,
                                Math.min(pages.length - 1, current + (info.offset.x < 0 ? 1 : -1)),
                              ),
                            );
                        }}
                      >
                        {pages[page]?.content}
                      </m.section>
                    </AnimatePresence>
                  </div>
                  <div className={styles.navigation}>
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPageIndex(page - 1)}
                      aria-controls={panelId}
                    >
                      Trang trước
                    </button>
                    <span role="status" aria-live="polite">
                      {page + 1} / {pages.length} · {pages[page]?.title}
                    </span>
                    <button
                      type="button"
                      disabled={page === pages.length - 1}
                      onClick={() => setPageIndex(page + 1)}
                      aria-controls={panelId}
                    >
                      Trang sau
                    </button>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </LazyMotion>
  );
}
