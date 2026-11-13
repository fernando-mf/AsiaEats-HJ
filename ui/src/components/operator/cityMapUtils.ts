import { montrealNeighbourhoods } from '../../shared/locations/montrealNeighbourhoods';
import type {
  CourierStatus,
  CourierSummary,
  Order,
  OrderAssignment,
  Position,
  Restaurant,
} from '../dashboard/dashboard.types';

export type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type CourierMarkerShape = 'circle' | 'diamond' | 'square';

export type CourierMarkerStyle = {
  shape: CourierMarkerShape;
  status: CourierStatus;
  label: string;
  pillClass: string;
  colorVar: string;
  bgVar: string;
  description: string;
};

export type DeliveryRouteDetails = {
  assignment: OrderAssignment;
  order: Order | undefined;
  restaurant: Restaurant | undefined;
  targetType: 'restaurant' | 'customer';
  targetLabel: string;
  targetPosition: Position;
};

// Filter couriers to only those currently on duty (idle, assigned, carrying) with valid coordinates.
export function getOnDutyCouriers(couriers: CourierSummary[]): Array<CourierSummary & { position: Position }> {
  return couriers.filter(
    (c): c is CourierSummary & { position: Position } =>
      c.status !== 'offline' &&
      c.position !== null &&
      typeof c.position.latitude === 'number' &&
      typeof c.position.longitude === 'number' &&
      !Number.isNaN(c.position.latitude) &&
      !Number.isNaN(c.position.longitude),
  );
}

// Locate an active order assignment associated with a given courier.
export function findCourierAssignment(
  courierId: string,
  assignments: OrderAssignment[] = [],
): OrderAssignment | undefined {
  return assignments.find(
    a => a.courierId === courierId && (a.status === 'accepted' || a.status === 'offered' || a.status === 'stalled'),
  );
}

// Compute active delivery waypoint details (destination type, position, and order/restaurant metadata).
export function getDeliveryRouteDetails(
  courier: { id: string; status: CourierStatus; position: Position },
  assignment: OrderAssignment,
  orders: Order[] = [],
  restaurants: Restaurant[] = [],
): DeliveryRouteDetails | null {
  const order = orders.find(o => o.id === assignment.orderId);
  const restaurant = order ? restaurants.find(r => r.id === order.restaurantId) : undefined;

  // If courier is carrying, destination is the customer's delivery address
  if (courier.status === 'carrying' && order?.deliveryAddress) {
    return {
      assignment,
      order,
      restaurant,
      targetType: 'customer',
      targetLabel: `${order.customerName} (${order.deliveryAddress.street})`,
      targetPosition: {
        latitude: order.deliveryAddress.latitude,
        longitude: order.deliveryAddress.longitude,
      },
    };
  }

  // If courier is assigned, destination is the pickup restaurant
  if (restaurant?.position) {
    return {
      assignment,
      order,
      restaurant,
      targetType: 'restaurant',
      targetLabel: restaurant.name,
      targetPosition: restaurant.position,
    };
  }

  return null;
}

// Compute the bounding box that encompasses all dataset points with proportional padding.
export function calculateDatasetBounds(
  couriers: Array<{ position: Position | null; status: CourierStatus }>,
  restaurants: Restaurant[] = [],
  destinations: Position[] = [],
  padding = 0.12,
): MapBounds {
  const points: Position[] = [];

  for (const c of couriers) {
    if (c.status !== 'offline' && c.position) {
      points.push(c.position);
    }
  }

  for (const r of restaurants) {
    if (r.position) {
      points.push(r.position);
    }
  }

  for (const d of destinations) {
    if (
      d &&
      typeof d.latitude === 'number' &&
      typeof d.longitude === 'number' &&
      !Number.isNaN(d.latitude) &&
      !Number.isNaN(d.longitude)
    ) {
      points.push(d);
    }
  }

  // Fallback to core Montréal neighbourhoods if there are few or no active entities
  if (points.length < 2) {
    for (const n of montrealNeighbourhoods) {
      points.push({ latitude: n.latitude, longitude: n.longitude });
    }
  }

  const minLat = Math.min(...points.map(p => p.latitude));
  const maxLat = Math.max(...points.map(p => p.latitude));
  const minLng = Math.min(...points.map(p => p.longitude));
  const maxLng = Math.max(...points.map(p => p.longitude));

  const latSpan = Math.max(maxLat - minLat, 0.04);
  const lngSpan = Math.max(maxLng - minLng, 0.05);
  const latPad = latSpan * padding;
  const lngPad = lngSpan * padding;

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

// Project geographic coordinates (lat, lng) to Cartesian coordinates (x, y) inside a bounding box.
export function projectCoordinates(
  position: Position,
  bounds: MapBounds,
  mapWidth: number,
  mapHeight: number,
): { x: number; y: number } {
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;

  // Longitude maps linearly from West (minLng = 0) to East (maxLng = mapWidth)
  const xRatio = (position.longitude - bounds.minLng) / lngSpan;
  // Latitude maps inversely from North (maxLat = 0) to South (minLat = mapHeight)
  const yRatio = (bounds.maxLat - position.latitude) / latSpan;

  return {
    x: Math.max(0, Math.min(mapWidth, Math.round(xRatio * mapWidth))),
    y: Math.max(0, Math.min(mapHeight, Math.round(yRatio * mapHeight))),
  };
}

// Marker styling and badge configurations for each on-duty courier state.
export function getCourierMarkerStyle(status: CourierStatus): CourierMarkerStyle {
  switch (status) {
    case 'idle':
      return {
        shape: 'circle',
        status: 'idle',
        label: 'Idle',
        pillClass: 'pill--green',
        colorVar: 'var(--green-ink)',
        bgVar: 'var(--green-soft)',
        description: 'Available for order assignment',
      };
    case 'assigned':
      return {
        shape: 'diamond',
        status: 'assigned',
        label: 'Assigned',
        pillClass: 'pill--amber',
        colorVar: 'var(--amber-ink)',
        bgVar: 'var(--amber-soft)',
        description: 'Assigned to order, heading to restaurant',
      };
    case 'carrying':
      return {
        shape: 'square',
        status: 'carrying',
        label: 'Carrying',
        pillClass: 'pill--primary',
        colorVar: 'var(--primary-ink)',
        bgVar: 'var(--primary-soft)',
        description: 'Order in transit to customer',
      };
    case 'offline':
    default:
      return {
        shape: 'circle',
        status: 'offline',
        label: 'Offline',
        pillClass: 'pill--neutral',
        colorVar: 'var(--text-3)',
        bgVar: 'var(--surface-2)',
        description: 'Off duty',
      };
  }
}
