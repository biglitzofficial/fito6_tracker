export const GENDERS = ['Male', 'Female', 'Other'] as const;

export type Gender = (typeof GENDERS)[number];
