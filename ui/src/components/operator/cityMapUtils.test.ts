import { describe, expect, it } from 'vitest';
import type { CourierSummary, Order, OrderAssignment, Restaurant } from '../dashboard/dashboard.types';
import {
  calculateDatasetBounds,
  findCourierAssignment,
  getCourierMarkerStyle,
  getDeliveryRouteDetails,
  getOnDutyCouriers,
  projectCoordinates,
} from './cityMapUtils';

describe('cityMapUtils', () => {
  describe('getOnDutyCouriers', () => {
    it('filters out offline couriers and those with null positions', () => {
      const couriers: CourierSummary[] = [
        { id: 'c1', status: 'offline', position: { latitude: 45.5, longitude: -73.5 } },
        { id: 'c2', status: 'idle', position: { latitude: 45.501, longitude: -73.56 } },
        { id: 'c3', status: 'assigned', position: { latitude: 45.51, longitude: -73.57 } },
        { id: 'c4', status: 'carrying', position: { latitude: 45.52, longitude: -73.58 } },
        { id: 'c5', status: 'idle', position: null },
      ];

      const onDuty = getOnDutyCouriers(couriers);
      expect(onDuty).toHaveLength(3);
      expect(onDuty.map(c => c.id)).toEqual(['c2', 'c3', 'c4']);
      expect(onDuty.every(c => c.status !== 'offline')).toBe(true);
      expect(onDuty.every(c => c.position !== null)).toBe(true);
    });

    it('handles empty courier list gracefully', () => {
      expect(getOnDutyCouriers([])).toEqual([]);
    });

    it('filters out couriers with NaN coordinates', () => {
      const couriers: CourierSummary[] = [
        { id: 'c1', status: 'idle', position: { latitude: Number.NaN, longitude: -73.5 } },
      ];
      expect(getOnDutyCouriers(couriers)).toHaveLength(0);
    });
  });

  describe('calculateDatasetBounds', () => {
    it('computes dataset bounds enclosing all courier and restaurant locations with padding', () => {
      const couriers: CourierSummary[] = [
        { id: 'c1', status: 'idle', position: { latitude: 45.5, longitude: -73.6 } },
        { id: 'c2', status: 'carrying', position: { latitude: 45.54, longitude: -73.55 } },
      ];
      const restaurants: Restaurant[] = [
        {
          id: 'r1',
          ownerId: 'o1',
          name: 'Resto A',
          status: 'open',
          position: { latitude: 45.52, longitude: -73.58 },
        },
      ];

      const bounds = calculateDatasetBounds(couriers, restaurants);

      // Bounds must strictly enclose all coordinates
      expect(bounds.minLat).toBeLessThan(45.5);
      expect(bounds.maxLat).toBeGreaterThan(45.54);
      expect(bounds.minLng).toBeLessThan(-73.6);
      expect(bounds.maxLng).toBeGreaterThan(-73.55);
    });

    it('encloses extra delivery destination coordinates when provided', () => {
      const couriers: CourierSummary[] = [
        { id: 'c1', status: 'carrying', position: { latitude: 45.5, longitude: -73.6 } },
      ];
      const destinations = [{ latitude: 45.58, longitude: -73.52 }];

      const bounds = calculateDatasetBounds(couriers, [], destinations);
      expect(bounds.maxLat).toBeGreaterThan(45.58);
      expect(bounds.maxLng).toBeGreaterThan(-73.52);
    });

    it('falls back to default Montreal bounds when there are no active entities', () => {
      const bounds = calculateDatasetBounds([]);
      expect(bounds.minLat).toBeLessThan(45.49);
      expect(bounds.maxLat).toBeGreaterThan(45.52);
      expect(bounds.minLng).toBeLessThan(-73.6);
      expect(bounds.maxLng).toBeGreaterThan(-73.55);
    });
  });

  describe('projectCoordinates', () => {
    const bounds = {
      minLat: 45.4,
      maxLat: 45.6,
      minLng: -73.7,
      maxLng: -73.5,
    };
    const width = 1000;
    const height = 600;

    it('projects northwest coordinate to top-left area', () => {
      const { x, y } = projectCoordinates({ latitude: 45.6, longitude: -73.7 }, bounds, width, height);
      expect(x).toBe(0);
      expect(y).toBe(0);
    });

    it('projects southeast coordinate to bottom-right area', () => {
      const { x, y } = projectCoordinates({ latitude: 45.4, longitude: -73.5 }, bounds, width, height);
      expect(x).toBe(width);
      expect(y).toBe(height);
    });

    it('projects center coordinate to center area', () => {
      const { x, y } = projectCoordinates({ latitude: 45.5, longitude: -73.6 }, bounds, width, height);
      expect(x).toBe(500);
      expect(y).toBe(300);
    });
  });

  describe('getCourierMarkerStyle', () => {
    it('returns distinct shapes for idle, assigned, and carrying', () => {
      const idleStyle = getCourierMarkerStyle('idle');
      const assignedStyle = getCourierMarkerStyle('assigned');
      const carryingStyle = getCourierMarkerStyle('carrying');

      expect(idleStyle.shape).toBe('circle');
      expect(assignedStyle.shape).toBe('diamond');
      expect(carryingStyle.shape).toBe('square');

      expect(idleStyle.shape).not.toBe(assignedStyle.shape);
      expect(assignedStyle.shape).not.toBe(carryingStyle.shape);
      expect(idleStyle.shape).not.toBe(carryingStyle.shape);
    });

    it('returns distinct badges and pill classes for each state', () => {
      const idleStyle = getCourierMarkerStyle('idle');
      const assignedStyle = getCourierMarkerStyle('assigned');
      const carryingStyle = getCourierMarkerStyle('carrying');

      expect(idleStyle.label).toBe('Idle');
      expect(idleStyle.pillClass).toBe('pill--green');

      expect(assignedStyle.label).toBe('Assigned');
      expect(assignedStyle.pillClass).toBe('pill--amber');

      expect(carryingStyle.label).toBe('Carrying');
      expect(carryingStyle.pillClass).toBe('pill--primary');
    });
  });

  describe('findCourierAssignment', () => {
    const assignments: OrderAssignment[] = [
      {
        id: 'a1',
        orderId: 'o1',
        courierId: 'c1',
        status: 'accepted',
        createdAt: '2026-11-13T10:00:00Z',
        updatedAt: '2026-11-13T10:05:00Z',
      },
      {
        id: 'a2',
        orderId: 'o2',
        courierId: 'c2',
        status: 'delivered',
        createdAt: '2026-11-13T09:00:00Z',
        updatedAt: '2026-11-13T09:30:00Z',
      },
    ];

    it('finds active accepted assignment for courier', () => {
      const match = findCourierAssignment('c1', assignments);
      expect(match).toBeDefined();
      expect(match?.id).toBe('a1');
    });

    it('ignores delivered or unassigned assignments', () => {
      const match = findCourierAssignment('c2', assignments);
      expect(match).toBeUndefined();
    });
  });

  describe('getDeliveryRouteDetails', () => {
    const restaurant: Restaurant = {
      id: 'r1',
      ownerId: 'o1',
      name: 'Noodle House',
      status: 'open',
      position: { latitude: 45.51, longitude: -73.57 },
    };

    const order: Order = {
      id: 'o1',
      customerId: 'cust1',
      customerName: 'Alice',
      restaurantId: 'r1',
      status: 'preparing',
      lines: [{ id: 'l1', menuItemId: 'm1', name: 'Dumplings', unitPrice: 1200, quantity: 2 }],
      createdAt: '2026-11-13T10:00:00Z',
      deliveryAddress: {
        street: '123 St-Laurent',
        city: 'Montreal',
        postalCode: 'H2X 2T6',
        latitude: 45.52,
        longitude: -73.58,
      },
    };

    const assignment: OrderAssignment = {
      id: 'a1',
      orderId: 'o1',
      courierId: 'c1',
      status: 'accepted',
      createdAt: '2026-11-13T10:05:00Z',
      updatedAt: '2026-11-13T10:05:00Z',
    };

    it('resolves restaurant destination when courier is assigned', () => {
      const details = getDeliveryRouteDetails(
        { id: 'c1', status: 'assigned', position: { latitude: 45.5, longitude: -73.56 } },
        assignment,
        [order],
        [restaurant],
      );

      expect(details).not.toBeNull();
      expect(details?.targetType).toBe('restaurant');
      expect(details?.targetLabel).toBe('Noodle House');
      expect(details?.targetPosition).toEqual({ latitude: 45.51, longitude: -73.57 });
    });

    it('resolves customer destination when courier is carrying', () => {
      const details = getDeliveryRouteDetails(
        { id: 'c1', status: 'carrying', position: { latitude: 45.51, longitude: -73.57 } },
        assignment,
        [order],
        [restaurant],
      );

      expect(details).not.toBeNull();
      expect(details?.targetType).toBe('customer');
      expect(details?.targetLabel).toContain('Alice');
      expect(details?.targetPosition).toEqual({ latitude: 45.52, longitude: -73.58 });
    });
  });
});
