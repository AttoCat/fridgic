import { describe, expect, it } from 'vitest';
import { parseCalendarDate, parseInstant } from '@lib/clock';
import { ACTIVE_STATUSES, ENDED_STATUSES, STATUSES } from './constants';
import type { StockLot, StockLotBase } from './domain';
import * as Lot from './domain';
import { StockLotSnapshot } from './schemas';
import { InvalidTransitionError } from './transition';

const createdAt = parseInstant('2026-11-19T15:30:00Z');
const occurredAt = parseInstant('2026-11-19T16:30:00Z');
const beforeCreation = parseInstant('2026-11-19T15:29:59Z');

const activeLot: StockLot = Object.freeze({
  id: 'testId' as Lot.StockLotId,
  foodName: 'りんご',
  category: 'vegetable',
  location: 'fridge',
  status: 'full',
  quantityText: '1個',
  expiresOn: parseCalendarDate('2026-11-20'),
  expiryType: 'use_by',
  expirySource: 'estimated',
  purchaseItemId: 'purchase-item-id',
  memo: '開封済み',
  endedAt: null,
  createdAt,
  updatedAt: createdAt,
});

const closedLot: StockLot = Object.freeze({
  ...activeLot,
  status: 'closed',
  quantityText: '0',
  endedAt: occurredAt,
  updatedAt: occurredAt,
});

const voidedLot: StockLot = Object.freeze({
  ...activeLot,
  status: 'voided',
  endedAt: occurredAt,
  updatedAt: occurredAt,
});

const endedLots = [closedLot, voidedLot];

const activeSnapshot: StockLotSnapshot = {
  id: 'testId',
  foodName: 'りんご',
  category: 'vegetable',
  location: 'fridge',
  status: 'full',
  quantityText: '1個',
  expiresOn: '2026-11-20',
  expiryType: 'use_by',
  expirySource: 'estimated',
  purchaseItemId: 'purchase-item-id',
  memo: '開封済み',
  endedAt: null,
  createdAt: '2026-11-19T15:30:00Z',
  updatedAt: '2026-11-19T15:30:00Z',
};

describe('consumeLot', () => {
  it('部分消費すると残量・状態・更新時刻を変更し、その他の情報を保持する', () => {
    expect(
      Lot.consumeLot(activeLot, { quantityText: '1/2個', status: 'half' }, occurredAt),
    ).toEqual({ ...activeLot, quantityText: '1/2個', status: 'half', updatedAt: occurredAt });
  });

  it('残量段階が同じでも数量テキストを更新できる', () => {
    const lot: StockLot = { ...activeLot, status: 'low', quantityText: '2切れ' };
    expect(Lot.consumeLot(lot, { status: 'low', quantityText: '1切れ' }, occurredAt)).toEqual({
      ...lot,
      quantityText: '1切れ',
      updatedAt: occurredAt,
    });
  });

  it.each(ACTIVE_STATUSES)('%sから使い切ると残量を0にし、終了・更新時刻を設定する', (status) => {
    const lot: StockLot = { ...activeLot, status };
    expect(Lot.consumeLot(lot, { status: 'closed' }, occurredAt)).toEqual({
      ...lot,
      status: 'closed',
      quantityText: '0',
      endedAt: occurredAt,
      updatedAt: occurredAt,
    });
  });

  it('消費で残量段階を増やすことはできない', () => {
    const lot: StockLot = { ...activeLot, status: 'low' };
    expect(() =>
      Lot.consumeLot(lot, { status: 'half', quantityText: '1/2個' }, occurredAt),
    ).toThrow(InvalidTransitionError);
  });

  it.each(endedLots)('$status の在庫は部分消費も全量消費もできない', (lot) => {
    expect(() => Lot.consumeLot(lot, { status: 'low', quantityText: '1切れ' }, occurredAt)).toThrow(
      InvalidTransitionError,
    );
    expect(() => Lot.consumeLot(lot, { status: 'closed' }, occurredAt)).toThrow(
      InvalidTransitionError,
    );
  });
});

describe('discardLot', () => {
  it.each(ACTIVE_STATUSES)('%sを廃棄すると残量を0にし、終了・更新時刻を設定する', (status) => {
    const lot: StockLot = { ...activeLot, status };
    expect(Lot.discardLot(lot, occurredAt)).toEqual({
      ...lot,
      status: 'closed',
      quantityText: '0',
      endedAt: occurredAt,
      updatedAt: occurredAt,
    });
  });

  it.each(endedLots)('$status の在庫は廃棄できない', (lot) => {
    expect(() => Lot.discardLot(lot, occurredAt)).toThrow(InvalidTransitionError);
  });
});

