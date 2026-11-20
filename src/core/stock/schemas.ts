import { z } from 'zod';
import { CATEGORIES, EXPIRY_SOURCES, EXPIRY_TYPES, LOCATIONS, STATUSES } from './constants';

export const StockLotSnapshot = z.object({
  id: z.string().min(1),
  foodName: z.string().min(1),
  category: z.enum(CATEGORIES),
  location: z.enum(LOCATIONS),
  status: z.enum(STATUSES),
  quantityText: z.string().min(1),
  expiresOn: z.string().nullable(),
  expiryType: z.enum(EXPIRY_TYPES).nullable(),
  expirySource: z.enum(EXPIRY_SOURCES),
  purchaseItemId: z.string().nullable(),
  memo: z.string().nullable(),
  endedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type StockLotSnapshot = z.infer<typeof StockLotSnapshot>;
