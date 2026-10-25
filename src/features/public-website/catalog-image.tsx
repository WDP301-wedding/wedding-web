'use client';

/* eslint-disable @next/next/no-img-element -- Fallback cho ảnh khi không tối ưu hoá được qua next/image */
import Image from 'next/image';
import { useState } from 'react';

import { BrandMark } from '../../design-system/brand-mark';

type Media = Readonly<{ signedUrl: string; alternativeText: string }>;

/** Đúng mẫu `images.remotePatterns` trong next.config.ts. */
const optimizable = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    // Supabase storage
    if (
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.startsWith('/storage/v1/object/')
    ) {
      return true;
    }
    // Render storage
    if (
      parsed.hostname === 'wedding-be-render-trial.onrender.com' &&
      parsed.pathname.startsWith('/api/v1/storage/objects/')
    ) {
      return true;
    }
    // Railway storage
    if (
      parsed.hostname.endsWith('.up.railway.app') &&
      parsed.pathname.startsWith('/api/v1/storage/objects/')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Ảnh catalog (sảnh, thực đơn, nhà hàng).
 *
 * - Dùng `next/image` với khung cố định (`fill` + `sizes`): Next tự sinh ảnh WebP/AVIF đúng
 *   kích thước màn hình, lazy-load ảnh dưới màn hình, và khung giữ chỗ trước nên trang không
 *   bị "nhảy" khi ảnh tải xong (CLS = 0).
 * - Tự động thử tải lại sau 1s nếu server lưu trữ đang cold-start hoặc mạng chập chờn.
 * - Không có ảnh hoặc lỗi vĩnh viễn → khung placeholder có logo, cùng kích thước.
 */
export function CatalogImage({
  media,
  sizes,
  priority = false,
  placeholder,
  className = 'hy-media',
}: Readonly<{
  media: Media | undefined;
  sizes: string;
  priority?: boolean;
  placeholder: string;
  className?: string;
}>) {
  const [prevUrl, setPrevUrl] = useState(media?.signedUrl);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [loaded, setLoaded] = useState(false);

  if (media?.signedUrl !== prevUrl) {
    setPrevUrl(media?.signedUrl);
    setFailed(false);
    setRetryKey(0);
    setLoaded(false);
  }

  if (!media || failed)
    return (
      <div className={`${className} hy-media-empty`}>
        <BrandMark compact />
        <span>{placeholder}</span>
      </div>
    );

  const canOptimize = optimizable(media.signedUrl);

  const handleError = () => {
    if (retryKey < 2) {
      // Exponential backoff: lần 1 sau 1000ms, lần 2 sau 2000ms (khi máy chủ storage cold-start)
      const delay = (retryKey + 1) * 1000;
      setTimeout(() => {
        setRetryKey((k) => k + 1);
      }, delay);
    } else {
      setFailed(true);
    }
  };

  const imageStyle: React.CSSProperties = {
    transition: 'opacity 300ms ease-in-out',
    opacity: loaded ? 1 : 0.4,
  };

  return (
    <div className={className}>
      {canOptimize ? (
        <Image
          key={`${media.signedUrl}-${retryKey}`}
          src={media.signedUrl}
          alt={media.alternativeText}
          fill
          sizes={sizes}
          priority={priority}
          style={imageStyle}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      ) : (
        <img
          key={`${media.signedUrl}-${retryKey}`}
          src={media.signedUrl}
          alt={media.alternativeText}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={imageStyle}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}
    </div>
  );
}
