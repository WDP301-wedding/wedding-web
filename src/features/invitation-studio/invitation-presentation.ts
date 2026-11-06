import { z } from 'zod';
const motifSchema = z.enum([
  'peony',
  'lotus',
  'botanical',
  'art-deco',
  'celestial',
  'orchid',
  'cloud',
  'ginkgo',
  'phoenix',
  'magnolia',
  'bamboo',
  'song-hy',
  'lace',
  'wildflower',
]);
const compositionSchema = z.enum(['diagonal', 'crown', 'border', 'botanical-corners', 'medallion']);
const densitySchema = z.enum(['subtle', 'ornate']);
const decorationSchema = z.object({
  coverMotif: motifSchema,
  insideMotif: motifSchema,
  frame: z.enum(['double-line', 'arch', 'corners', 'scalloped', 'inset']),
  finish: z.enum(['letterpress', 'gold-foil', 'silk', 'embossed-cotton', 'pearl', 'linen']),
  coverComposition: compositionSchema.optional(),
  insideComposition: compositionSchema.optional(),
  coverDensity: densitySchema.optional(),
  insideDensity: densitySchema.optional(),
});
export type InvitationDecoration = z.infer<typeof decorationSchema>;
export const presentationSchema = z.object({
  version: z.literal(1),
  theme: z.enum([
    'royal-burgundy',
    'sage-minimalist',
    'blush-floral',
    'traditional-red',
    'celestial-navy',
    'champagne-luxury',
  ]),
  layout: z.enum(['envelope', 'gatefold', 'album']),
  decoration: decorationSchema.optional(),
});
export type InvitationPresentation = z.infer<typeof presentationSchema>;
export const DEFAULT_PRESENTATION: InvitationPresentation = {
  version: 1,
  theme: 'royal-burgundy',
  layout: 'envelope',
};
export const DESIGN_LAYOUTS = [
  { id: 'envelope', label: 'Phong bì mở thiệp' },
  { id: 'gatefold', label: 'Thiệp mở hai cánh' },
  { id: 'album', label: 'Album ảnh lật trang' },
] as const;
export const suggestionSchema = z.object({
  presentation: presentationSchema,
  title: z.string().min(1).max(120),
  greeting: z.string().max(300),
  message: z.string().max(2000),
  footer: z.string().max(500),
});
export type DesignSuggestion = z.infer<typeof suggestionSchema>;
