// src/core/stock/constants.ts

export const LOCATIONS = ['fridge', 'freezer', 'veggie', 'room'] as const;
export type Location = (typeof LOCATIONS)[number];

export const CATEGORIES = [
  'meat_fish',
  'vegetable',
  'dairy_egg',
  'tofu_natto',
  'drink',
  'seasoning',
  'prepared',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ['full', 'half', 'low', 'closed', 'voided'] as const;
export type StockStatus = (typeof STATUSES)[number];

export const ACTIVE_STATUSES = ['full', 'half', 'low'] as const satisfies readonly StockStatus[];
export type ActiveStockStatus = (typeof ACTIVE_STATUSES)[number];

// 終了の経緯はイベントで区別し、誤登録の無効化は voided で表す。
export const ENDED_STATUSES = ['closed', 'voided'] as const satisfies readonly StockStatus[];

export const EVENT_TYPES = [
  'purchase',
  'split',
  'adjust',
  'consume',
  'move',
  'discard', // 通常の操作
  'void',
  'undo',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const DISCARD_REASONS = ['expired', 'spoiled', 'leftover', 'other'] as const;
export type DiscardReason = (typeof DISCARD_REASONS)[number];

export const ADJUST_REASONS = [
  'forgot_to_record',
  'consumption_mistake',
  'count_error',
  'unknown_depletion',
] as const;
export type AdjustReason = (typeof ADJUST_REASONS)[number];

export const EXPIRY_TYPES = ['use_by', 'best_before'] as const;
export type ExpiryType = (typeof EXPIRY_TYPES)[number];

export const EXPIRY_SOURCES = ['estimated', 'user_input'] as const;
export type ExpirySource = (typeof EXPIRY_SOURCES)[number];
