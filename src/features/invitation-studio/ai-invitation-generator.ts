/**
 * AI Wedding Invitation Design Engine
 *
 * Chịu trách nhiệm phân tích prompt tự nhiên của người dùng hoặc các gợi ý phong cách (3 biến thể AI)
 * để tạo ra một bản thiết kế thiệp cưới hoàn chỉnh:
 * - Tiêu đề thiệp cuốn hút
 * - Tên cô dâu & chú rể (trích xuất thông minh từ prompt hoặc kế thừa hồ sơ)
 * - Lời mời mở đầu trang trọng
 * - Thông điệp tình yêu & lời nhắn ý nghĩa
 * - Lời kết và dặn dò ấm áp
 * - Phong cách & bảng màu (Theme, Khung viền nghệ thuật, Typography)
 */

export type CardThemeId =
  | 'royal-burgundy'
  | 'sage-minimalist'
  | 'blush-floral'
  | 'traditional-red'
  | 'celestial-navy'
  | 'champagne-luxury';

export interface GeneratedInvitationDesign {
  title: string;
  brideName: string;
  groomName: string;
  greeting: string;
  message: string;
  footer: string;
  theme: CardThemeId;
  themeName: string;
  badge: string;
  accentColor: string;
  summary: string;
}

export interface AiDesignPreset {
  id: CardThemeId;
  name: string;
  tagline: string;
  icon: string;
  badge: string;
  palette: readonly string[];
  description: string;
  design: GeneratedInvitationDesign;
}

/** 3 biến thể gợi ý chuẩn Enterprise từ AI */
export const AI_DESIGN_PRESETS: readonly AiDesignPreset[] = [
  {
    id: 'royal-burgundy',
    name: 'Hoàng Gia & Cổ Điển',
    tagline: 'Royal Burgundy & Gold',
    icon: '👑',
    badge: 'Sang trọng bậc nhất',
    palette: ['#7A1F3D', '#C9A46A', '#FFFDF9', '#4A1224'],
    description: 'Tone đỏ rượu vang quý phái kết hợp hoa văn chỉ vàng kim hoàng gia, câu chữ trang trọng, quyền quý.',
    design: {
      title: 'Thư Báo Hỷ · Dạ Tiệc Hoàng Gia',
      brideName: 'Lan Anh',
      groomName: 'Minh Quân',
      greeting: 'Trân trọng kính mời quý khách đến chung vui cùng gia đình chúng tôi',
      message:
        'Tình yêu là khởi đầu của một hành trình vĩnh cửu. Chúng tôi vô cùng hạnh phúc được đón tiếp những người thân yêu nhất đến chứng kiến khoảnh khắc hẹn ước thiêng liêng và chúc phúc cho tương lai chung đôi.',
      footer: 'Sự hiện diện của quý khách là niềm vinh hạnh to lớn đối với hai bên gia đình.',
      theme: 'royal-burgundy',
      themeName: 'Hoàng Gia & Cổ Điển',
      badge: 'Royal Burgundy',
      accentColor: '#C9A46A',
      summary: 'Phong cách quý phái với viền vàng ánh kim, typography uy nghiêm và lời mời trang trọng.',
    },
  },
  {
    id: 'sage-minimalist',
    name: 'Hiện Đại & Tối Giản',
    tagline: 'Sage Minimalist',
    icon: '🌿',
    badge: 'Tinh tế & Hiện đại',
    palette: ['#556B5D', '#A38368', '#F7F7F4', '#2C3E35'],
    description: 'Tone xanh xô thơm pastel thanh lịch, đường nét tinh giản mộc mạc, câu chữ nhẹ nhàng, sâu lắng.',
    design: {
      title: 'Save Our Date · Khoảnh Khắc Gắn Kết',
      brideName: 'Thảo Vy',
      groomName: 'Đức Huy',
      greeting: 'Kính mời quý khách tới tham dự buổi tiệc cưới thân mật',
      message:
        'Mộc mạc nhưng chân thành, dịu dàng như sớm mai. Dưới sự chứng kiến của những người bạn trân quý nhất, chúng tôi chính thức cùng nhau viết tiếp chương mới của cuộc đời với trọn vẹn tình yêu và niềm tin.',
      footer: 'Rất mong được đón tiếp bạn với tất cả nụ cười và sự ấm áp.',
      theme: 'sage-minimalist',
      themeName: 'Hiện Đại & Tối Giản',
      badge: 'Sage Minimalist',
      accentColor: '#556B5D',
      summary: 'Thiết kế thanh thoát với khung viền mộc mạc, câu chữ chân phương và bố cục phóng khoáng.',
    },
  },
  {
    id: 'blush-floral',
    name: 'Hoa Cỏ & Lãng Mạn',
    tagline: 'Blush Floral Romance',
    icon: '🌸',
    badge: 'Ngọt ngào bay bổng',
    palette: ['#D48B97', '#7E9F85', '#FFFBFB', '#8C3D52'],
    description: 'Tone hồng cánh đào dịu ngọt, họa tiết hoa lá mùa xuân tươi trẻ, văn phong lãng mạn như thơ ca.',
    design: {
      title: 'Ngày Chung Đôi · Giai Điệu Mùa Yêu',
      brideName: 'Mai Chi',
      groomName: 'Tuấn Kiệt',
      greeting: 'Thân thương gửi lời mời trân trọng nhất đến bạn và người thân',
      message:
        'Như ngàn đóa hoa mùa xuân khoe sắc rạng rỡ, tình yêu của chúng tôi đơm hoa kết trái trong sự yêu thương và chúc phúc. Hãy cùng chúng tôi hòa chung niềm hân hoan và lưu giữ những kỷ niệm ngọt ngào nhất.',
      footer: 'Trân trọng cảm ơn tình cảm và sự hiện diện quý báu của bạn trong ngày vui của hai đứa.',
      theme: 'blush-floral',
      themeName: 'Hoa Cỏ & Lãng Mạn',
      badge: 'Blush Floral',
      accentColor: '#D48B97',
      summary: 'Phong cách lãng mạn với hoa văn cánh đào, câu chúc ngọt ngào và tông màu ấm áp.',
    },
  },
];

