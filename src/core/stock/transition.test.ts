import { describe, expect, it } from 'vitest';
import { ACTIVE_STATUSES, ENDED_STATUSES } from './constants';
import { InvalidTransitionError, validateTransition } from './transition';

describe('終了状態への遷移', () => {
  it.each(ACTIVE_STATUSES)('%s から消費・廃棄・棚卸しでclosedにできる', (status) => {
    for (const event of ['consume', 'discard', 'adjust'] as const) {
      expect(() => validateTransition(event, status, 'closed')).not.toThrow();
    }
  });

  it.each(ENDED_STATUSES)('%s から通常操作で在庫を再開できない', (status) => {
    for (const event of ['consume', 'discard', 'adjust'] as const) {
      expect(() => validateTransition(event, status, 'full')).toThrow(InvalidTransitionError);
    }
  });

  it('終了したロットを誤登録として無効化できる', () => {
    expect(() => validateTransition('void', 'closed', 'voided')).not.toThrow();
  });

  it('部分廃棄では残量を減らせるが、増やせない', () => {
    expect(() => validateTransition('discard', 'half', 'low')).not.toThrow();
    expect(() => validateTransition('discard', 'low', 'half')).toThrow(InvalidTransitionError);
  });
});
