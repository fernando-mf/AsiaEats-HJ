import { montrealNeighbourhoods } from '../../shared/locations/montrealNeighbourhoods';
import type { CourierStatus, CourierSummary, Position, Restaurant } from '../dashboard/dashboard.types';

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

// Filter couriers to only those currently on duty (idle, assigned, carrying) with valid coordinates.
export function getOnDutyCouriers(
  couriers: CourierSummary[],
): Array<CourierSummary & { position: Position }> {
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

// Compute the bounding box that encompasses all dataset points with proportional padding.
export function calculateDatasetBounds(
  couriers: Array<{ position: Position | null; status: CourierStatus }>,
  restaurants: Restaurant[] = [],
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
