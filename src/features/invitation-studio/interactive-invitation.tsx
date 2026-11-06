'use client';

import { useCallback, useId, useState } from 'react';
import { AnimatePresence, LazyMotion, domMax, m, useReducedMotion } from 'motion/react';
import type { InvitationContent } from './invitation-content';
import { DEFAULT_PRESENTATION } from './invitation-presentation';
import { InvitationOrnament } from './invitation-ornament';
import ornamentStyles from './invitation-ornament.module.css';
import { HingedInvitation } from './hinged-invitation';
import styles from './interactive-invitation.module.css';
import { buildInvitationPages, InvitationCoverContent } from './invitation-pages';

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
  const pages = buildInvitationPages(invitation, apiBase, recipientGreeting);
  const page = Math.min(pageIndex, pages.length - 1);
  if (presentation.layout === 'album' && presentation.decoration) {
    return (
      <div className={styles.invitation} data-theme={presentation.theme} data-layout="album">
        <HingedInvitation
          decoration={presentation.decoration}
          cover={
            <InvitationCoverContent
              invitation={invitation}
              apiBase={apiBase}
              {...(recipientGreeting ? { recipientGreeting } : {})}
            />
          }
          pages={pages}
        />
      </div>
    );
  }
  const decoration = presentation.decoration;
  const decoratedPaper = `${styles.paper} ${ornamentStyles.printInterior}`;
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
            {pages.map((item, index) => (
              <section
                key={item.title}
                className={decoration && index < 2 ? decoratedPaper : styles.paper}
              >
                {decoration && index < 2 ? (
                  <InvitationOrnament decoration={decoration} face="inside" />
                ) : null}
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
                  {decoration ? <InvitationOrnament decoration={decoration} face="cover" /> : null}
                  <InvitationCoverContent
                    invitation={invitation}
                    apiBase={apiBase}
                    {...(recipientGreeting ? { recipientGreeting } : {})}
                  >
                    {' '}
                    <button
                      type="button"
                      className={styles.openButton}
                      onClick={() => setOpened(true)}
                    >
                      Mở thiệp mời
                    </button>
                  </InvitationCoverContent>
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
                        className={decoration && page < 2 ? decoratedPaper : styles.paper}
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
                        {decoration && page < 2 ? (
                          <InvitationOrnament decoration={decoration} face="inside" />
                        ) : null}
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
