import localFont from 'next/font/local';

/**
 * Font tự host qua `next/font/local` (thay cho `@import` Google Fonts trong CSS).
 *
 * Vì sao:
 * - `@import` trong CSS chặn render: trình duyệt phải tải CSS → thấy @import → gọi sang
 *   fonts.googleapis.com → rồi mới tải file font (3 vòng mạng, khác domain).
 * - `next/font` đưa file font vào bundle của web, tự thêm `<link rel="preload">`, đặt
 *   `font-display: swap` và sinh font dự phòng đã chỉnh kích thước (size-adjust) nên chữ
 *   không "nhảy" khi font thật tải xong (giảm CLS).
 * - File woff2 trong `app/fonts/` đã được cắt (subset) chỉ còn Latin + tiếng Việt (~36 KB/độ đậm).
 *   Giấy phép SIL OFL đi kèm cùng thư mục.
 *
 * Tên font do next/font sinh ra có hash, nên token trong `globals.css` vẫn giữ nguyên chuỗi
 * 'Be Vietnam Pro', … (bị test typography khoá); `app/fonts.css` đặt biến `--font-vn` lên đầu.
 */
export const beVietnamPro = localFont({
  src: [
    { path: './fonts/be-vietnam-pro-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/be-vietnam-pro-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/be-vietnam-pro-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/be-vietnam-pro-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-vn',
  display: 'swap',
  fallback: ['Segoe UI', 'Arial', 'sans-serif'],
});

/** Chỉ chứa 2 ký tự "HY" cho monogram (.latin-wordmark) – khoảng 1 KB. */
export const playfairWordmark = localFont({
  src: './fonts/playfair-display-wordmark.woff2',
  weight: '400 900',
  variable: '--font-wordmark-face',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});
