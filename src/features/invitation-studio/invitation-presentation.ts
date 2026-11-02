import { z } from 'zod';
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
