import type { NextConfig } from 'next';

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
  rewrites() {
    if (!backendOrigin) return Promise.resolve([]);
    return Promise.resolve([
      { source: '/api/v1/:path*', destination: `${backendOrigin}/api/v1/:path*` },
    ]);
  },
};

export default nextConfig;
