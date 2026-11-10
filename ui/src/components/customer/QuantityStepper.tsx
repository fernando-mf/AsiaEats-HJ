import { IconMinus, IconPlus } from '../icons/Icons';

type QuantityStepperProps = {
  name: string;
  quantity: number;
  // False when the restaurant is not taking orders: the quantity can still go down, not up.
  canIncrease?: boolean;
  onChange: (delta: number) => void;
};

// QuantityStepper shows "− n +" for a dish in the cart. Going below one removes the dish.
export function QuantityStepper({ name, quantity, canIncrease = true, onChange }: QuantityStepperProps) {
  return (
    <div className="quantity-stepper" role="group" aria-label={`${name} quantity`}>
      <button type="button" aria-label={`Remove one ${name}`} onClick={() => onChange(-1)}>
        <IconMinus size={15} />
      </button>
      <span className="mono" aria-live="polite">
        {quantity}
      </span>
      <button type="button" aria-label={`Add one ${name}`} disabled={!canIncrease} onClick={() => onChange(1)}>
        <IconPlus size={15} />
      </button>
    </div>
  );
}
