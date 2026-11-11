import { IconPin } from '../icons/Icons';

type AddressPromptProps = {
  message: string;
  onAddAddress: () => void;
};

// AddressPrompt asks a customer without a delivery address to add one. Orders are refused
// without an address, so it appears where ordering starts: Discover and the cart.
export function AddressPrompt({ message, onAddAddress }: AddressPromptProps) {
  return (
    <div className="address-prompt" role="status">
      <span className="address-prompt-icon" aria-hidden="true">
        <IconPin size={18} />
      </span>
      <p>
        <strong>Add your delivery address</strong>
        <span>{message}</span>
      </p>
      <button className="primary-button" type="button" onClick={onAddAddress}>
        Add address
      </button>
    </div>
  );
}
