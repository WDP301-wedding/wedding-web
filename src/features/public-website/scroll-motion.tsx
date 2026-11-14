'use client';

import { useEffect } from 'react';

/**
 * Bật hiệu ứng "hiện dần khi cuộn tới" cho mọi phần tử có `data-reveal` trên trang, và vẽ thanh
 * tiến trình cuộn. Kiểu chuyển động nằm trong app/ui-v3.css (mục "Hệ thống chuyển động").
 *
 * Một IntersectionObserver dùng chung thay cho scroll listener: trình duyệt tự báo khi phần tử
 * vào khung nhìn, không phải đo vị trí ở mỗi lần cuộn. Chỉ phần tử còn nằm dưới màn hình lúc trang
 * mở mới bị ẩn chờ (data-pending) → nội dung đang thấy không bị chớp, và nếu JavaScript không chạy
 * thì không có gì bị ẩn.
 */
export function ScrollMotion() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.removeAttribute('data-pending');
          entry.target.setAttribute('data-shown', '');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    const targets = [...document.querySelectorAll('[data-reveal]')];
    for (const target of targets) {
      if (target.getBoundingClientRect().top < window.innerHeight) continue;
      target.setAttribute('data-pending', '');
      observer.observe(target);
    }
    return () => {
      observer.disconnect();
      for (const target of targets) target.removeAttribute('data-pending');
    };
  }, []);

  return (
    <div
      className="hy-progress pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-hy-wine"
      aria-hidden="true"
    />
  );
}