/** Bảng tên mẫu trực quan tương ứng với từng phong cách khi người dùng chưa điền tên */
const SAMPLE_NAMES_BY_THEME: Record<CardThemeId, { bride: string; groom: string }> = {
  'royal-burgundy': { bride: 'Lan Anh', groom: 'Minh Quân' },
  'sage-minimalist': { bride: 'Thảo Vy', groom: 'Đức Huy' },
  'blush-floral': { bride: 'Mai Chi', groom: 'Tuấn Kiệt' },
  'traditional-red': { bride: 'Ngọc Mai', groom: 'Thành Đạt' },
  'celestial-navy': { bride: 'Huyền Trang', groom: 'Quang Dũng' },
  'champagne-luxury': { bride: 'Khánh Linh', groom: 'Hoàng Nam' },
};

const STOP_WORDS_FOR_NAMES = [
  'phong cách',
  'tone',
  'màu',
  'theme',
  'theo',
  'tại',
  'ở',
  'ngày',
  'chủ đề',
  'hãy',
  'giúp',
  'nội dung',
  'lời',
  'yêu cầu',
  'sang trọng',
  'lãng mạn',
  'tối giản',
  'hiện đại',
  'hoàng gia',
  'hoa cỏ',
  'truyền thống',
  'dạ tiệc',
  'champagne',
  'đỏ',
  'xanh',
  'vàng',
  'hồng',
  'trắng',
  'vintage',
  'rustic',
  'luxury',
];

function cleanName(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();
  for (const word of STOP_WORDS_FOR_NAMES) {
    const idx = str.toLowerCase().indexOf(' ' + word);
    if (idx !== -1) {
      str = str.slice(0, idx).trim();
    }
  }
  return str
    .replace(/\b(cô dâu|chú rể|cho|và|với|tiệc cưới|ngày)\b/gi, '')
    .trim()
    .slice(0, 40);
}

/**
 * Trích xuất tên cô dâu & chú rể từ văn bản tự nhiên của người dùng
 */
