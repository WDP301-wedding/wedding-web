/* eslint-disable @next/next/no-img-element -- Fallback cho ảnh không thuộc Supabase Storage (next/image chỉ nhận host đã khai báo). */
import Image from 'next/image';

import { BrandMark } from '../../design-system/brand-mark';

type Media = Readonly<{ signedUrl: string; alternativeText: string }>;

/** Đúng mẫu `images.remotePatterns` trong next.config.ts. */
const optimizable = (url: string) => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.startsWith('/storage/v1/object/')
    );
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
 * - `priority` cho ảnh đầu trang (LCP) để trình duyệt tải sớm.
 * - Không có ảnh → khung placeholder có logo, cùng kích thước.
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
  if (!media)
    return (
      <div className={`${className} hy-media-empty`}>
        <BrandMark compact />
        <span>{placeholder}</span>
      </div>
    );
  return (
    <div className={className}>
      {optimizable(media.signedUrl) ? (
        <Image
          src={media.signedUrl}
          alt={media.alternativeText}
          fill
          sizes={sizes}
          priority={priority}
        />
      ) : (
        <img
          src={media.signedUrl}
          alt={media.alternativeText}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
    </div>
  );
}
