import type { InvitationDecoration } from './invitation-presentation';

/** Kiểu dữ liệu thiết kế thiệp và 3 phong cách gợi ý sẵn cho trợ lý AI. */

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
  decoration?: InvitationDecoration;
}

export interface AiDesignPreset {
  id: CardThemeId;
  name: string;
  tagline: string;
  badge: string;
  palette: readonly string[];
  description: string;
  design: GeneratedInvitationDesign;
}

/** Curated designs available without requesting AI generation. */

const extraPresets = [
  {
    id: 'traditional-red',
    name: 'Song hỷ truyền thống',
    tagline: 'Chữ hỷ và vân mây',
    badge: 'Ép kim',
    palette: ['#8b2025', '#a97732', '#fff6eb', '#44191c'],
    decoration: {
      coverMotif: 'song-hy',
      insideMotif: 'cloud',
      frame: 'inset',
      finish: 'gold-foil',
      coverComposition: 'medallion',
      insideComposition: 'border',
      coverDensity: 'ornate',
      insideDensity: 'subtle',
    },
    description: 'Chữ hỷ nổi bật trên bìa, mặt trong viền mây nhẹ.',
  },
  {
    id: 'celestial-navy',
    name: 'Đêm sao',
    tagline: 'Trăng và hình học',
    badge: 'Lụa',
    palette: ['#243252', '#7d6c42', '#f8faff', '#1b2438'],
    decoration: {
      coverMotif: 'celestial',
      insideMotif: 'art-deco',
      frame: 'arch',
      finish: 'silk',
      coverComposition: 'medallion',
      insideComposition: 'diagonal',
      coverDensity: 'subtle',
      insideDensity: 'subtle',
    },
    description: 'Huy hiệu trăng sao và khung vòm trên nền xanh đêm.',
  },
  {
    id: 'champagne-luxury',
    name: 'Ren trên giấy cotton',
    tagline: 'Ren và hoa mộc lan',
    badge: 'Dập nổi',
    palette: ['#5b4831', '#927342', '#fffcf5', '#3e2f1d'],
    decoration: {
      coverMotif: 'lace',
      insideMotif: 'magnolia',
      frame: 'scalloped',
      finish: 'embossed-cotton',
      coverComposition: 'crown',
      insideComposition: 'diagonal',
      coverDensity: 'subtle',
      insideDensity: 'subtle',
    },
    description: 'Ren viền mềm và vân giấy cotton, mặt trong trang trí hoa mộc lan.',
  },
] as const;