describe('adjustLot', () => {
  it.each(ACTIVE_STATUSES)('%s から棚卸しで残量を増やせる', (status) => {
    const lot: StockLot = { ...activeLot, status, quantityText: '1切れ' };
    expect(Lot.adjustLot(lot, { status: 'full', quantityText: '2個' }, occurredAt)).toEqual({
      ...lot,
      status: 'full',
      quantityText: '2個',
      updatedAt: occurredAt,
    });
  });

  it('棚卸しで残量を減らせる', () => {
    expect(Lot.adjustLot(activeLot, { status: 'low', quantityText: '1切れ' }, occurredAt)).toEqual({
      ...activeLot,
      status: 'low',
      quantityText: '1切れ',
      updatedAt: occurredAt,
    });
  });

  it.each(ACTIVE_STATUSES)('%sから在庫なしに補正できる', (status) => {
    const lot: StockLot = { ...activeLot, status };
    expect(Lot.adjustLot(lot, { status: 'closed' }, occurredAt)).toEqual({
      ...lot,
      status: 'closed',
      quantityText: '0',
      endedAt: occurredAt,
      updatedAt: occurredAt,
    });
  });

  it.each(endedLots)('$status は棚卸しで再開・再終了できない', (lot) => {
    expect(() => Lot.adjustLot(lot, { status: 'full', quantityText: '1個' }, occurredAt)).toThrow(
      InvalidTransitionError,
    );
    expect(() => Lot.adjustLot(lot, { status: 'closed' }, occurredAt)).toThrow(
      InvalidTransitionError,
    );
  });
});

describe('voidLot', () => {
  it.each(ACTIVE_STATUSES)('%sを無効化すると残量を保持し、終了・更新時刻を設定する', (status) => {
    const lot: StockLot = { ...activeLot, status };
    expect(Lot.voidLot(lot, occurredAt)).toEqual({
      ...lot,
      status: 'voided',
      endedAt: occurredAt,
      updatedAt: occurredAt,
    });
  });

  it('終了済みロットも無効化でき、終了・更新時刻を無効化時刻にする', () => {
    const voidedAt = parseInstant('2026-11-19T17:30:00Z');
    expect(Lot.voidLot(closedLot, voidedAt)).toEqual({
      ...closedLot,
      status: 'voided',
      endedAt: voidedAt,
      updatedAt: voidedAt,
    });
  });

  it('無効化済みロットを再度無効化できない', () => {
    expect(() => Lot.voidLot(voidedLot, occurredAt)).toThrow(InvalidTransitionError);
  });
});

const operations = [
  {
    name: '部分消費',
    run: (lot: StockLot, at = occurredAt) =>
      Lot.consumeLot(lot, { status: 'half', quantityText: '1/2個' }, at),
  },
  {
    name: '全量消費',
    run: (lot: StockLot, at = occurredAt) => Lot.consumeLot(lot, { status: 'closed' }, at),
  },
  { name: '廃棄', run: (lot: StockLot, at = occurredAt) => Lot.discardLot(lot, at) },
  {
    name: '残量補正',
    run: (lot: StockLot, at = occurredAt) =>
      Lot.adjustLot(lot, { status: 'low', quantityText: '1切れ' }, at),
  },
  {
    name: '在庫なしへの補正',
    run: (lot: StockLot, at = occurredAt) => Lot.adjustLot(lot, { status: 'closed' }, at),
  },
  { name: '無効化', run: (lot: StockLot, at = occurredAt) => Lot.voidLot(lot, at) },
];

describe('操作に共通する保証', () => {
  it.each(operations)('$name は入力を変更せず、新しいロットを返す', ({ run }) => {
    const before = Lot.toSnapshot(activeLot);
    expect(run(activeLot)).not.toBe(activeLot);
    expect(Lot.toSnapshot(activeLot)).toEqual(before);
  });

  it.each(operations)('$name は作成前の操作時刻を拒否する', ({ run }) => {
    expect(() => run(activeLot, beforeCreation)).toThrow(Lot.InvariantViolationError);
  });

  it.each(['consume', 'adjust'] as const)('%s は空の数量テキストを拒否する', (operation) => {
    const run = operation === 'consume' ? Lot.consumeLot : Lot.adjustLot;
    expect(() => run(activeLot, { status: 'half', quantityText: '' }, occurredAt)).toThrow(
      Lot.InvariantViolationError,
    );
  });
});

