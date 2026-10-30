import { z } from 'zod';
export const uuid = z.string().uuid('identifiant invalide');
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date attendue au format AAAA-MM-JJ')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'date invalide');
