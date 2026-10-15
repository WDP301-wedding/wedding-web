'use client';
import { useEffect, useState } from 'react';

/**
 * Hiệu ứng "cánh hoa" chúc mừng (motion spec Hỷ Yến: ≤ 1,2 giây, chạy một lần).
 *
 * - Chỉ trang trí: `aria-hidden`, không chặn thao tác (pointer-events: none).
 * - `onceKey` lưu vào sessionStorage để tải lại trang không chạy lại hiệu ứng.
 * - Người dùng bật "giảm chuyển động" → không render gì.
 */
const petals = Array.from({ length: 14 }, (_, index) => index);

function alreadyShown(key: string): boolean {
  try {
    return sessionStorage.getItem('hy.celebrate.' + key) === '1';
  } catch {
    return false;
  }
}

export function Celebrate({ onceKey }: { onceKey: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduce || alreadyShown(onceKey)) return;
    try {
      sessionStorage.setItem('hy.celebrate.' + onceKey, '1');
    } catch {
      // Không lưu được thì vẫn chạy hiệu ứng một lần trong lần hiển thị này.
    }
    queueMicrotask(() => setVisible(true));
    const timer = window.setTimeout(() => setVisible(false), 1400);
    return () => window.clearTimeout(timer);
  }, [onceKey]);
  if (!visible) return null;
  return (
    <div className="hy-celebrate" aria-hidden="true">
      {petals.map((index) => (
        <span key={index} style={{ ['--i' as string]: index }} />
      ))}
    </div>
  );
}
