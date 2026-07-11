import { z } from 'zod';

export const GENDERS = ['Male', 'Female', 'Other'] as const;

export type Gender = (typeof GENDERS)[number];

export const genderSchema = z.enum(GENDERS).or(z.literal('')).optional();