export const AI_DESIGN_PRESETS: readonly AiDesignPreset[] = [
  {
    id: 'royal-burgundy',
    name: 'Hoàng Gia & Cổ Điển',
    tagline: 'Royal Burgundy & Gold',
    badge: 'Sang trọng bậc nhất',
    palette: ['#7A1F3D', '#C9A46A', '#FFFDF9', '#4A1224'],
    description:
      'Tone đỏ rượu vang quý phái kết hợp hoa văn chỉ vàng kim hoàng gia, câu chữ trang trọng, quyền quý.',
    design: {
      title: 'Thư Báo Hỷ · Dạ Tiệc Hoàng Gia',
      brideName: '',
      groomName: '',
      greeting: 'Trân trọng kính mời quý khách đến chung vui cùng gia đình chúng tôi',
      message:
        'Tình yêu là khởi đầu của một hành trình vĩnh cửu. Chúng tôi vô cùng hạnh phúc được đón tiếp những người thân yêu nhất đến chứng kiến khoảnh khắc hẹn ước thiêng liêng và chúc phúc cho tương lai chung đôi.',
      footer: 'Sự hiện diện của quý khách là niềm vinh hạnh to lớn đối với hai bên gia đình.',
      theme: 'royal-burgundy',
      decoration: {
        coverMotif: 'phoenix',
        insideMotif: 'song-hy',
        frame: 'inset',
        finish: 'gold-foil',
        coverComposition: 'medallion',
        insideComposition: 'border',
        coverDensity: 'ornate',
        insideDensity: 'subtle',
      },
      themeName: 'Hoàng Gia & Cổ Điển',
      badge: 'Royal Burgundy',
      accentColor: '#C9A46A',
      summary:
        'Phong cách quý phái với viền vàng ánh kim, typography uy nghiêm và lời mời trang trọng.',
    },
  },
  {
    id: 'sage-minimalist',
    name: 'Hiện Đại & Tối Giản',
    tagline: 'Sage Minimalist',
    badge: 'Tinh tế & Hiện đại',
    palette: ['#556B5D', '#A38368', '#F7F7F4', '#2C3E35'],
    description:
      'Tone xanh xô thơm pastel thanh lịch, đường nét tinh giản mộc mạc, câu chữ nhẹ nhàng, sâu lắng.',
    design: {
      title: 'Save Our Date · Khoảnh Khắc Gắn Kết',
      brideName: '',
      groomName: '',
      greeting: 'Kính mời quý khách tới tham dự buổi tiệc cưới thân mật',
      message:
        'Mộc mạc nhưng chân thành, dịu dàng như sớm mai. Dưới sự chứng kiến của những người bạn trân quý nhất, chúng tôi chính thức cùng nhau viết tiếp chương mới của cuộc đời với trọn vẹn tình yêu và niềm tin.',
      footer: 'Rất mong được đón tiếp bạn với tất cả nụ cười và sự ấm áp.',
      theme: 'sage-minimalist',
      decoration: {
        coverMotif: 'bamboo',
        insideMotif: 'ginkgo',
        frame: 'corners',
        finish: 'linen',
        coverComposition: 'botanical-corners',
        insideComposition: 'diagonal',
        coverDensity: 'subtle',
        insideDensity: 'subtle',
      },
      themeName: 'Hiện Đại & Tối Giản',
      badge: 'Sage Minimalist',
      accentColor: '#556B5D',
      summary:
        'Thiết kế thanh thoát với khung viền mộc mạc, câu chữ chân phương và bố cục phóng khoáng.',
    },
  },
  {
    id: 'blush-floral',
    name: 'Hoa Cỏ & Lãng Mạn',
    tagline: 'Blush Floral Romance',
    badge: 'Ngọt ngào bay bổng',
    palette: ['#D48B97', '#7E9F85', '#FFFBFB', '#8C3D52'],
    description:
      'Tone hồng cánh đào dịu ngọt, họa tiết hoa lá mùa xuân tươi trẻ, văn phong lãng mạn như thơ ca.',
    design: {
      title: 'Ngày Chung Đôi · Giai Điệu Mùa Yêu',
      brideName: '',
      groomName: '',
      greeting: 'Thân thương gửi lời mời trân trọng nhất đến bạn và người thân',
      message:
        'Như ngàn đóa hoa mùa xuân khoe sắc rạng rỡ, tình yêu của chúng tôi đơm hoa kết trái trong sự yêu thương và chúc phúc. Hãy cùng chúng tôi hòa chung niềm hân hoan và lưu giữ những kỷ niệm ngọt ngào nhất.',
      footer:
        'Trân trọng cảm ơn tình cảm và sự hiện diện quý báu của bạn trong ngày vui của hai đứa.',
      theme: 'blush-floral',
      decoration: {
        coverMotif: 'magnolia',
        insideMotif: 'wildflower',
        frame: 'scalloped',
        finish: 'pearl',
        coverComposition: 'botanical-corners',
        insideComposition: 'crown',
        coverDensity: 'ornate',
        insideDensity: 'subtle',
      },
      themeName: 'Hoa Cỏ & Lãng Mạn',
      badge: 'Blush Floral',
      accentColor: '#D48B97',
      summary: 'Phong cách lãng mạn với hoa văn cánh đào, câu chúc ngọt ngào và tông màu ấm áp.',
    },
  },
  ...extraPresets.map(({ decoration, ...preset }): AiDesignPreset => ({
    ...preset,
    design: {
      title: 'Thiệp mời cưới',
      brideName: '',
      groomName: '',
      greeting: 'Trân trọng kính mời',
      message: 'Mong bạn đến chung vui cùng hai gia đình trong ngày cưới của chúng tôi.',
      footer: 'Hân hạnh đón tiếp',
      theme: preset.id,
      themeName: preset.name,
      badge: preset.badge,
      accentColor: preset.palette[1],
      summary: preset.description,
      decoration,
    },
  })),
];
