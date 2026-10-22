'use client';

import { useSyncExternalStore } from 'react';

/** Màn hình đủ rộng + người dùng không yêu cầu giảm chuyển động. */
const query = '(min-width: 720px) and (prefers-reduced-motion: no-preference)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function shouldPlay(): boolean {
  // Chế độ tiết kiệm dữ liệu (Chrome/Android): không tự tải video 1,8 MB.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return window.matchMedia(query).matches && connection?.saveData !== true;
}

/**
 * Video nền cho hero trang chủ (assets/hero/Hero.mp4, đã nén còn WebM ~1,3 MB / MP4 ~1,8 MB, không tiếng).
 *
 * Chỉ render <video> ở trình duyệt khi điều kiện phù hợp (useSyncExternalStore: server luôn trả
 * `false` → HTML ban đầu chỉ có ảnh nền, không lệch hydration). Điện thoại / giảm chuyển động /
 * tiết kiệm dữ liệu → giữ ảnh nền tĩnh, không tải video.
 * `aria-hidden`: video chỉ trang trí, nội dung chính là chữ và form ước tính.
 */
export function HeroVideo() {
  const play = useSyncExternalStore(subscribe, shouldPlay, () => false);
  if (!play) return null;
  return (
    <video
      className="hy-hero-video"
      poster="/images/hero-sanh-tiec-poster.webp"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
    >
      {/* Trình duyệt chọn nguồn đầu tiên phát được: WebM/VP9 nhẹ hơn (~1,3 MB) và chạy cả trên
          Chromium không có H.264; MP4/H.264 (~1,8 MB) cho Safari. */}
      <source src="/videos/hero-sanh-tiec.webm" type="video/webm" />
      <source src="/videos/hero-sanh-tiec.mp4" type="video/mp4" />
    </video>
  );
}
