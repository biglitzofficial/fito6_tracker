export const PROMOTION_SOURCES = [
  'Unknown',
  'Walk in',
  'Google Ads',
  'Facebook',
  'Instagram',
  'Banner',
  'Member Referral',
  'Phone',
] as const;

export type PromotionSource = (typeof PROMOTION_SOURCES)[number];

export const DEFAULT_PROMOTION_SOURCE: PromotionSource = 'Unknown';

export function isPromotionSource(value: string): value is PromotionSource {
  return (PROMOTION_SOURCES as readonly string[]).includes(value);
}
