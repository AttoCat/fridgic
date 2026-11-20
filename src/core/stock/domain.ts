import { CalendarDate, Instant, isAfter, parseCalendarDate, parseInstant } from '@lib/clock';
import { Id } from '@lib/id';
import {
  ACTIVE_STATUSES,
  ActiveStockStatus,
  Category,
  ExpirySource,
  ExpiryType,
  Location,
  StockStatus,
} from './constants';
import { StockLotSnapshot } from './schemas';
import { validateTransition } from './transition';

export type StockLotId = Id<'StockLot'>;

export type StockLotBase = Readonly<{
  id: StockLotId;
  foodName: string;
  category: Category;
  location: Location;
  status: StockStatus;
  quantityText: string;
  expiresOn: CalendarDate | null;
  expiryType: ExpiryType | null;
  expirySource: ExpirySource;
  purchaseItemId: string | null;
  memo: string | null;
  endedAt: Instant | null;
  createdAt: Instant;
  updatedAt: Instant;
}>;

type ActiveStockLot = StockLotBase &
  Readonly<{
    status: ActiveStockStatus;
    endedAt: null;
  }>;

type EndedStockLot = StockLotBase &
  Readonly<{
    status: 'closed' | 'voided';
    endedAt: Instant;
  }>;

type VoidedStockLot = EndedStockLot & {
  readonly status: 'voided';
};

export type StockLot = ActiveStockLot | EndedStockLot;

export type CreateLotInput = Readonly<{
  id: StockLotId;
  foodName: string;
  category: Category;
  location: Location;
  status: ActiveStockStatus;
  quantityText: string;
  expiresOn: CalendarDate | null;
  expiryType: ExpiryType | null;
  expirySource: ExpirySource;
  purchaseItemId: string | null;
  memo: string | null;
}>;

export const createLot = (input: CreateLotInput, occurredAt: Instant): StockLot => {
  return checked({
    ...input,
    endedAt: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  });
};
export type ConsumeInput =
  | Readonly<{
      status: 'closed';
    }>
  | Readonly<{
      quantityText: string;
      status: ActiveStockStatus;
    }>;

export const consumeLot = (lot: StockLot, input: ConsumeInput, occurredAt: Instant): StockLot => {
  validateTransition('consume', lot.status, input.status);
  if (input.status === 'closed') {
    return checked({
      ...lot,
      status: 'closed',
      quantityText: '0',
      endedAt: occurredAt,
      updatedAt: occurredAt,
    });
  }
  return checked({
    ...lot,
    status: input.status,
    quantityText: input.quantityText,
    endedAt: null,
    updatedAt: occurredAt,
  });
};

export const discardLot = (lot: StockLot, occurredAt: Instant): StockLot => {
  validateTransition('discard', lot.status, 'closed');
  return checked({
    ...lot,
    status: 'closed',
    quantityText: '0',
    endedAt: occurredAt,
    updatedAt: occurredAt,
  });
};

type AdjustInput =
  | Readonly<{
      status: ActiveStockStatus;
      quantityText: string;
    }>
  | Readonly<{
      status: 'closed';
    }>;

export const adjustLot = (lot: StockLot, input: AdjustInput, occurredAt: Instant): StockLot => {
  validateTransition('adjust', lot.status, input.status);
  if (input.status === 'closed') {
    return checked({
      ...lot,
      status: 'closed',
      quantityText: '0',
      endedAt: occurredAt,
      updatedAt: occurredAt,
    });
  }
  return checked({
    ...lot,
    status: input.status,
    quantityText: input.quantityText,
    endedAt: null,
    updatedAt: occurredAt,
  });
};

export type SplitLotInput = Readonly<{
  source: {
    status: ActiveStockStatus;
    quantityText: string;
  };
  child: {
    id: StockLotId;
    status: ActiveStockStatus;
    quantityText: string;
    location: Location;
    expiresOn: CalendarDate | null;
    expiryType: ExpiryType | null;
    expirySource: ExpirySource;
  };
}>;

