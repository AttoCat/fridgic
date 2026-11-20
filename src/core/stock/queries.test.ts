import { stockLots } from '@schema';
import { describe, expect, it } from 'vitest';
import { parseCalendarDate, parseInstant } from '@lib/clock';
import type { Database } from '../../infrastructure/db';
import { InvariantViolationError, StockLotNotFoundError, type StockLotId } from './domain';
import { findLotById, getLotById } from './queries';

type Row = typeof stockLots.$inferSelect;

const row: Row = {
  id: 'lot-id',
  foodName: 'りんご',
  category: 'vegetable',
  location: 'fridge',
  status: 'full',
  quantityText: '1個',
  expiresOn: '2026-11-20',
  expiryType: 'use_by',
  expirySource: 'estimated',
  purchaseItemId: null,
  memo: null,
  endedAt: null,
  createdAt: '2026-11-19T15:30:00Z',
  updatedAt: '2026-11-19T15:30:00Z',
};

const databaseReturning = (rows: Row[]): Database =>
  ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => rows }),
      }),
    }),
  }) as unknown as Database;

const id = row.id as StockLotId;

describe('getLotById', () => {
  it('見つかった行をStockLotに復元して返す', async () => {
    expect(await getLotById(databaseReturning([row]), id)).toEqual({
      ...row,
      expiresOn: parseCalendarDate(row.expiresOn!),
      createdAt: parseInstant(row.createdAt),
      updatedAt: parseInstant(row.updatedAt),
    });
  });

  it('見つからない場合は対象IDを含むStockLotNotFoundErrorを投げる', async () => {
    await expect(getLotById(databaseReturning([]), id)).rejects.toThrow(
      new StockLotNotFoundError(id),
    );
  });

  it('復元時の検証エラーをStockLotNotFoundErrorに置き換えずに伝播する', async () => {
    await expect(
      getLotById(databaseReturning([{ ...row, endedAt: row.updatedAt }]), id),
    ).rejects.toThrow(InvariantViolationError);
  });
});

describe('findLotById', () => {
  it('DBの文字列日時を復元してStockLotを返す', async () => {
    expect(await findLotById(databaseReturning([row]), id)).toEqual({
      ...row,
      expiresOn: parseCalendarDate(row.expiresOn!),
      createdAt: parseInstant(row.createdAt),
      updatedAt: parseInstant(row.updatedAt),
    });
  });

  it('見つからない場合はnullを返す', async () => {
    expect(await findLotById(databaseReturning([]), id)).toBeNull();
  });

  it('DBに不明なステータスが入っていた場合は拒否する', async () => {
    await expect(
      findLotById(databaseReturning([{ ...row, status: 'unknown' }]), id),
    ).rejects.toThrow();
  });

  it('ステータスと終了日時が矛盾している場合は拒否する', async () => {
    await expect(
      findLotById(databaseReturning([{ ...row, endedAt: row.updatedAt }]), id),
    ).rejects.toThrow(InvariantViolationError);
  });
});
