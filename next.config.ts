import type { NextConfig } from 'next';

import { legacyRedirects } from './src/routes';

/**
 * Chuyển tiếp (proxy) mọi request `/api/v1/*` của trình duyệt sang backend.
 *
 * Vì sao: cookie làm mới phiên `__Host-wedding-refresh` có SameSite=Lax, trình duyệt chỉ gửi
 * khi trang web và API cùng site. Gọi thẳng `*.up.railway.app` từ `localhost:3000` là khác
 * site → đăng nhập được nhưng hết 10 phút (hoặc F5) sẽ mất phiên. Qua proxy, trình duyệt chỉ
 * thấy `localhost:3000/api/v1`, cookie được gửi bình thường và không cần backend mở CORS.
 *
 * Khi deploy trên Vercel, `vercel.json` đã có rewrite tương đương nên biến này chỉ dùng cho local.
 * BACKEND_ORIGIN là biến phía server (không có tiền tố NEXT_PUBLIC_) nên không lộ ra trình duyệt.
 */
const backendOrigin = process.env.BACKEND_ORIGIN?.replace(/\/+$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Route cũ → route v2 (308). Danh sách nằm trong src/routes.ts để dùng chung với test.
  redirects() {
    return Promise.resolve(legacyRedirects.map((rule) => ({ ...rule, permanent: true })));
  },
  images: {
    // Ảnh catalog là signed URL của Supabase Storage (hết hạn sau 15 phút). Chỉ cho phép đúng
    // đường dẫn object của Storage để next/image không trở thành proxy ảnh mở cho mọi domain.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/**' },
    ],
    // Ảnh tối ưu được cache theo URL; URL đã ký đổi mỗi lần ISR làm mới nên giữ ngắn.
    minimumCacheTTL: 600,
  },
  rewrites() {
    if (!backendOrigin) return Promise.resolve([]);
    return Promise.resolve([
      { source: '/api/v1/:path*', destination: `${backendOrigin}/api/v1/:path*` },
    ]);
  },
};

export default nextConfig;
