import type { ToastAction, ToastVariant } from '../feedback/useToast';

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

export type RestaurantStatus = 'open' | 'paused' | 'closed';

export type Position = {
  latitude: number;
  longitude: number;
};

export type Restaurant = {
  id: string;
  ownerId: string;
  name: string;
  status: RestaurantStatus;
  position: Position;
  // Present when restaurants are searched from a position (the customer's address).
  distanceKm?: number;
};

export type CourierStatus = 'offline' | 'idle' | 'assigned' | 'carrying';

// Response of GET /couriers/me.
export type CourierProfile = {
  account: Account;
  status: CourierStatus;
  position: Position | null;
  createdAt: string;
  updatedAt: string;
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
  // The name on the customer's account.
  customerName: string;
  restaurantId: string;
  status: string;
  rejectionReason?: string;
  // Where this order goes, copied when it was placed. Null for old orders without one.
  deliveryAddress?: Address | null;
  lines: OrderLine[];
  createdAt: string;
  updatedAt?: string;
};

// One entry of the event log (GET /events): a state change and who made it.
export type StoredEvent = {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actor: { id: string; role: Role } | null;
  occurredAt: string;
};

export type CartLine = {
  item: MenuItem;
  quantity: number;
};

// What a restaurant sends to create or update a dish.
export type MenuItemValues = Pick<MenuItem, 'name' | 'price' | 'status'>;

export type OrderAction = 'accept' | 'reject' | 'prepare' | 'ready';
export type RunAction = <T>(action: () => Promise<T>) => Promise<T | undefined>;
export type ShowToast = (message: string, variant?: ToastVariant, action?: ToastAction) => void;

export type CourierStatus = 'offline' | 'idle' | 'assigned' | 'carrying';

export type CourierSummary = {
  id: string;
  position: Position | null;
  status: CourierStatus;
};

export type AssignmentStatus = 'queued' | 'offered' | 'accepted' | 'stalled' | 'delivered';

export type OrderAssignment = {
  id: string;
  orderId: string;
  courierId: string | null;
  status: AssignmentStatus;
  declinedCourierIds?: string[];
  createdAt: string;
  updatedAt: string;
};
