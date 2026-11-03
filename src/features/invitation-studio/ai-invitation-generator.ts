import type { CardThemeId } from './ai-design-presets';

/** Compatibility palette inference for legacy published invitations only. */
export function inferThemeFromContent(
  title?: string,
  message?: string,
  fallback: CardThemeId = 'royal-burgundy',
): CardThemeId {
  const text = `${title || ''} ${message || ''}`.toLowerCase();
  if (
    text.includes('truyền thống') ||
    text.includes('áo dài') ||
    text.includes('trầu cau') ||
    text.includes('duyên thắm') ||
    text.includes('đỏ thắm') ||
    text.includes('thành hôn')
  ) {
    return 'traditional-red';
  }
  if (
    text.includes('tối giản') ||
    text.includes('sage') ||
    text.includes('khoảnh khắc gắn kết') ||
    text.includes('mộc mạc') ||
    text.includes('thân mật')
  ) {
    return 'sage-minimalist';
  }
  if (
    text.includes('hoa cỏ') ||
    text.includes('blush') ||
    text.includes('lãng mạn') ||
    text.includes('blossom') ||
    text.includes('giai điệu mùa yêu') ||
    text.includes('chung đôi')
  ) {
    return 'blush-floral';
  }
  if (
    text.includes('dạ tiệc') ||
    text.includes('ánh sao') ||
    text.includes('ngân hà') ||
    text.includes('celestial') ||
    text.includes('navy')
  ) {
    return 'celestial-navy';
  }
  if (text.includes('champagne') || text.includes('giao hưởng') || text.includes('nâng ly')) {
    return 'champagne-luxury';
  }
  return fallback;
}
