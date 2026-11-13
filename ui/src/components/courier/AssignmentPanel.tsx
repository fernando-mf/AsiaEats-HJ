import type { CourierAssignment } from '../dashboard/dashboard.types';
import { formatMoney, orderTotal } from '../dashboard/dashboard.utils';
import { orderNumber } from '../restaurant/orderTime';

type AssignmentPanelProps = {
  // The courier's active assignment, or null when nothing is offered or assigned.
  assignment: CourierAssignment | null;
  busy: string | null;
  onAccept: (assignment: CourierAssignment) => void;
  onDecline: (assignment: CourierAssignment) => void;
};

// AssignmentPanel shows the order the backend offered to the courier (R-DLV-02) and lets them
// accept or decline it. The courier never picks an order: they only answer the one offered.
// An accepted assignment is shown without accept/decline; #137 adds the pickup and delivery
// buttons for it here.
export function AssignmentPanel({ assignment, busy, onAccept, onDecline }: AssignmentPanelProps) {
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

  return (
    <section className="panel" aria-labelledby="courier-offer-title">
      <h2 id="courier-offer-title">{offered ? 'New delivery offer' : 'Current delivery'}</h2>
      <p>
        <span className={`pill ${offered ? 'pill--primary' : 'pill--amber'}`}>{assignment.status}</span>
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
        <strong>Total:</strong> {formatMoney(orderTotal(order))}
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
        <p className="muted">Head to the restaurant to pick up this order.</p>
      )}
    </section>
  );
}