describe('assertInvariants', () => {
  it.each(STATUSES)('%s の正当なロットを受け入れる', (status) => {
    const lot = ACTIVE_STATUSES.some((active) => active === status)
      ? { ...activeLot, status }
      : { ...closedLot, status };
    expect(() => Lot.assertInvariants(lot)).not.toThrow();
  });

  it.each(ACTIVE_STATUSES)('%s に終了時刻がある場合は拒否する', (status) => {
    expect(() => Lot.assertInvariants({ ...activeLot, status, endedAt: occurredAt })).toThrow(
      Lot.InvariantViolationError,
    );
  });

  it.each(ENDED_STATUSES)('%s に終了時刻がない場合は拒否する', (status) => {
    expect(() => Lot.assertInvariants({ ...closedLot, status, endedAt: null })).toThrow(
      Lot.InvariantViolationError,
    );
  });

  const invalidLots: { name: string; patch: Partial<StockLotBase> }[] = [
    { name: '数量テキストが空', patch: { quantityText: '' } },
    {
      name: 'closedに残量がある',
      patch: { status: 'closed', endedAt: occurredAt, quantityText: '1個' },
    },
    { name: '更新時刻が作成前', patch: { updatedAt: beforeCreation } },
    { name: '終了時刻が作成前', patch: { status: 'voided', endedAt: beforeCreation } },
    { name: '期限日だけがある', patch: { expiryType: null } },
    { name: '期限種別だけがある', patch: { expiresOn: null } },
    {
      name: '手入力なのに期限がない',
      patch: { expirySource: 'user_input', expiresOn: null, expiryType: null },
    },
  ];

  it.each(invalidLots)('$name 場合は拒否する', ({ patch }) => {
    expect(() => Lot.assertInvariants({ ...activeLot, ...patch })).toThrow(
      Lot.InvariantViolationError,
    );
  });

  it('作成・更新・終了時刻が同じでも受け入れる', () => {
    expect(() =>
      Lot.assertInvariants({ ...closedLot, endedAt: createdAt, updatedAt: createdAt }),
    ).not.toThrow();
  });

  it('voidedは無効化前の残量を保持できる', () => {
    expect(() => Lot.assertInvariants(voidedLot)).not.toThrow();
  });

  it('推定期限が未設定でも受け入れる', () => {
    expect(() =>
      Lot.assertInvariants({ ...activeLot, expiresOn: null, expiryType: null }),
    ).not.toThrow();
  });

  it.each(['use_by', 'best_before'] as const)('手入力の%s と期限日を受け入れる', (expiryType) => {
    expect(() =>
      Lot.assertInvariants({ ...activeLot, expirySource: 'user_input', expiryType }),
    ).not.toThrow();
  });
});

describe('toSnapshot / fromSnapshot', () => {
  it('全フィールドを保持し、日付・時刻を文字列に変換する', () => {
    expect(Lot.toSnapshot(activeLot)).toEqual(activeSnapshot);
    expect(StockLotSnapshot.safeParse(Lot.toSnapshot(activeLot)).success).toBe(true);
  });

  it('文字列の日付・時刻からドメインの値へ復元する', () => {
    const lot = Lot.fromSnapshot(activeSnapshot);
    expect(lot).toEqual(activeLot);
    expect(lot.expiresOn?.equals(activeLot.expiresOn!)).toBe(true);
    expect(lot.createdAt.equals(createdAt)).toBe(true);
    expect(lot.updatedAt.equals(createdAt)).toBe(true);
  });

  it.each([activeLot, closedLot, voidedLot])('$status のJSON保存・復元で情報を失わない', (lot) => {
    const json: unknown = JSON.parse(JSON.stringify(Lot.toSnapshot(lot)));
    const restored = Lot.fromSnapshot(StockLotSnapshot.parse(json));
    expect(restored).toEqual(lot);
    expect(restored.endedAt?.equals(lot.endedAt!)).toBe(lot.endedAt === null ? undefined : true);
  });

  it('nullableな情報をnullのまま保存・復元する', () => {
    const lot: StockLot = {
      ...activeLot,
      expiresOn: null,
      expiryType: null,
      purchaseItemId: null,
      memo: null,
    };
    const snapshot = Lot.toSnapshot(lot);
    expect(snapshot).toEqual({
      ...activeSnapshot,
      expiresOn: null,
      expiryType: null,
      purchaseItemId: null,
      memo: null,
    });
    expect(Lot.fromSnapshot(snapshot)).toEqual(lot);
  });

  it('構造が正しくても不変条件を満たさないスナップショットは復元できない', () => {
    const snapshot = StockLotSnapshot.parse({
      ...activeSnapshot,
      status: 'closed',
      endedAt: occurredAt.toString(),
    });
    expect(() => Lot.fromSnapshot(snapshot)).toThrow(Lot.InvariantViolationError);
  });

  it.each([
    { expiresOn: '2026-13-01' },
    { createdAt: 'invalid-instant' },
    { updatedAt: 'invalid-instant' },
    { status: 'closed', quantityText: '0', endedAt: 'invalid-instant' },
  ])('不正な日付・時刻は復元できない: %j', (patch) => {
    const snapshot = StockLotSnapshot.parse({ ...activeSnapshot, ...patch });
    expect(() => Lot.fromSnapshot(snapshot)).toThrow(RangeError);
  });
});
