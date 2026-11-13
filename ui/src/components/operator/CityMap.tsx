import { useCallback, useEffect, useMemo, useState } from 'react';
import { requestJson } from '../../shared/api/client';
import { findNeighbourhood, montrealNeighbourhoods } from '../../shared/locations/montrealNeighbourhoods';
import type { CourierSummary, Order, OrderAssignment, Position, Restaurant } from '../dashboard/dashboard.types';
import { IconAlert, IconClose, IconPin, IconStore } from '../icons/Icons';
import { orderNumber } from '../restaurant/orderTime';
import {
  calculateDatasetBounds,
  findCourierAssignment,
  getCourierMarkerStyle,
  getDeliveryRouteDetails,
  getOnDutyCouriers,
  projectCoordinates,
  type DeliveryRouteDetails,
} from './cityMapUtils';
import './city-map.css';

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 650;

const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

type CityMapProps = {
  couriers?: CourierSummary[];
  restaurants?: Restaurant[];
  orders?: Order[];
  assignments?: OrderAssignment[];
  updatedAt?: Date;
  busy?: string | null;
  onRefresh?: () => void;
};

type ActiveRoute = {
  courier: CourierSummary & { position: Position };
  details: DeliveryRouteDetails;
};

// CityMap renders the platform city map with live couriers, restaurants, and active delivery routes.
export function CityMap({
  couriers: propCouriers,
  restaurants = [],
  orders = [],
  assignments: propAssignments,
  updatedAt: propUpdatedAt,
  busy = null,
  onRefresh,
}: CityMapProps) {
  const [internalCouriers, setInternalCouriers] = useState<CourierSummary[]>([]);
  const [internalAssignments, setInternalAssignments] = useState<OrderAssignment[]>([]);
  const [internalUpdatedAt, setInternalUpdatedAt] = useState<Date>();
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'idle' | 'assigned' | 'carrying'>('all');
  const [showRestaurants, setShowRestaurants] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  // If couriers or assignments are not passed via props, load directly from API
  const loadData = useCallback(async () => {
    try {
      const [couriersData, assignmentsData] = await Promise.all([
        requestJson<CourierSummary[]>('/couriers'),
        requestJson<OrderAssignment[]>('/order-assignments'),
      ]);
      setInternalCouriers(couriersData);
      setInternalAssignments(assignmentsData);
      setInternalUpdatedAt(new Date());
    } catch {
      // Background / unauthenticated errors are handled at top level
    }
  }, []);

  useEffect(() => {
    if (!propCouriers || !propAssignments) {
      void loadData();
    }
  }, [loadData, propAssignments, propCouriers]);

  const couriers = propCouriers ?? internalCouriers;
  const assignments = propAssignments ?? internalAssignments;
  const updatedAt = propUpdatedAt ?? internalUpdatedAt;

  // Filter couriers to on-duty only (not offline) with valid geographic coordinates
  const onDutyCouriers = useMemo(() => getOnDutyCouriers(couriers), [couriers]);

  // Counts by status
  const idleCount = onDutyCouriers.filter(c => c.status === 'idle').length;
  const assignedCount = onDutyCouriers.filter(c => c.status === 'assigned').length;
  const carryingCount = onDutyCouriers.filter(c => c.status === 'carrying').length;

  // Compute active delivery routes for couriers heading to pickup or customer
  const activeRoutes = useMemo<ActiveRoute[]>(() => {
    const routes: ActiveRoute[] = [];
    for (const courier of onDutyCouriers) {
      if (courier.status === 'assigned' || courier.status === 'carrying') {
        const assignment = findCourierAssignment(courier.id, assignments);
        if (assignment) {
          const details = getDeliveryRouteDetails(courier, assignment, orders, restaurants);
          if (details) {
            routes.push({ courier, details });
          }
        }
      }
    }
    return routes;
  }, [assignments, onDutyCouriers, orders, restaurants]);

  // Customer drop-off destinations to include in bounds
  const customerDestinations = useMemo(() => {
    return activeRoutes.filter(r => r.details.targetType === 'customer').map(r => r.details.targetPosition);
  }, [activeRoutes]);

  // Apply state filter if selected
  const visibleCouriers = useMemo(() => {
    if (statusFilter === 'all') return onDutyCouriers;
    return onDutyCouriers.filter(c => c.status === statusFilter);
  }, [onDutyCouriers, statusFilter]);

  // Dynamic dataset bounding box encompassing couriers, restaurants, customer destinations, and landmarks
  const bounds = useMemo(
    () => calculateDatasetBounds(onDutyCouriers, showRestaurants ? restaurants : [], customerDestinations),
    [customerDestinations, onDutyCouriers, restaurants, showRestaurants],
  );

  // Selected courier details
  const selectedCourier = useMemo(
    () => onDutyCouriers.find(c => c.id === selectedCourierId) ?? null,
    [onDutyCouriers, selectedCourierId],
  );

  const selectedAssignment = useMemo(() => {
    if (!selectedCourier) return undefined;
    return findCourierAssignment(selectedCourier.id, assignments);
  }, [assignments, selectedCourier]);

  const selectedRouteDetails = useMemo(() => {
    if (!selectedCourier || !selectedAssignment) return null;
    return getDeliveryRouteDetails(selectedCourier, selectedAssignment, orders, restaurants);
  }, [orders, restaurants, selectedAssignment, selectedCourier]);

  const selectedNeighbourhood = useMemo(() => {
    if (!selectedCourier) return undefined;
    return findNeighbourhood(selectedCourier.position.latitude, selectedCourier.position.longitude)?.name;
  }, [selectedCourier]);

  function handleRefresh() {
    if (onRefresh) {
      onRefresh();
    } else {
      void loadData();
    }
  }

  return (
    <div className="city-map-container" data-testid="city-map">
      {/* Header */}
      <div className="city-map-header">
        <div className="city-map-title">
          <p className="eyebrow">
            {updatedAt ? <span className="mono">Updated {timeFormat.format(updatedAt)}</span> : 'Live map'}
          </p>
          <h1>City map</h1>
          <p>
            {onDutyCouriers.length} on-duty couriers · {idleCount} idle · {assignedCount} assigned · {carryingCount}{' '}
            carrying · {activeRoutes.length} active deliveries
          </p>
        </div>

        <div className="city-map-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={busy !== null}
            onClick={handleRefresh}
            aria-label="Refresh courier positions"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Controls & Legend */}
      <div className="city-map-controls">
        <div className="city-map-legend" aria-label="Map Legend">
          <span className="legend-item" title="Available for orders">
            <span className="legend-shape legend-shape--circle" aria-hidden="true" />
            <span>Idle ({idleCount})</span>
          </span>

          <span className="legend-item" title="Heading to pickup">
            <span className="legend-shape legend-shape--diamond" aria-hidden="true" />
            <span>Assigned ({assignedCount})</span>
          </span>

          <span className="legend-item" title="Delivering to customer">
            <span className="legend-shape legend-shape--square" aria-hidden="true" />
            <span>Carrying ({carryingCount})</span>
          </span>

          <span className="legend-item" title="Platform restaurants">
            <span className="legend-shape legend-shape--restaurant" aria-hidden="true">
              <IconStore size={15} />
            </span>
            <span>Restaurants ({restaurants.length})</span>
          </span>
        </div>

        <div className="city-map-filter-group" role="group" aria-label="Filter courier status">
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({onDutyCouriers.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'idle' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('idle')}
          >
            Idle ({idleCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'assigned' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('assigned')}
          >
            Assigned ({assignedCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'carrying' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('carrying')}
          >
            Carrying ({carryingCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${showRestaurants ? 'is-active' : ''}`}
            onClick={() => setShowRestaurants(!showRestaurants)}
            title="Toggle restaurant visibility"
          >
            Restaurants
          </button>
          <button
            type="button"
            className={`filter-chip ${showRoutes ? 'is-active' : ''}`}
            onClick={() => setShowRoutes(!showRoutes)}
            title="Toggle delivery routes visibility"
          >
            Routes ({activeRoutes.length})
          </button>
        </div>
      </div>

      {/* Map Viewport Card */}
      <div className="city-map-viewport-card">
        {/* Graceful empty map state when there are no on-duty couriers */}
        {onDutyCouriers.length === 0 && (
          <div className="city-map-empty-overlay" data-testid="city-map-empty-state">
            <div className="city-map-empty-overlay-content">
              <span className="city-map-empty-icon" aria-hidden="true">
                <IconAlert size={20} />
              </span>
              <div className="city-map-empty-text">
                <strong>No on-duty couriers</strong>
                <p>
                  All couriers are currently offline. When a courier goes online, their live marker and status badge
                  will appear on the map automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        <svg
          className="city-map-svg"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="region"
          aria-label="City map view"
        >
          <defs>
            {/* Grid pattern */}
            <pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(34, 50, 46, 0.4)" strokeWidth="0.75" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#091311" />
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#city-grid)" />

          {/* St. Lawrence River artistic landmark */}
          <path className="city-map-river" d="M 550,650 Q 720,520 850,380 T 1000,180 L 1000,650 Z" aria-hidden="true" />

          {/* Landmark Neighbourhood text labels */}
          <g className="city-map-neighbourhoods" aria-hidden="true">
            {montrealNeighbourhoods.map(n => {
              const { x, y } = projectCoordinates(
                { latitude: n.latitude, longitude: n.longitude },
                bounds,
                MAP_WIDTH,
                MAP_HEIGHT,
              );
              if (x < 30 || x > MAP_WIDTH - 30 || y < 20 || y > MAP_HEIGHT - 20) return null;
              return (
                <text key={n.id} x={x} y={y + 14} className="city-map-neighbourhood-label">
                  {n.name.split(' (')[0]}
                </text>
              );
            })}
          </g>

          {/* Active delivery routes (vector lines connecting couriers to their destination) */}
          <g className="city-map-routes" aria-label="Active delivery routes">
            {activeRoutes.map(({ courier, details }) => {
              const isSelected = selectedCourierId === courier.id;
              if (!showRoutes && !isSelected) return null;

              const start = projectCoordinates(courier.position, bounds, MAP_WIDTH, MAP_HEIGHT);
              const dest = projectCoordinates(details.targetPosition, bounds, MAP_WIDTH, MAP_HEIGHT);

              return (
                <g key={`route-${courier.id}`} className="city-map-route-group">
                  <line
                    className={`city-map-route-line is-${courier.status} ${isSelected ? 'is-selected' : ''}`}
                    x1={start.x}
                    y1={start.y}
                    x2={dest.x}
                    y2={dest.y}
                  />
                  {/* Customer delivery drop-off pin */}
                  {details.targetType === 'customer' && (
                    <g className="city-map-destination-pin" transform={`translate(${dest.x}, ${dest.y})`}>
                      <title>{`Drop-off: ${details.targetLabel}`}</title>
                      <circle className="destination-pin-bg" r="11" />
                      <circle cx="0" cy="0" r="4" fill="var(--primary-ink, #2563eb)" />
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Restaurant markers (Context reference) */}
          {showRestaurants && (
            <g className="city-map-restaurants" aria-label="Restaurants">
              {restaurants.map(restaurant => {
                const { x, y } = projectCoordinates(restaurant.position, bounds, MAP_WIDTH, MAP_HEIGHT);
                return (
                  <g
                    key={restaurant.id}
                    className={`city-map-restaurant-marker is-${restaurant.status}`}
                    transform={`translate(${x}, ${y})`}
                    aria-label={`Restaurant: ${restaurant.name} (${restaurant.status})`}
                  >
                    <title>{`${restaurant.name} - ${restaurant.status}`}</title>
                    <circle className="restaurant-marker-bg" r="11" />
                    <path
                      d="M -5,-2 L 5,-2 L 4,4 L -4,4 Z M -6,-2 L 0,-6 L 6,-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Courier markers with distinct shapes and state badges */}
          <g className="city-map-couriers" aria-label="Couriers">
            {visibleCouriers.map(courier => {
              const { x, y } = projectCoordinates(courier.position, bounds, MAP_WIDTH, MAP_HEIGHT);
              const style = getCourierMarkerStyle(courier.status);
              const isSelected = selectedCourierId === courier.id;

              return (
                <g
                  key={courier.id}
                  className={`city-map-courier-marker is-${courier.status} ${isSelected ? 'is-selected' : ''}`}
                  transform={`translate(${x}, ${y})`}
                  onClick={() => setSelectedCourierId(courier.id === selectedCourierId ? null : courier.id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`Courier ${courier.id.slice(0, 8)} (${style.label})`}
                  data-testid={`courier-marker-${courier.id}`}
                  data-status={courier.status}
                >
                  <title>{`Courier ${courier.id.slice(0, 8)}: ${style.label}`}</title>

                  {/* Pulsing halo ring for active courier markers */}
                  {courier.status === 'idle' && (
                    <circle className="courier-pulse" r="14" fill="none" stroke={style.colorVar} strokeWidth="1.5" />
                  )}

                  {/* Distinct marker shape based on courier state:
                      - idle: Circle
                      - assigned: Diamond (45° rotated polygon)
                      - carrying: Rounded Square
                  */}
                  {style.shape === 'circle' && <circle className="courier-shape--idle" r="13" />}

                  {style.shape === 'diamond' && (
                    <polygon className="courier-shape--assigned" points="0,-14 14,0 0,14 -14,0" />
                  )}

                  {style.shape === 'square' && (
                    <rect className="courier-shape--carrying" x="-12" y="-12" width="24" height="24" rx="5" />
                  )}

                  {/* Inner state icon glyph */}
                  {courier.status === 'idle' && <circle cx="0" cy="0" r="4.5" fill={style.colorVar} />}

                  {courier.status === 'assigned' && (
                    <path
                      d="M -3,-3 L 3,3 M 3,-3 L -3,3"
                      stroke={style.colorVar}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}

                  {courier.status === 'carrying' && (
                    <path d="M -4,-2 L 4,-2 L 3,4 L -3,4 Z" fill="none" stroke={style.colorVar} strokeWidth="1.75" />
                  )}

                  {/* Distinct state badge label attached below the marker */}
                  <g transform="translate(0, 24)" className="courier-marker-badge-group">
                    <rect
                      className="courier-marker-badge-bg"
                      x="-26"
                      y="-9"
                      width="52"
                      height="17"
                      rx="8.5"
                      fill={style.bgVar}
                      stroke={style.colorVar}
                    />
                    <text className="courier-marker-badge" y="3.5" fill={style.colorVar}>
                      {style.label.toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected Courier Inspector Card */}
        {selectedCourier && (
          <div className="city-map-detail-card" role="dialog" aria-label="Courier details">
            <div className="city-map-detail-head">
              <strong>Courier details</strong>
              <button
                type="button"
                className="ghost-button icon-button"
                onClick={() => setSelectedCourierId(null)}
                aria-label="Close courier details"
              >
                <IconClose size={16} />
              </button>
            </div>

            <div className="city-map-detail-rows">
              <div className="detail-row">
                <span className="detail-row-label">Courier ID</span>
                <span className="detail-row-value mono">{selectedCourier.id.slice(0, 12)}…</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">State</span>
                <span className={`pill ${getCourierMarkerStyle(selectedCourier.status).pillClass}`}>
                  {getCourierMarkerStyle(selectedCourier.status).label}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Coordinates</span>
                <span className="detail-row-value mono">
                  {selectedCourier.position.latitude.toFixed(4)}, {selectedCourier.position.longitude.toFixed(4)}
                </span>
              </div>
              {selectedNeighbourhood && (
                <div className="detail-row">
                  <span className="detail-row-label">Area</span>
                  <span className="detail-row-value">{selectedNeighbourhood}</span>
                </div>
              )}
            </div>

            {/* Active Delivery assignment & destination details */}
            {selectedRouteDetails && (
              <div className="city-map-detail-delivery">
                <div className="city-map-detail-delivery-title">
                  <span>Live delivery</span>
                  <span
                    className={`pill ${selectedAssignment?.status === 'stalled' ? 'pill--warning' : 'pill--primary'}`}
                  >
                    {selectedAssignment?.status === 'stalled' ? 'Stalled' : selectedAssignment?.status}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-row-label">Order</span>
                  <span className="detail-row-value mono">
                    {selectedRouteDetails.order
                      ? orderNumber(selectedRouteDetails.order)
                      : selectedRouteDetails.assignment.orderId.slice(0, 8)}
                  </span>
                </div>

                {selectedRouteDetails.restaurant && (
                  <div className="detail-row">
                    <span className="detail-row-label">Restaurant</span>
                    <span className="detail-row-value">{selectedRouteDetails.restaurant.name}</span>
                  </div>
                )}

                {selectedRouteDetails.order && (
                  <div className="detail-row">
                    <span className="detail-row-label">Customer</span>
                    <span className="detail-row-value">{selectedRouteDetails.order.customerName}</span>
                  </div>
                )}

                {selectedRouteDetails.order?.deliveryAddress && (
                  <div className="detail-row">
                    <span className="detail-row-label">Destination</span>
                    <span className="detail-row-value">
                      <IconPin size={12} className="inline-icon" /> {selectedRouteDetails.order.deliveryAddress.street}
                    </span>
                  </div>
                )}

                <div className="detail-row">
                  <span className="detail-row-label">Phase</span>
                  <span className="detail-row-value">
                    {selectedAssignment?.status === 'stalled'
                      ? 'Stalled · Needs reassignment'
                      : selectedCourier.status === 'assigned'
                        ? 'Heading to pickup'
                        : selectedCourier.status === 'carrying'
                          ? 'In transit to customer'
                          : 'Assigned'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
