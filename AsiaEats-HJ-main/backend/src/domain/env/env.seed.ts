import {
  MenuItemCreationRequest,
  MenuItemStatus,
  RestaurantCreationRequest,
  RestaurantStatus,
} from '#domain/ord/index.js';
import { AccountCreationRequest, AccountRole, CustomerUpdateRequest } from '#domain/reg/index.js';

// SEED_PASSWORD same password for everyone, for demo purposes... not a good idea in a real app.
export const SEED_PASSWORD = 'password123';

const account = (role: AccountRole, username: string, name: string) =>
  AccountCreationRequest.initialize({
    role,
    username,
    name,
    password: SEED_PASSWORD,
  });

export type SeedCustomer = {
  account: AccountCreationRequest;
  customerProfile?: CustomerUpdateRequest;
};

export type SeedRestaurant = {
  owner: AccountCreationRequest;
  restaurant: RestaurantCreationRequest;
  menu: MenuItemCreationRequest[];
};

//
// SEED DATA
//
export const seedOperators: AccountCreationRequest[] = [account(AccountRole.Operator, 'operator1', 'Jon Doe')];

export const seedCouriers: AccountCreationRequest[] = [account(AccountRole.Courier, 'courier', 'Patrick Courier')];

export const seedCustomers: SeedCustomer[] = [
  {
    account: account(AccountRole.Customer, 'alice', 'Alice Chen'),
    customerProfile: CustomerUpdateRequest.initialize({
      address: {
        street: '1455 De Maisonneuve Blvd W',
        city: 'Montreal',
        postalCode: 'H3G 1M8',
        latitude: 45.4972,
        longitude: -73.579,
      },
    }),
  },
  {
    account: account(AccountRole.Customer, 'bob', 'Bob Tremblay'),
    customerProfile: CustomerUpdateRequest.initialize({
      address: {
        street: '1001 Rue Sherbrooke W',
        city: 'Montreal',
        postalCode: 'H3A 1G5',
        latitude: 45.5048,
        longitude: -73.5772,
      },
    }),
  },
];

export const seedRestaurants: SeedRestaurant[] = [
  {
    owner: account(AccountRole.Restaurant, 'golden-dragon', 'Golden Dragon Owner'),
    restaurant: RestaurantCreationRequest.initialize({
      name: 'Golden Dragon',
      status: RestaurantStatus.Open,
      position: { latitude: 45.5076, longitude: -73.561 },
    }),
    menu: [
      MenuItemCreationRequest.initialize({ name: 'Pork Dumplings', price: 9.5 }),
      MenuItemCreationRequest.initialize({ name: 'General Tao Chicken', price: 15.95 }),
      MenuItemCreationRequest.initialize({ name: 'Hot and Sour Soup', price: 6.25 }),
      MenuItemCreationRequest.initialize({ name: 'Peking Duck', price: 42, status: MenuItemStatus.SoldOut }),
    ],
  },
  {
    owner: account(AccountRole.Restaurant, 'jade-garden', 'Jade Garden Owner'),
    restaurant: RestaurantCreationRequest.initialize({
      name: 'Jade Garden',
      status: RestaurantStatus.Open,
      position: { latitude: 45.4955, longitude: -73.5785 },
    }),
    menu: [
      MenuItemCreationRequest.initialize({ name: 'Dan Dan Noodles', price: 13.5 }),
      MenuItemCreationRequest.initialize({ name: 'Mapo Tofu', price: 12.75 }),
      MenuItemCreationRequest.initialize({ name: 'Scallion Pancake', price: 7 }),
    ],
  },
  {
    owner: account(AccountRole.Restaurant, 'lotus-house', 'Lotus House Owner'),
    restaurant: RestaurantCreationRequest.initialize({
      name: 'Lotus House',
      status: RestaurantStatus.Closed,
      position: { latitude: 45.5231, longitude: -73.5817 },
    }),
    menu: [
      MenuItemCreationRequest.initialize({ name: 'Char Siu Bao', price: 8.5 }),
      MenuItemCreationRequest.initialize({ name: 'Fried Rice', price: 11 }),
    ],
  },
];
