import type { FormEvent } from 'react';
import type { MenuDraft, MenuItem } from '../dashboard/dashboard.types';
import { formatMoney } from '../dashboard/dashboard.utils';

type MenuManagerProps = {
  menu: MenuItem[];
  draft: MenuDraft;
  quantities: Record<string, number>;
  editingItemId: string | null;
  busy: string | null;
  onDraftChange: (draft: MenuDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onRefresh: () => void;
};

export function MenuManager({
  menu,
  draft,
  quantities,
  editingItemId,
  busy,
  onDraftChange,
  onSubmit,
  onCancelEdit,
  onEdit,
  onDelete,
  onRefresh,
}: MenuManagerProps) {
  return (
    <section className="panel storefront-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">MENU MANAGEMENT</p>
          <h2>{editingItemId ? 'Edit menu item' : 'Add a menu item'}</h2>
          <p className="muted">Create new dishes or update items already on your menu.</p>
        </div>
        <button className="secondary-button" onClick={onRefresh} disabled={busy !== null}>
          Refresh menu
        </button>
      </div>
      <form className="menu-editor-form" onSubmit={onSubmit}>
        <label>
          Article name
          <input
            required
            maxLength={120}
            value={draft.name}
            onChange={event => onDraftChange({ ...draft, name: event.target.value })}
            placeholder="e.g. Vegetable dumplings"
          />
        </label>
        <div className="menu-form-grid">
          <label>
            Price (CAD)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={draft.price}
              onChange={event => onDraftChange({ ...draft, price: event.target.value })}
              placeholder="12.50"
            />
          </label>
          <label>
            Quantity available
            <input
              required
              type="number"
              min="0"
              step="1"
              value={draft.quantity}
              onChange={event => onDraftChange({ ...draft, quantity: event.target.value })}
            />
          </label>
          <label>
            Availability
            <select
              value={draft.status}
              onChange={event => onDraftChange({ ...draft, status: event.target.value as MenuDraft['status'] })}
            >
              <option value="available">Available</option>
              <option value="sold_out">Sold out</option>
            </select>
          </label>
        </div>
        <div className="menu-form-actions">
          <button className="primary-button" type="submit" disabled={busy !== null}>
            {busy ? 'Saving…' : editingItemId ? 'Save changes' : 'Add article'}
          </button>
          {editingItemId ? (
            <button className="secondary-button" type="button" onClick={onCancelEdit}>
              Cancel edit
            </button>
          ) : null}
        </div>
        <p className="muted menu-quantity-note">
          Quantity is saved in this browser only. The current backend does not store stock quantities.
        </p>
      </form>
      <div className="panel-heading menu-existing-heading">
        <div>
          <h2>Current menu</h2>
          <p className="muted">Edit the name, price, quantity, or availability at any time.</p>
        </div>
      </div>
      {menu.length ? (
        <div className="managed-menu-list">
          {menu.map(item => (
            <article className="managed-menu-item" key={item.id}>
              <div className="managed-menu-info">
                <strong>{item.name}</strong>
                <span>
                  {formatMoney(item.price)} · {quantities[item.id] ?? 0} in stock
                </span>
                <span className={`restaurant-status status-${item.status === 'available' ? 'open' : 'closed'}`}>
                  <i />
                  {item.status === 'available' ? 'Available' : 'Sold out'}
                </span>
              </div>
              <div className="managed-menu-actions">
                <button className="secondary-button" onClick={() => onEdit(item)}>
                  Edit
                </button>
                <button className="danger-button" disabled={busy !== null} onClick={() => onDelete(item)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty">Your menu is empty. Use the form above to add your first article.</p>
      )}
    </section>
  );
}
