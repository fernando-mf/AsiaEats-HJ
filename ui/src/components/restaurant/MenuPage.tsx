import { useState, type FormEvent } from 'react';
import { logError } from '../../shared/console/outputConsole';
import { DishArt } from '../food/DishArt';
import { dishKind } from '../food/dishKind';
import { IconClose, IconPencil, IconPlus, IconSearch } from '../icons/Icons';
import type { MenuItem, MenuItemValues, Restaurant } from '../dashboard/dashboard.types';
import { formatMoney } from '../dashboard/dashboard.utils';
import './restaurant-menu.css';

type MenuPageProps = {
  restaurant?: Restaurant;
  menu: MenuItem[];
  busy: string | null;
  // Creates a dish when itemId is null; resolves to the saved dish, or undefined on failure.
  onSave: (itemId: string | null, values: MenuItemValues) => Promise<MenuItem | undefined>;
  onSetAvailability: (item: MenuItem, available: boolean) => void;
  onDelete: (item: MenuItem) => Promise<boolean>;
};

type Filter = 'all' | 'available' | 'sold_out';

const filters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All dishes' },
  { value: 'available', label: 'Available' },
  { value: 'sold_out', label: 'Sold out' },
];

// MenuPage lists the restaurant's dishes with an availability switch on each row, and edits
// the selected dish (or a new one) in the panel beside the list.
export function MenuPage({ restaurant, menu, busy, onSave, onSetAvailability, onDelete }: MenuPageProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const soldOut = menu.filter(item => item.status === 'sold_out').length;
  const counts: Record<Filter, number> = { all: menu.length, available: menu.length - soldOut, sold_out: soldOut };
  const search = query.trim().toLowerCase();
  const visible = menu.filter(
    item => (filter === 'all' || item.status === filter) && (!search || item.name.toLowerCase().includes(search)),
  );
  const selected = creating ? undefined : menu.find(item => item.id === selectedId);

  function select(item: MenuItem) {
    setCreating(false);
    setSelectedId(item.id);
  }

  function startNew() {
    setSelectedId(null);
    setCreating(true);
  }

  function closeEditor() {
    setSelectedId(null);
    setCreating(false);
  }

  async function save(values: MenuItemValues) {
    const saved = await onSave(creating ? null : (selected?.id ?? null), values);
    if (saved) {
      setCreating(false);
      setSelectedId(saved.id);
    }
    return saved !== undefined;
  }

  async function remove() {
    if (selected && (await onDelete(selected))) closeEditor();
  }

  return (
    <div className="menu-page">
      <div className="menu-page-head">
        <div>
          <p className="eyebrow">{restaurant ? `${restaurant.name} · Menu` : 'Menu'}</p>
          <h1>Menu</h1>
        </div>
        <div className="menu-page-actions">
          <label className="menu-search">
            <IconSearch size={16} />
            <input
              type="search"
              aria-label="Search dishes"
              placeholder="Search dishes"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <button className="primary-button" type="button" onClick={startNew}>
            <IconPlus size={16} />
            Add dish
          </button>
        </div>
      </div>

      <p className="mono menu-summary">
        {menu.length} {menu.length === 1 ? 'dish' : 'dishes'} · {soldOut} sold out
      </p>

      <div className="menu-filters" role="group" aria-label="Show dishes">
        {filters.map(option => (
          <button
            key={option.value}
            type="button"
            className="chip"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
            <span className="mono menu-filter-count">{counts[option.value]}</span>
          </button>
        ))}
      </div>

      <div className="menu-layout">
        <section className="card menu-list" aria-label="Dishes">
          <div className="menu-list-head mono" aria-hidden="true">
            <span>Dish</span>
            <span>Price</span>
            <span>Availability</span>
            <span />
          </div>

          {visible.length ? (
            visible.map(item => {
              const available = item.status === 'available';
              return (
                <div
                  key={item.id}
                  className={`menu-row${item.id === selected?.id ? ' is-selected' : ''}${available ? '' : ' is-sold-out'}`}
                >
                  <button className="menu-row-main" type="button" onClick={() => select(item)}>
                    <DishArt kind={dishKind(item.name)} className="menu-row-thumb" iconSize={24} />
                    <span className="menu-row-name">{item.name}</span>
                  </button>
                  <span className="mono menu-row-price">{formatMoney(item.price)}</span>
                  <span className={`menu-row-availability${available ? ' is-available' : ''}`}>
                    <button
                      type="button"
                      role="switch"
                      className="switch"
                      aria-checked={available}
                      aria-label={`Available: ${item.name}`}
                      disabled={busy !== null}
                      onClick={() => onSetAvailability(item, !available)}
                    >
                      <span />
                    </button>
                    {available ? 'Available' : 'Sold out'}
                  </span>
                  <button
                    className="ghost-button icon-button"
                    type="button"
                    aria-label={`Edit ${item.name}`}
                    onClick={() => select(item)}
                  >
                    <IconPencil size={16} />
                  </button>
                </div>
              );
            })
          ) : (
            <p className="menu-empty">
              {menu.length
                ? 'No dishes match. Try another search or filter.'
                : 'Your menu is empty. Use Add dish to create your first one.'}
            </p>
          )}
        </section>

        {creating || selected ? (
          <MenuItemEditor
            // A new key whenever the saved values change, so the fields start from them.
            key={selected ? `${selected.id}|${selected.name}|${selected.price}|${selected.status}` : 'new'}
            item={selected}
            busy={busy}
            onSave={save}
            onDelete={() => void remove()}
            onClose={closeEditor}
          />
        ) : (
          <aside className="card menu-editor menu-editor--empty">
            <p>Pick a dish to edit its name, price or availability, or add a new one.</p>
            <button className="secondary-button" type="button" onClick={startNew}>
              <IconPlus size={16} />
              Add dish
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}

type MenuItemEditorProps = {
  // undefined while adding a new dish.
  item?: MenuItem;
  busy: string | null;
  onSave: (values: MenuItemValues) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
};

// Prices follow the backend rule: zero or more, with at most 2 decimals.
const pricePattern = /^\d+(\.\d{1,2})?$/;

function MenuItemEditor({ item, busy, onSave, onDelete, onClose }: MenuItemEditorProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? item.price.toFixed(2) : '');
  const [available, setAvailable] = useState(item ? item.status === 'available' : true);
  const [error, setError] = useState<string | null>(null);
  // Delete asks for a second click instead of a browser dialog.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const command = item ? 'UpdateMenuItemCommand' : 'CreateMenuItemCommand';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPrice = price.trim().replace(',', '.');
    let message: string | null = null;
    if (!trimmedName || trimmedName.length > 120) message = 'Give the dish a name (up to 120 characters).';
    else if (!pricePattern.test(trimmedPrice)) message = 'Enter a price like 14.50, with at most 2 decimals.';
    setError(message);
    if (message) {
      logError(command, message);
      return;
    }
    await onSave({ name: trimmedName, price: Number(trimmedPrice), status: available ? 'available' : 'sold_out' });
  }

  return (
    <aside className="card menu-editor" aria-labelledby="menu-editor-title">
      <div className="menu-editor-head">
        <h2 id="menu-editor-title">{item ? 'Edit dish' : 'New dish'}</h2>
        <button className="ghost-button icon-button" type="button" aria-label="Close editor" onClick={onClose}>
          <IconClose size={16} />
        </button>
      </div>

      <DishArt kind={dishKind(name)} className="menu-editor-art" iconSize={40} />

      <form className="menu-editor-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="menu-item-name">Name</label>
          <input
            id="menu-item-name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="e.g. Pork dumplings"
            autoFocus={!item}
          />
        </div>
        <div className="field-group">
          <label htmlFor="menu-item-price">Price (CAD)</label>
          <div className="menu-price-input">
            <span className="mono" aria-hidden="true">
              $
            </span>
            <input
              id="menu-item-price"
              className="mono"
              inputMode="decimal"
              value={price}
              onChange={event => setPrice(event.target.value)}
              placeholder="12.50"
            />
          </div>
        </div>

        <div className="menu-availability-row">
          <div>
            <strong id="menu-item-available-label">{available ? 'Available' : 'Sold out'}</strong>
            <span>Customers can’t order sold-out dishes.</span>
          </div>
          <button
            type="button"
            role="switch"
            className="switch"
            aria-checked={available}
            aria-labelledby="menu-item-available-label"
            onClick={() => setAvailable(!available)}
          >
            <span />
          </button>
        </div>

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="menu-editor-actions">
          {item ? (
            <button
              className="secondary-button menu-delete-button"
              type="button"
              disabled={busy !== null}
              onClick={() => (confirmingDelete ? onDelete() : setConfirmingDelete(true))}
            >
              {confirmingDelete ? 'Click again to delete' : 'Delete'}
            </button>
          ) : null}
          <span className="menu-editor-spacer" />
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={busy !== null}>
            {item ? 'Save dish' : 'Add dish'}
          </button>
        </div>
      </form>
    </aside>
  );
}
