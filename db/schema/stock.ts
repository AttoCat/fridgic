import { sqliteTable, text } from 'void/schema-d1';

export const stockLots = sqliteTable('stock_lots', {
  id: text('id').primaryKey(),
  foodName: text('food_name').notNull(),
  category: text('category').notNull(),
  location: text('location').notNull(),
  status: text('status').notNull(),
  quantityText: text('quantity_text').notNull(),
  expiresOn: text('expires_on'),
  expiryType: text('expiry_type'),
  expirySource: text('expiry_source').notNull(),
  purchaseItemId: text('purchase_item_id'),
  memo: text('memo'),
  endedAt: text('ended_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
