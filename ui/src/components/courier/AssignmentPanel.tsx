import type { CourierAssignment } from '../dashboard/dashboard.types';
import { formatMoney, orderTotal } from '../dashboard/dashboard.utils';
import { orderNumber } from '../restaurant/orderTime';

type AssignmentPanelProps = {
  // The courier's active assignment, or null when nothing is offered or assigned.
  assignment: CourierAssignment | null;
  busy: string | null;
  onAccept: (assignment: CourierAssignment) => void;
  onDecline: (assignment: CourierAssignment) => void;
  onPickUp: (assignment: CourierAssignment) => void;
  onDeliver: (assignment: CourierAssignment) => void;
};

// What the courier should do next for an accepted assignment, by the order's status.
function nextStep(orderStatus: string) {
  switch (orderStatus) {
    case 'ready':
      return 'The order is ready. Confirm pickup once you have it.';
    case 'picked_up':
      return 'Deliver the order to the customer, then confirm delivery.';
    default:
      return 'Head to the restaurant. You can confirm pickup once the order is ready.';
  }
}

// AssignmentPanel shows the order the backend offered to the courier (R-DLV-02) and lets them
// accept or decline it. The courier never picks an order: they only answer the one offered.
// Once accepted, the courier confirms pickup at the restaurant and then delivery to the customer
// (R-DASH-05). Pickup is only allowed once the order is ready, and delivery once it is picked up.
export function AssignmentPanel({ assignment, busy, onAccept, onDecline, onPickUp, onDeliver }: AssignmentPanelProps) {
  if (!assignment) {
    return (
      <section className="panel" aria-labelledby="courier-offer-title">
        <h2 id="courier-offer-title">Delivery offer</h2>
        <p className="muted">No order is offered to you right now. New offers appear here automatically.</p>
      </section>
    );
  }

  const { order, restaurant } = assignment;
  const offered = assignment.status === 'offered';
  const address = order.deliveryAddress;
  const canPickUp = order.status === 'ready';
  const canDeliver = order.status === 'picked_up';

  return (
    <section className="panel" aria-labelledby="courier-offer-title">
      <h2 id="courier-offer-title">{offered ? 'New delivery offer' : 'Current delivery'}</h2>
      <p>
        <span className={`pill ${offered ? 'pill--primary' : 'pill--amber'}`}>{assignment.status}</span>
        {offered ? null : (
          <>
            {' '}
            <span className="muted">Order status: {order.status.replace(/_/g, ' ')}</span>
          </>
        )}
      </p>

      <p>
        <strong>Pick up at:</strong> {restaurant.name}
      </p>
      <p>
        <strong>Deliver to:</strong>{' '}
        {address ? `${address.street}, ${address.city} ${address.postalCode}` : 'No delivery address on this order.'}
      </p>

      <p>
        <strong>Order {orderNumber(order)}</strong>
      </p>
      <ul>
        {order.lines.map(line => (
          <li key={line.id}>
            {line.quantity} × {line.name} <span className="muted">{formatMoney(line.unitPrice * line.quantity)}</span>
          </li>
        ))}
      </ul>
      <p>
        <strong>Food total:</strong> {formatMoney(orderTotal(order))}
      </p>

      {offered ? (
        <p>
          <button
            className="primary-button"
            type="button"
            disabled={busy !== null}
            onClick={() => onAccept(assignment)}
          >
            Accept
          </button>{' '}
          <button
            className="secondary-button"
            type="button"
            disabled={busy !== null}
            onClick={() => onDecline(assignment)}
          >
            Decline
          </button>
        </p>
      ) : (
        <>
          <p className="muted">{nextStep(order.status)}</p>
          <p>
            <button
              className="primary-button"
              type="button"
              disabled={busy !== null || !canPickUp}
              title={canPickUp ? undefined : 'Available once the order is ready.'}
              onClick={() => onPickUp(assignment)}
            >
              Confirm Pickup
            </button>{' '}
            <button
              className="primary-button"
              type="button"
              disabled={busy !== null || !canDeliver}
              title={canDeliver ? undefined : 'Available once you have picked up the order.'}
              onClick={() => onDeliver(assignment)}
            >
              Confirm Delivery
            </button>
          </p>
        </>
      )}
    </section>
  );
}