export const splitLot = (
  lot: StockLot,
  input: SplitLotInput,
  occurredAt: Instant,
): {
  remaining: StockLot;
  extracted: StockLot;
} => {
  validateTransition('split', lot.status, input.source.status);

  const remaining = checked({
    ...lot,
    status: input.source.status,
    quantityText: input.source.quantityText,
    updatedAt: occurredAt,
  });

  const extracted = createLot(
    {
      id: input.child.id,
      foodName: lot.foodName,
      category: lot.category,
      location: input.child.location,
      status: input.child.status,
      quantityText: input.child.quantityText,
      expiresOn: input.child.expiresOn,
      expiryType: input.child.expiryType,
      expirySource: input.child.expirySource,
      purchaseItemId: lot.purchaseItemId,
      memo: lot.memo,
    },
    occurredAt,
  );

  return { remaining: remaining, extracted: extracted };
};

export const voidLot = (lot: StockLot, occurredAt: Instant): VoidedStockLot => {
  validateTransition('void', lot.status, 'voided');
  return checked({
    ...lot,
    status: 'voided',
    endedAt: occurredAt,
    updatedAt: occurredAt,
  });
};

export class InvariantViolationError extends Error {
  constructor(lotId: string, message: string) {
    super(`StockLot ${lotId}: ${message}`);
  }
}

const isActive = (status: StockStatus): boolean =>
  (ACTIVE_STATUSES as readonly string[]).includes(status);

export function assertInvariants(lot: StockLotBase): asserts lot is StockLot {
  const fail = (message: string): never => {
    throw new InvariantViolationError(lot.id, message);
  };
  if (isActive(lot.status) && lot.endedAt !== null)
    fail('endedAt must be null when status is active.');
  if (!isActive(lot.status) && lot.endedAt === null)
    fail('endedAt must be set when status is ended');
  if (lot.quantityText === '') fail('quantityText must not be empty.');
  if (lot.status === 'closed' && lot.quantityText !== '0')
    fail('when status is closed, quantityText must be "0"');
  if (isAfter(lot.createdAt, lot.updatedAt)) fail('createdAt < updatedAt required.');
  if (lot.endedAt !== null && isAfter(lot.createdAt, lot.endedAt))
    fail('createdAt < endedAt required.');
  if ((lot.expiryType === null) !== (lot.expiresOn === null))
    fail('Neither or both of expiryType and expiresOn must be null.');
  if (lot.expirySource === 'user_input' && lot.expiresOn === null)
    fail('when expirySource is user_input, expiresOn must not be null.');
}

const checked = <T extends StockLotBase>(lot: T): T & StockLot => {
  assertInvariants(lot);
  return lot;
};

export const toSnapshot = (lot: StockLot): StockLotSnapshot => ({
  id: lot.id,
  foodName: lot.foodName,
  category: lot.category,
  location: lot.location,
  status: lot.status,
  quantityText: lot.quantityText,
  expiresOn: lot.expiresOn !== null ? lot.expiresOn.toString() : null,
  expiryType: lot.expiryType,
  expirySource: lot.expirySource,
  purchaseItemId: lot.purchaseItemId,
  memo: lot.memo,
  endedAt: lot.endedAt !== null ? lot.endedAt.toString() : null,
  createdAt: lot.createdAt.toString(),
  updatedAt: lot.updatedAt.toString(),
});

export const fromSnapshot = (s: StockLotSnapshot): StockLot =>
  checked({
    id: s.id as StockLotId,
    foodName: s.foodName,
    category: s.category,
    location: s.location,
    status: s.status,
    quantityText: s.quantityText,
    expiresOn: s.expiresOn === null ? null : parseCalendarDate(s.expiresOn),
    expiryType: s.expiryType,
    expirySource: s.expirySource,
    purchaseItemId: s.purchaseItemId,
    memo: s.memo,
    endedAt: s.endedAt === null ? null : parseInstant(s.endedAt),
    createdAt: parseInstant(s.createdAt),
    updatedAt: parseInstant(s.updatedAt),
  });

export class StockLotNotFoundError extends Error {
  constructor(lotId: string) {
    super(`StockLot ID: ${lotId} was not found.`);
  }
}
