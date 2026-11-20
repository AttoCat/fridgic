import { ACTIVE_STATUSES, EventType, StockStatus } from './constants';

type TransitionEvent = Exclude<EventType, 'purchase' | 'undo'>;

type Table = Partial<Record<StockStatus, readonly StockStatus[]>>;

const SAME_OR_LOWER: Table = {
  full: ['full', 'half', 'low', 'closed'],
  half: ['half', 'low', 'closed'],
  low: ['low', 'closed'],
};

const KEEP: Table = { full: ['full'], half: ['half'], low: ['low'] };

const ANY_ACTIVE_OR_END = [...ACTIVE_STATUSES, 'closed'] as const;
const ADJUSTABLE: Table = {
  full: ANY_ACTIVE_OR_END,
  half: ANY_ACTIVE_OR_END,
  low: ANY_ACTIVE_OR_END,
};

const ALLOWED_TRANSITION: Record<TransitionEvent, Table> = {
  consume: SAME_OR_LOWER,
  split: SAME_OR_LOWER,
  adjust: ADJUSTABLE,
  move: KEEP,
  discard: SAME_OR_LOWER,
  void: {
    // 誤登録の無効化
    full: ['voided'],
    half: ['voided'],
    low: ['voided'],
    closed: ['voided'],
  },
};

export const validateTransition = (event: TransitionEvent, from: StockStatus, to: StockStatus) => {
  if (!ALLOWED_TRANSITION[event][from]?.includes(to))
    throw new InvalidTransitionError(event, from, to);
};

export class InvalidTransitionError extends Error {
  readonly event: EventType;
  readonly from: StockStatus;
  readonly to: StockStatus;

  constructor(event: EventType, from: StockStatus, to: StockStatus) {
    super(`Cannot transition from "${from}" to "${to}" on event "${event}".`);
    this.name = new.target.name;
    this.event = event;
    this.from = from;
    this.to = to;
  }
}
