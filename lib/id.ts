declare const idBrand: unique symbol;

export type Id<Entity extends string> = string & {
  readonly [idBrand]: Entity;
};

export const generateId = <Entity extends string>(): Id<Entity> =>
  crypto.randomUUID() as Id<Entity>;
