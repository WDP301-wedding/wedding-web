'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import type { InvitationDecoration } from './invitation-presentation';
import { InvitationOrnament } from './invitation-ornament';
import shared from './interactive-invitation.module.css';
import styles from './hinged-invitation.module.css';

const OPEN_ANGLE = 170;
const DRAG_THRESHOLD = 6;

export function HingedInvitation({
  decoration,
  cover,
  pages,
}: Readonly<{
  decoration: InvitationDecoration;
  cover: ReactNode;
  pages: readonly { title: string; content: ReactNode }[];
}>) {
  const [opened, setOpened] = useState(false);
  const frame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const [readAll, setReadAll] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const drag = useRef<{ id: number; x: number; width: number; moved: boolean } | null>(null);
  const restingAngle = opened ? OPEN_ANGLE : 0;
  const page = Math.min(pageIndex, pages.length - 1);

  function clearFrame() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      width: Math.max(1, event.currentTarget.clientWidth / 2),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const delta = current.x - event.clientX;
    if (Math.abs(delta) >= DRAG_THRESHOLD) current.moved = true;
    if (!current.moved) return;
    const scene = event.currentTarget;
    const angle = Math.min(
      OPEN_ANGLE,
      Math.max(0, restingAngle + (delta / current.width) * OPEN_ANGLE),
    );
    clearFrame();
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      scene.dataset.dragging = 'true';
      scene.style.setProperty('--leaf-angle', `${-angle}deg`);
      scene.style.setProperty('--card-shift', `${(angle / OPEN_ANGLE) * 50}%`);
    });
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    clearFrame();
    const scene = event.currentTarget;
    delete scene.dataset.dragging;
    scene.style.removeProperty('--leaf-angle');
    scene.style.removeProperty('--card-shift');
    if (event.type !== 'pointerup') return;
    const travel = (current.x - event.clientX) / current.width;
    if (current.moved) {
      if (Math.abs(travel) >= 0.25) setOpened(travel > 0);
    } else {
      setOpened(!opened);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={shared.toolbar}>
        <button type="button" aria-pressed={readAll} onClick={() => setReadAll(!readAll)}>
          {readAll ? 'Trở về thiệp tương tác' : 'Đọc toàn bộ nội dung'}
        </button>
        {!readAll && (
          <button type="button" aria-expanded={opened} onClick={() => setOpened(!opened)}>
            {opened ? 'Đóng thiệp' : 'Mở thiệp mời'}
          </button>
        )}
      </div>
      {!readAll && (
        <>
          <div
            className={styles.scene}
            data-open={opened}
            onPointerDown={startDrag}
            onPointerMove={updateDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onLostPointerCapture={finishDrag}
          >
            <div className={styles.card}>
              <div className={styles.face} aria-hidden={!opened}>
                <InvitationOrnament decoration={decoration} face="inside" />
                <div className={`${shared.paper} ${styles.faceContent}`}>{pages[1]?.content}</div>
              </div>
              <div className={styles.leaf}>
                <div className={`${styles.face} ${styles.front}`} aria-hidden={opened}>
                  <InvitationOrnament decoration={decoration} face="cover" />
                  {cover}
                </div>
                <div className={`${styles.face} ${styles.back}`} aria-hidden={!opened}>
                  <InvitationOrnament decoration={decoration} face="inside" />
                  <div className={`${shared.paper} ${styles.faceContent}`}>{pages[0]?.content}</div>
                </div>
              </div>
            </div>
          </div>
          <p className={styles.hint}>
            {opened ? 'Kéo bìa sang phải để đóng thiệp' : 'Kéo bìa sang trái để mở thiệp'}
          </p>
        </>
      )}
      {readAll ? (
        <div className={shared.readAll}>
          {pages.map((item) => (
            <section key={item.title} className={shared.paper}>
              {item.content}
            </section>
          ))}
        </div>
      ) : opened ? (
        <>
          <nav className={`${shared.pages} ${styles.pageNavigation}`} aria-label="Các trang thiệp">
            {pages.map((item, index) => (
              <button
                type="button"
                key={item.title}
                data-face-page={index < 2}
                aria-pressed={page === index}
                onClick={() => setPageIndex(index)}
              >
                {item.title}
              </button>
            ))}
          </nav>
          <section
            className={`${shared.paper} ${styles.readingPage}`}
            data-face-page={page < 2}
            aria-label={pages[page]?.title}
          >
            {pages[page]?.content}
          </section>
        </>
      ) : null}
    </div>
  );
}
