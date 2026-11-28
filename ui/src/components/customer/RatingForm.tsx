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

// One ramen bowl, the visual of a score button.
function RamenBowl() {
  return (
    <svg viewBox="0 0 48 45" fill="none" aria-hidden="true">
      <path d="M29 5 L42 1 M32 8 L44 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 19 Q24 15 41 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M9 21 Q11 37 24 37 Q37 37 39 21"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 40 Q24 42 29 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M16 16 Q18 12 20 16 Q22 12 24 16 Q26 12 28 16"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type RatingSelectorProps = {
  label: string;
  value: string;
  disabled: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
};

// RatingSelector is a 1 to 5 button group, one ramen bowl per score.
function RatingSelector({ label, value, disabled, describedBy, onChange }: RatingSelectorProps) {
  return (
    <div className="ramen-rating-options" role="group" aria-label={label} aria-describedby={describedBy}>
      {SCORES.map(score => {
        const selected = value === String(score);
        return (
          <button
            key={score}
            className={`ramen-rating-button${selected ? ' selected' : ''}`}
            type="button"
            aria-label={`${score} out of 5`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(String(score))}
          >
            <RamenBowl />
            <span className="ramen-number">{score}</span>
          </button>
        );
      })}
    </div>
  );
}

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
    const error = errors[name];
    const errorId = `rating-${orderId}-${name}-error`;
    return (
      <div className="field-group">
        <span className="rating-label">{label}</span>
        <RatingSelector
          label={label}
          value={scores[name]}
          disabled={busy !== null}
          describedBy={error ? errorId : undefined}
          onChange={value => {
            setScores(current => ({ ...current, [name]: value }));
            setErrors(current => ({ ...current, [name]: undefined }));
          }}
        />
        {error ? (
          <p className="field-error" id={errorId}>
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
        {field('restaurantRating', 'Restaurant')}
        {field('courierRating', 'Courier')}
      </div>
      <button className="secondary-button" type="submit" disabled={busy !== null}>
        Submit rating
      </button>
    </form>
  );
}
