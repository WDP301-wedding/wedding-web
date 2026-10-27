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
const backendHostname = (() => {
  try {
    return backendOrigin ? new URL(backendOrigin).hostname : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Socket.IO connects directly to the backend, independently of HTTP rewrites.
  env: {
    NEXT_PUBLIC_REALTIME_URL:
      process.env.NEXT_PUBLIC_REALTIME_URL || (backendOrigin ? new URL(backendOrigin).origin : ''),
  },
  // Route cũ → route v2 (308). Danh sách nằm trong src/routes.ts để dùng chung với test.
  redirects() {
    return Promise.resolve(legacyRedirects.map((rule) => ({ ...rule, permanent: true })));
  },
  images: {
    // Signed media URLs: restrict optimization to the exact storage object paths.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/**' },
      {
        protocol: 'https',
        hostname: 'wedding-be-render-trial.onrender.com',
        pathname: '/api/v1/storage/objects/**',
      },
      {
        protocol: 'https',
        hostname: '*.up.railway.app',
        pathname: '/api/v1/storage/objects/**',
      },
      ...(backendHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: backendHostname,
              pathname: '/api/v1/storage/objects/**',
            },
          ]
        : []),
    ],
    formats: ['image/avif', 'image/webp'],
    // Lưu cache ảnh đã tối ưu trong 7 ngày tại Next.js / Edge để giảm tải cho backend
    minimumCacheTTL: 86400 * 7,
  },
  rewrites() {
    if (!backendOrigin) return Promise.resolve([]);
    return Promise.resolve([
      { source: '/api/v1/:path*', destination: `${backendOrigin}/api/v1/:path*` },
    ]);
  },
};

export default nextConfig;
