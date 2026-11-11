import { useState, type FormEvent } from 'react';
import { logError } from '../../shared/console/outputConsole';
import { findNeighbourhood, montrealNeighbourhoods } from '../../shared/locations/montrealNeighbourhoods';
import type { Address } from '../dashboard/dashboard.types';

type AddressFormProps = {
  address: Address | null | undefined;
  busy: string | null;
  onSave: (address: Address) => Promise<boolean>;
  // Shows a Cancel button when the form can be closed without saving.
  onCancel?: () => void;
};

type Field = 'street' | 'city' | 'postalCode' | 'neighbourhood' | 'latitude' | 'longitude';

// AddressForm edits the customer's delivery address. Coordinates come from a neighbourhood
// preset, or are typed exactly when "Enter exact coordinates" is on. Limits mirror the
// backend's AddressRequest validation.
export function AddressForm({ address, busy, onSave, onCancel }: AddressFormProps) {
  const preset = address ? findNeighbourhood(address.latitude, address.longitude) : undefined;
  const [street, setStreet] = useState(address?.street ?? '');
  const [city, setCity] = useState(address?.city ?? 'Montréal');
  const [postalCode, setPostalCode] = useState(address?.postalCode ?? '');
  const [neighbourhoodId, setNeighbourhoodId] = useState(preset?.id ?? '');
  // Exact mode for addresses saved with coordinates that match no preset (e.g. seeded ones).
  const [exact, setExact] = useState(Boolean(address) && !preset);
  const [latitude, setLatitude] = useState(address ? String(address.latitude) : '');
  const [longitude, setLongitude] = useState(address ? String(address.longitude) : '');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  function validate() {
    const next: Partial<Record<Field, string>> = {};
    const lat = Number(latitude);
    const lon = Number(longitude);

    if (street.trim().length < 3 || street.trim().length > 200) next.street = 'Enter your street address.';
    if (city.trim().length < 2 || city.trim().length > 100) next.city = 'Enter your city.';
    if (postalCode.trim().length < 3 || postalCode.trim().length > 10) {
      next.postalCode = 'Enter a postal code, e.g. H3G 1M8.';
    }
    if (!exact && !neighbourhoodId) next.neighbourhood = 'Choose your neighbourhood.';
    if (exact && (latitude.trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90)) {
      next.latitude = 'Latitude must be between -90 and 90.';
    }
    if (exact && (longitude.trim() === '' || !Number.isFinite(lon) || lon < -180 || lon > 180)) {
      next.longitude = 'Longitude must be between -180 and 180.';
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      logError('UpdateCustomerCommand', Object.values(found).join(' '));
      return;
    }

    const location = exact
      ? { latitude: Number(latitude), longitude: Number(longitude) }
      : montrealNeighbourhoods.find(item => item.id === neighbourhoodId)!;

    await onSave({
      street: street.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  // Switching to exact coordinates starts from the chosen neighbourhood's centre.
  function toggleExact() {
    const chosen = montrealNeighbourhoods.find(item => item.id === neighbourhoodId);
    if (!exact && chosen && !latitude && !longitude) {
      setLatitude(String(chosen.latitude));
      setLongitude(String(chosen.longitude));
    }
    setExact(!exact);
    setErrors({});
  }

  function errorFor(field: Field) {
    return errors[field] ? (
      <p className="field-error" id={`address-${field}-error`}>
        {errors[field]}
      </p>
    ) : null;
  }

  function inputProps(field: Field) {
    return {
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field] ? `address-${field}-error` : undefined,
    };
  }

  return (
    <form className="address-form" onSubmit={handleSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="address-street">Street address</label>
        <input
          id="address-street"
          autoComplete="street-address"
          placeholder="1455 De Maisonneuve Blvd W"
          value={street}
          onChange={event => setStreet(event.target.value)}
          {...inputProps('street')}
        />
        {errorFor('street')}
      </div>

      <div className="address-form-row">
        <div className="field-group">
          <label htmlFor="address-city">City</label>
          <input
            id="address-city"
            autoComplete="address-level2"
            value={city}
            onChange={event => setCity(event.target.value)}
            {...inputProps('city')}
          />
          {errorFor('city')}
        </div>
        <div className="field-group">
          <label htmlFor="address-postal-code">Postal code</label>
          <input
            id="address-postal-code"
            autoComplete="postal-code"
            placeholder="H3G 1M8"
            value={postalCode}
            onChange={event => setPostalCode(event.target.value)}
            {...inputProps('postalCode')}
          />
          {errorFor('postalCode')}
        </div>
      </div>

      {exact ? (
        <div className="address-form-row">
          <div className="field-group">
            <label htmlFor="address-latitude">Latitude</label>
            <input
              id="address-latitude"
              inputMode="decimal"
              placeholder="45.4972"
              value={latitude}
              onChange={event => setLatitude(event.target.value)}
              {...inputProps('latitude')}
            />
            {errorFor('latitude')}
          </div>
          <div className="field-group">
            <label htmlFor="address-longitude">Longitude</label>
            <input
              id="address-longitude"
              inputMode="decimal"
              placeholder="-73.5790"
              value={longitude}
              onChange={event => setLongitude(event.target.value)}
              {...inputProps('longitude')}
            />
            {errorFor('longitude')}
          </div>
        </div>
      ) : (
        <div className="field-group">
          <label htmlFor="address-neighbourhood">Neighbourhood</label>
          <select
            id="address-neighbourhood"
            value={neighbourhoodId}
            onChange={event => setNeighbourhoodId(event.target.value)}
            {...inputProps('neighbourhood')}
          >
            <option value="">Choose your neighbourhood…</option>
            {montrealNeighbourhoods.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {errorFor('neighbourhood')}
          <p className="address-form-hint">Distances to restaurants are measured from the neighbourhood’s centre.</p>
        </div>
      )}

      <div className="address-form-actions">
        <button className="primary-button" type="submit" disabled={busy !== null}>
          Save address
        </button>
        {onCancel ? (
          <button className="ghost-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button className="text-button address-form-toggle" type="button" onClick={toggleExact}>
          {exact ? 'Choose a neighbourhood instead' : 'Enter exact coordinates'}
        </button>
      </div>
    </form>
  );
}
