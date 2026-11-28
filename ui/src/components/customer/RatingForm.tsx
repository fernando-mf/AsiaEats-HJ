import { useState, type FormEvent } from 'react';
import { logError } from '../../shared/console/outputConsole';

export type RatingValues = {
  restaurantRating: number;
  courierRating: number;
};

type RatingFormProps = {
  orderId: string;
  busy: string | null;
  // Resolves to true once the backend accepts the rating. A refusal (e.g. the order was already
  // rated) is reported to the customer by the caller.
  onSubmit: (orderId: string, values: RatingValues) => Promise<boolean>;
};

type Field = keyof RatingValues;

const SCORES = [1, 2, 3, 4, 5];
const MISSING = 'Choose a rating from 1 to 5.';

// RatingForm lets the customer rate the restaurant and the courier of a delivered order, each
// from 1 to 5 (R-RVW-01).
export function RatingForm({ orderId, busy, onSubmit }: RatingFormProps) {
  const [scores, setScores] = useState<Record<Field, string>>({ restaurantRating: '', courierRating: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Partial<Record<Field, string>> = {};
    if (!SCORES.includes(Number(scores.restaurantRating))) found.restaurantRating = MISSING;
    if (!SCORES.includes(Number(scores.courierRating))) found.courierRating = MISSING;
    setErrors(found);
    if (Object.keys(found).length > 0) {
      logError('RateOrderCommand', Object.values(found).join(' '));
      return;
    }

    await onSubmit(orderId, {
      restaurantRating: Number(scores.restaurantRating),
      courierRating: Number(scores.courierRating),
    });
  }

  function field(name: Field, label: string) {
    const id = `rating-${orderId}-${name}`;
    const error = errors[name];
    return (
      <div className="field-group">
        <label htmlFor={id}>{label}</label>
        <select
          id={id}
          value={scores[name]}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={event => setScores(current => ({ ...current, [name]: event.target.value }))}
        >
          <option value="">Choose</option>
          {SCORES.map(score => (
            <option key={score} value={score}>
              {score}
            </option>
          ))}
        </select>
        {error ? (
          <p className="field-error" id={`${id}-error`}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form className="rating-form" onSubmit={handleSubmit} noValidate aria-label="Rate this order">
      <strong>Rate this order</strong>
      <div className="rating-form-fields">
        {field('restaurantRating', 'Restaurant (1 to 5)')}
        {field('courierRating', 'Courier (1 to 5)')}
      </div>
      <button className="secondary-button" type="submit" disabled={busy !== null}>
        Submit rating
      </button>
    </form>
  );
}
