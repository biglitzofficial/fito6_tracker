import { z } from 'zod';

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

export const promotionSourceSchema = z
  .enum(PROMOTION_SOURCES)
  .or(z.literal(''))
  .optional();