function extractNamesFromPrompt(
  prompt: string,
  fallbackBride: string,
  fallbackGroom: string,
): { bride: string; groom: string } {
  let bride = fallbackBride;
  let groom = fallbackGroom;

  // Pattern: "cô dâu [A] (và/với/&/+) chú rể [B]"
  const brideFirstMatch =
    /cô\s*dâu\s+([^,\n.]+?)(?:\s*(?:và|với|&|\+|,)\s*chú\s*rể\s+([^,\n.]+?))?(?:[.,;\n]|$)/i.exec(
      prompt,
    );
  if (brideFirstMatch) {
    const b = cleanName(brideFirstMatch[1] ?? '');
    const g = cleanName(brideFirstMatch[2] ?? '');
    if (b) bride = b;
    if (g) groom = g;
  }

  // Pattern: "chú rể [B] (và/với/&/+) cô dâu [A]"
  const groomFirstMatch =
    /chú\s*rể\s+([^,\n.]+?)(?:\s*(?:và|với|&|\+|,)\s*cô\s*dâu\s+([^,\n.]+?))?(?:[.,;\n]|$)/i.exec(
      prompt,
    );
  if (groomFirstMatch) {
    const g = cleanName(groomFirstMatch[1] ?? '');
    const b = cleanName(groomFirstMatch[2] ?? '');
    if (g) groom = g;
    if (b) bride = b;
  }

  // Pattern: "cho [B] (và|&|với) [A]"
  if (!bride && !groom) {
    const forMatch =
      /cho\s+([^\s,]+(?:\s+[^\s,]+){0,3})\s+(?:và|&|với)\s+([^\s,]+(?:\s+[^\s,]+){0,3})/i.exec(
        prompt,
      );
    if (forMatch && forMatch[1] && forMatch[2]) {
      const g = cleanName(forMatch[1]);
      const b = cleanName(forMatch[2]);
      if (g) groom = g;
      if (b) bride = b;
    }
  }

  return {
    bride: cleanName(bride),
    groom: cleanName(groom),
  };
}

/**
 * Suy luận phong cách thiệp cưới tự động từ tiêu đề hoặc nội dung thông điệp
 */
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
  if (
    text.includes('champagne') ||
    text.includes('giao hưởng') ||
    text.includes('nâng ly')
  ) {
    return 'champagne-luxury';
  }
  return fallback;
}

/**
 * Xử lý thông minh bất kỳ prompt tự do nào của người dùng thành thiết kế thiệp toàn diện
 */
