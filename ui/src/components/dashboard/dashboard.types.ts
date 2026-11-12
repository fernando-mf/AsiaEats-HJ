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
  // What the order was charged, set once it is delivered (R-PRC-02, R-PRC-03); null before.
  billing?: BillingDetails | null;
};

export type FareComponentKind = 'subtotal' | 'delivery_fee' | 'service_fee' | 'small_order_surcharge';

// One part of a fare, in dollars. The small-order surcharge is only listed when it was charged.
export type FareComponent = {
  kind: FareComponentKind;
  amount: number;
};

export type BillingDetails = {
  orderId: string;
  summary: {
    lines: OrderLine[];
    fare: { components: FareComponent[]; total: number };
    placedAt: string;
    deliveredAt: string;
  };
  ledger: {
    // delivered, or refunded once refunded.
    finalState: string;
    placedAt: string;
    deliveredAt: string;
    // What the delivery was charged; a refund doesn't change it.
    totalCharge: number;
    refund: { amount: number; refundedAt: string } | null;
  };
};

// One entry of the billing ledger (GET /ledger, R-PRC-03): what an order was charged when it
// reached its final state, or a refund of that charge. Amounts are in dollars; a refund's are
// negative. Rejected and cancelled orders are recorded with nothing charged.
export type LedgerEntry = {
  id: string;
  orderId: string;
  kind: 'charge' | 'refund';
  // The order's state when the entry was recorded: delivered, rejected, cancelled or refunded.
  orderStatus: string;
  customerId: string;
  restaurantId: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  smallOrderSurcharge: number;
  total: number;
  orderPlacedAt: string;
  // When the order reached the state above.
  orderClosedAt: string;
  recordedAt: string;
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
