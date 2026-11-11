import { useState, type FormEvent } from 'react';
import { logError } from '../../shared/console/outputConsole';
import { findNeighbourhood, montrealNeighbourhoods } from '../../shared/locations/montrealNeighbourhoods';
import type { Position, Restaurant } from '../dashboard/dashboard.types';

type RestaurantDetailsFormProps = {
  restaurant: Restaurant;
  busy: string | null;
  onSave: (name: string, position: Position) => Promise<boolean>;
};

type Field = 'name' | 'neighbourhood' | 'latitude' | 'longitude';

// RestaurantDetailsForm edits what PUT /restaurants/:id accepts: the name and the position.
// Like the customer address, the position comes from a neighbourhood centre or exact
// coordinates; customers' distances are measured to it.
export function RestaurantDetailsForm({ restaurant, busy, onSave }: RestaurantDetailsFormProps) {
  const preset = findNeighbourhood(restaurant.position.latitude, restaurant.position.longitude);
  const [name, setName] = useState(restaurant.name);
  const [neighbourhoodId, setNeighbourhoodId] = useState(preset?.id ?? '');
  // Seeded restaurants sit at exact coordinates that match no neighbourhood centre.
  const [exact, setExact] = useState(!preset);
  const [latitude, setLatitude] = useState(String(restaurant.position.latitude));
  const [longitude, setLongitude] = useState(String(restaurant.position.longitude));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  function validate() {
    const found: Partial<Record<Field, string>> = {};
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (name.trim().length < 3) found.name = 'The name must be at least 3 characters.';
    if (!exact && !neighbourhoodId) found.neighbourhood = 'Choose a neighbourhood.';
    if (exact && (latitude.trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90)) {
      found.latitude = 'Latitude must be between -90 and 90.';
    }
    if (exact && (longitude.trim() === '' || !Number.isFinite(lon) || lon < -180 || lon > 180)) {
      found.longitude = 'Longitude must be between -180 and 180.';
    }
    return found;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      logError('UpdateRestaurantCommand', Object.values(found).join(' '));
      return;
    }

    const chosen = montrealNeighbourhoods.find(item => item.id === neighbourhoodId);
    const position =
      exact || !chosen
        ? { latitude: Number(latitude), longitude: Number(longitude) }
        : { latitude: chosen.latitude, longitude: chosen.longitude };
    await onSave(name.trim(), position);
  }

  function toggleExact() {
    const chosen = montrealNeighbourhoods.find(item => item.id === neighbourhoodId);
    if (!exact && chosen) {
      setLatitude(String(chosen.latitude));
      setLongitude(String(chosen.longitude));
    }
    setExact(!exact);
    setErrors({});
  }

  function inputProps(field: Field) {
    return {
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field] ? `restaurant-${field}-error` : undefined,
    };
  }

  function errorFor(field: Field) {
    return errors[field] ? (
      <p className="field-error" id={`restaurant-${field}-error`}>
        {errors[field]}
      </p>
    ) : null;
  }

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="restaurant-name">Restaurant name</label>
        <input
          id="restaurant-name"
          autoComplete="organization"
          value={name}
          onChange={event => setName(event.target.value)}
          {...inputProps('name')}
        />
        {errorFor('name')}
      </div>

      {exact ? (
        <div className="account-form-row">
          <div className="field-group">
            <label htmlFor="restaurant-latitude">Latitude</label>
            <input
              id="restaurant-latitude"
              className="mono"
              inputMode="decimal"
              value={latitude}
              onChange={event => setLatitude(event.target.value)}
              {...inputProps('latitude')}
            />
            {errorFor('latitude')}
          </div>
          <div className="field-group">
            <label htmlFor="restaurant-longitude">Longitude</label>
            <input
              id="restaurant-longitude"
              className="mono"
              inputMode="decimal"
              value={longitude}
              onChange={event => setLongitude(event.target.value)}
              {...inputProps('longitude')}
            />
            {errorFor('longitude')}
          </div>
        </div>
      ) : (
        <div className="field-group">
          <label htmlFor="restaurant-neighbourhood">Neighbourhood</label>
          <select
            id="restaurant-neighbourhood"
            value={neighbourhoodId}
            onChange={event => setNeighbourhoodId(event.target.value)}
            {...inputProps('neighbourhood')}
          >
            <option value="">Choose a neighbourhood…</option>
            {montrealNeighbourhoods.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {errorFor('neighbourhood')}
        </div>
      )}
      <p className="account-form-hint">Customers’ distances to you are measured from this location.</p>

      <div className="account-form-actions">
        <button className="text-button" type="button" onClick={toggleExact}>
          {exact ? 'Choose a neighbourhood instead' : 'Enter exact coordinates'}
        </button>
        <button className="primary-button" type="submit" disabled={busy !== null}>
          Save details
        </button>
      </div>
    </form>
  );
}