export function generateDesignFromPrompt(
  prompt: string,
  currentContext: {
    currentBrideName?: string | undefined;
    currentGroomName?: string | undefined;
    hallName?: string | undefined;
    eventDate?: string | undefined;
  } = {},
): GeneratedInvitationDesign {
  const normalized = prompt.toLowerCase();
  const rawNames = extractNamesFromPrompt(
    prompt,
    currentContext.currentBrideName || '',
    currentContext.currentGroomName || '',
  );

  // 1. Nhận diện phong cách chủ đề (Theme Identification)
  let theme: CardThemeId = 'royal-burgundy';
  let themeName = 'Hoàng Gia & Cổ Điển';
  let badge = 'Royal Luxury';
  let accentColor = '#C9A46A';

  if (
    normalized.includes('truyền thống') ||
    normalized.includes('áo dài') ||
    normalized.includes('song hỷ') ||
    normalized.includes('đỏ thắm') ||
    normalized.includes('trầu cau') ||
    normalized.includes('á đông')
  ) {
    theme = 'traditional-red';
    themeName = 'Duyên Thắm Á Đông';
    badge = 'Truyền Thống May Mắn';
    accentColor = '#D4AF37';
  } else if (
    normalized.includes('tối giản') ||
    normalized.includes('hiện đại') ||
    normalized.includes('sage') ||
    normalized.includes('xanh') ||
    normalized.includes('ngoài trời') ||
    normalized.includes('mộc mạc') ||
    normalized.includes('rustic')
  ) {
    theme = 'sage-minimalist';
    themeName = 'Hiện Đại & Tối Giản';
    badge = 'Sage Minimalist';
    accentColor = '#556B5D';
  } else if (
    normalized.includes('hoa') ||
    normalized.includes('hồng') ||
    normalized.includes('lãng mạn') ||
    normalized.includes('ngọt ngào') ||
    normalized.includes('blush') ||
    normalized.includes('pastel') ||
    normalized.includes('mùa xuân')
  ) {
    theme = 'blush-floral';
    themeName = 'Hoa Cỏ & Lãng Mạn';
    badge = 'Blush Floral';
    accentColor = '#D48B97';
  } else if (
    normalized.includes('đêm') ||
    normalized.includes('dạ tiệc') ||
    normalized.includes('navy') ||
    normalized.includes('sao') ||
    normalized.includes('celestial') ||
    normalized.includes('huyền bí')
  ) {
    theme = 'celestial-navy';
    themeName = 'Dạ Ngân Hà Quý Phái';
    badge = 'Celestial Navy';
    accentColor = '#A8BBD1';
  } else if (
    normalized.includes('champagne') ||
    normalized.includes('vàng') ||
    normalized.includes('ấm áp') ||
    normalized.includes('nến') ||
    normalized.includes('thanh lịch')
  ) {
    theme = 'champagne-luxury';
    themeName = 'Champagne Thanh Lịch';
    badge = 'Champagne Gold';
    accentColor = '#D1B48C';
  }

  // Tên cô dâu chú rể: Nếu chưa có từ prompt và chưa có trong context, lấy tên mẫu đẹp theo theme
  const bride =
    rawNames.bride ||
    currentContext.currentBrideName?.trim() ||
    SAMPLE_NAMES_BY_THEME[theme].bride;
  const groom =
    rawNames.groom ||
    currentContext.currentGroomName?.trim() ||
    SAMPLE_NAMES_BY_THEME[theme].groom;

  // 2. Tự động sinh nội dung câu chữ phù hợp với phong cách được chọn
  let title: string;
  let greeting: string;
  let message: string;
  let footer: string;

  switch (theme) {
    case 'traditional-red':
      title = 'Thiệp Cưới Báo Hỷ · Duyên Thắm Trầu Cau';
      greeting = 'Hai gia đình trân trọng kính mời quý khách đến chung vui lễ thành hôn';
      message =
        'Trăm năm tình viên mãn, bạc đầu nghĩa phu thê. Ngày vui se duyên của hai con chúng tôi sẽ thêm phần trọn vẹn và ý nghĩa với những lời chúc phúc từ quý khách.';
      footer = 'Kính mời quý khách dành chút thời gian quý báu đến nâng ly mừng hạnh phúc.';
      break;

    case 'sage-minimalist':
      title = 'Save Our Date · Khoảnh Khắc Gắn Kết';
      greeting = 'Kính mời bạn tới tham dự buổi tiệc cưới thân mật';
      message =
        'Dưới bầu trời trong xanh và tiếng cười thân thuộc, chúng tôi trao nhau lời hẹn ước vĩnh cửu. Rất mong được đón tiếp bạn trong không gian ấm cúng và đầy ắp yêu thương.';
      footer = 'Trân trọng cảm ơn sự đồng hành và tình cảm quý mến của bạn.';
      break;

    case 'blush-floral':
      title = 'Ngày Chung Đôi · Giai Điệu Mùa Yêu';
      greeting = 'Thân thương gửi lời mời trân trọng nhất đến bạn và người thân';
      message =
        'Tình yêu đẹp như những đóa hoa nở rộ giữa mùa xuân. Khoảnh khắc chúng tôi chính thức thuộc về nhau sẽ đong đầy xúc cảm và ngọt ngào hơn khi có bạn ở bên.';
      footer = 'Sự hiện diện của bạn là món quà ấm áp và ý nghĩa nhất đối với chúng mình.';
      break;

    case 'celestial-navy':
      title = 'Thư Mời Báo Hỷ · Đêm Dạ Tiệc Ánh Sao';
      greeting = 'Trân trọng kính mời quý khách tham dự dạ tiệc chúc mừng lễ thành hôn';
      message =
        'Như những vì sao tìm thấy quỹ đạo của nhau, hai chúng tôi cùng bước vào hành trình mới. Kính mời quý khách cùng đắm mình trong không gian dạ tiệc lộng lẫy và tràn ngập niềm vui.';
      footer = 'Rất hân hạnh được đón tiếp quý khách trong đêm tiệc đặc biệt này.';
      break;

    case 'champagne-luxury':
      title = 'Thư Báo Hỷ · Bản Giao Hưởng Hạnh Phúc';
      greeting = 'Kính mời quý khách đến tham dự buổi tiệc mừng lễ thành hôn';
      message =
        'Nâng ly rượu nồng mừng khoảnh khắc đôi tim hòa chung một nhịp. Sự hiện diện và lời chúc phúc của quý khách là khởi đầu hoàn hảo nhất cho tổ ấm tương lai của chúng tôi.';
      footer = 'Kính chúc quý khách có một buổi tiệc trọn vẹn và đáng nhớ.';
      break;

    case 'royal-burgundy':
    default:
      title = 'Thư Báo Hỷ · Dạ Tiệc Hoàng Gia';
      greeting = 'Trân trọng kính mời quý khách đến dự tiệc mừng lễ thành hôn';
      message =
        'Tình yêu là khởi đầu của một hành trình vĩnh cửu. Chúng tôi vô cùng hạnh phúc được đón tiếp những người thân yêu nhất đến chứng kiến khoảnh khắc hẹn ước thiêng liêng và chúc phúc cho tương lai chung đôi.';
      footer = 'Sự hiện diện của quý khách là niềm vinh hạnh to lớn đối với hai bên gia đình.';
      break;
  }

  // 3. Tùy biến chi tiết nếu người dùng chỉ định rõ ràng trong prompt
  // Tiêu đề riêng (nếu có: tiêu đề: ..., tên thiệp: ...)
  const titleMatch =
    /(?:tiêu đề|tựa đề|tên thiệp)[:\s]+["“'‘]?([^"”'’\n.,;]{4,80})["”'’]?/i.exec(prompt);
  if (titleMatch?.[1]?.trim()) {
    title = titleMatch[1].trim();
  }

  // Lời mời riêng (nếu có: lời mời: ..., mở đầu: ...)
  const greetingMatch =
    /(?:lời mời|mở đầu)[:\s]+["“'‘]?([^"”'’\n.,;]{4,120})["”'’]?/i.exec(prompt);
  if (greetingMatch?.[1]?.trim()) {
    greeting = greetingMatch[1].trim();
  }

  // Lời kết riêng (nếu có: lời kết: ..., cuối thiệp: ..., dặn dò: ...)
  const footerMatch =
    /(?:lời kết|cuối thiệp|dặn dò)[:\s]+["“'‘]?([^"”'’\n]{4,150})["”'’]?/i.exec(prompt);
  if (footerMatch?.[1]?.trim()) {
    footer = footerMatch[1].trim();
  }

  // Thông điệp / lời chúc riêng (nếu có đoạn trích dẫn ngoặc kép hoặc sau nhãn "lời chúc/lời nhắn/thông điệp")
  let customWish: string | null = null;
  const quoteMatch = /["“'‘]([^"”'’]{6,150})["”'’]/.exec(prompt);
  if (quoteMatch?.[1]?.trim()) {
    customWish = quoteMatch[1].trim();
  } else {
    const labelMatch =
      /(?:lời chúc|lời nhắn|thông điệp|câu chúc)[:\s]+([^.,;\n]{6,150})/i.exec(prompt);
    if (labelMatch?.[1]?.trim()) {
      customWish = labelMatch[1].trim();
    }
  }

  if (customWish) {
    message = `${message} "${customWish}"`;
  }

  return {
    title,
    brideName: bride,
    groomName: groom,
    greeting,
    message,
    footer,
    theme,
    themeName,
    badge,
    accentColor,
    summary: `Thiết kế tùy biến tự động từ mô tả của bạn theo phong cách ${themeName}.`,
  };
}

