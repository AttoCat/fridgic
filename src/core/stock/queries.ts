import { stockLots } from '@schema';
import { eq, inArray } from 'void/db';
import type { Database } from '../../infrastructure/db';
import { fromSnapshot, StockLotNotFoundError, type StockLot, type StockLotId } from './domain';
import { StockLotSnapshot } from './schemas';

function toDomain(row: typeof stockLots.$inferSelect): StockLot {
  return fromSnapshot(StockLotSnapshot.parse(row));
}

export const findLotById = async (db: Database, id: StockLotId): Promise<StockLot | null> => {
  const rows = await db.select().from(stockLots).where(eq(stockLots.id, id)).limit(1);

  return rows[0] ? toDomain(rows[0]) : null;
};

export const findLotsByIds = async (db: Database, ids: Array<StockLotId>) => {
  if (ids.length === 0) return [];

  const rows = await db.select().from(stockLots).where(inArray(stockLots.id, ids));

  return rows.map((row) => fromSnapshot(StockLotSnapshot.parse(row)));
};

export const getLotById = async (db: Database, id: StockLotId): Promise<StockLot> => {
  const lot = await findLotById(db, id);

  if (!lot) {
    throw new StockLotNotFoundError(id);
  }

  return lot;
};
