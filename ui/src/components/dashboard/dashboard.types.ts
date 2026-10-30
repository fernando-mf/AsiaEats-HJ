import type { ToastVariant } from '../feedback/useToast';

export type Role = 'customer' | 'restaurant' | 'courier' | 'operator';

export type Account = {
  id: string;
  username: string;
  name: string;
  role: Role;
  email?: string;
  createdAt?: string;
};

export type Address = {
  street: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
};

// Response of GET /customers/me.
export type CustomerProfileResponse = {
  address: Address | null;
};

export type Restaurant = {
  id: string;
  ownerId: string;
  name: string;
  status: 'open' | 'paused' | 'closed';
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  status: 'available' | 'sold_out';
};

export type OrderLine = {
  id: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type Order = {
  id: string;
  customerId: string;
  restaurantId: string;
  status: string;
  rejectionReason?: string;
  lines: OrderLine[];
  createdAt: string;
  updatedAt?: string;
};

export type CartLine = {
  item: MenuItem;
  quantity: number;
};

export type MenuDraft = {
  name: string;
  price: string;
  quantity: string;
  status: 'available' | 'sold_out';
};

export type OrderAction = 'accept' | 'reject' | 'prepare' | 'ready';
export type RunAction = <T>(action: () => Promise<T>) => Promise<T | undefined>;
export type ShowToast = (message: string, variant?: ToastVariant) => void;
