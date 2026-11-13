import { describe, expect, it } from 'vitest';
import type { CourierSummary, Restaurant } from '../dashboard/dashboard.types';
import {
  calculateDatasetBounds,
  getCourierMarkerStyle,
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
        { id: 'c1', status: 'idle', position: { latitude: 45.50, longitude: -73.60 } },
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
      expect(bounds.minLat).toBeLessThan(45.50);
      expect(bounds.maxLat).toBeGreaterThan(45.54);
      expect(bounds.minLng).toBeLessThan(-73.60);
      expect(bounds.maxLng).toBeGreaterThan(-73.55);
    });

    it('falls back to default Montreal bounds when there are no active entities', () => {
      const bounds = calculateDatasetBounds([]);
      expect(bounds.minLat).toBeLessThan(45.49);
      expect(bounds.maxLat).toBeGreaterThan(45.52);
      expect(bounds.minLng).toBeLessThan(-73.60);
      expect(bounds.maxLng).toBeGreaterThan(-73.55);
    });
  });

  describe('projectCoordinates', () => {
    const bounds = {
      minLat: 45.40,
      maxLat: 45.60,
      minLng: -73.70,
      maxLng: -73.50,
    };
    const width = 1000;
    const height = 600;

    it('projects northwest coordinate to top-left area', () => {
      // High latitude (north) = top (y near 0)
      // Low longitude (west) = left (x near 0)
      const { x, y } = projectCoordinates({ latitude: 45.60, longitude: -73.70 }, bounds, width, height);
      expect(x).toBe(0);
      expect(y).toBe(0);
    });

    it('projects southeast coordinate to bottom-right area', () => {
      // Low latitude (south) = bottom (y near height)
      // High longitude (east) = right (x near width)
      const { x, y } = projectCoordinates({ latitude: 45.40, longitude: -73.50 }, bounds, width, height);
      expect(x).toBe(width);
      expect(y).toBe(height);
    });

    it('projects center coordinate to center area', () => {
      const { x, y } = projectCoordinates({ latitude: 45.50, longitude: -73.60 }, bounds, width, height);
      expect(x).toBe(500);
      expect(y).toBe(300);
    });
  });

  describe('getCourierMarkerStyle', () => {
    it('returns distinct shapes for idle, assigned, and carrying', () => {
      const idleStyle = getCourierMarkerStyle('idle');
      const assignedStyle = getCourierMarkerStyle('assigned');
      const carryingStyle = getCourierMarkerStyle('carrying');

      // Shapes must all be distinct
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
});
