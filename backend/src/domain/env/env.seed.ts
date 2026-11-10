import type { MenuItemStatus, RestaurantStatus } from '#domain/ord/index.js';
import type { Address } from '#domain/reg/index.js';

// The initial demo state, read from the configuration file (backend/config/seed.json) so every
// demo starts from the same known state (R-REG-03, R-ORD-01). Ids are not part of it: the
// database assigns them when the seed is loaded.

export type SeedAccount = {
  username: string;
  name: string;
};

export type SeedCustomer = SeedAccount & {
  address?: Address;
};

// Couriers start offline; going on duty belongs to the delivery module (DLV).
export type SeedCourier = SeedAccount & {
  position?: { latitude: number; longitude: number };
};

export type SeedMenuItem = {
  name: string;
  price: number;
  // Available when not given.
  status?: MenuItemStatus;
};

export type SeedRestaurant = {
  name: string;
  status: RestaurantStatus;
  position: { latitude: number; longitude: number };
  owner: SeedAccount;
  menu: SeedMenuItem[];
};

export type EnvSeed = {
  // The same password for every seeded account, for demo purposes only.
  password: string;
  operators: SeedAccount[];
  couriers: SeedCourier[];
  customers: SeedCustomer[];
  restaurants: SeedRestaurant[];
};

// SeedSource provides the initial demo state; the infrastructure layer reads it from a file.
export abstract class SeedSource {
  abstract load(): Promise<EnvSeed>;
}
