import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiErrorMessage, clearAccessToken, getAccessToken, requestJson } from '../shared/api/client';
import './dashboard.css';

type Role = 'customer' | 'restaurant' | 'courier' | 'operator';
type Account = { id: string; username: string; name: string; role: Role; email?: string; createdAt?: string };
type Restaurant = { id: string; ownerId: string; name: string; status: 'open' | 'paused' | 'closed' };
type MenuItem = { id: string; restaurantId: string; name: string; price: number; status: 'available' | 'sold_out' };
type OrderLine = { id: string; menuItemId: string; name: string; unitPrice: number; quantity: number };
type Order = { id: string; customerId: string; restaurantId: string; status: string; rejectionReason?: string; lines: OrderLine[]; createdAt: string };
type CustomerPage = 'restaurants' | 'menu' | 'cart' | 'profile';
type RestaurantPage = 'orders' | 'menu' | 'profile';
type MenuDraft = { name: string; price: string; quantity: string; status: 'available' | 'sold_out' };

function money(value: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}
function orderTotal(order: Order) {
  return order.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [customerPage, setCustomerPage] = useState<CustomerPage>('restaurants');
  const [restaurantPage, setRestaurantPage] = useState<RestaurantPage>('orders');
  const [menuDraft, setMenuDraft] = useState<MenuDraft>({ name: '', price: '', quantity: '0', status: 'available' });
  const [editingMenuItem, setEditingMenuItem] = useState<string | null>(null);
  const [restaurantEmail, setRestaurantEmail] = useState('');

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setBusy('loading');
    setErrorMessage('');
    try {
      return await action();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error));
      if (error instanceof ApiError && error.code === 'unauthenticated') {
        clearAccessToken();
        navigate('/login', { replace: true });
      }
      return undefined;
    } finally {
      setBusy(null);
    }
  }, [navigate]);

  const loadAccount = useCallback(async () => {
    const result = await run(() => requestJson<Account>('/auth/me'));
    if (result) setAccount(result);
  }, [run]);

  const loadRestaurants = useCallback(async () => {
    const result = await run(() => requestJson<Restaurant[]>('/restaurants'));
    if (result) {
      setRestaurants(result);
      const preferred = account?.role === 'restaurant' ? result.find(r => r.ownerId === account.id) : undefined;
      setSelectedRestaurant(current => current || preferred?.id || result[0]?.id || '');
    }
  }, [account, run]);

  const loadMenu = useCallback(async (restaurantId: string) => {
    const result = await run(() => requestJson<MenuItem[]>(`/restaurants/${restaurantId}/menu`));
    if (result) setMenu(result);
  }, [run]);

  const loadOrders = useCallback(async () => {
    if (!account) return;
    const query = account.role === 'restaurant'
      ? (selectedRestaurant ? `?restaurantId=${encodeURIComponent(selectedRestaurant)}` : '')
      : account.role === 'customer' ? `?customerId=${encodeURIComponent(account.id)}` : '';
    const result = await run(() => requestJson<Order[]>(`/orders${query}`));
    if (result) setOrders(result);
  }, [account, run, selectedRestaurant]);

  useEffect(() => {
    if (!getAccessToken()) { navigate('/login', { replace: true }); return; }
    void loadAccount();
  }, [loadAccount, navigate]);

  useEffect(() => {
    if (account && (account.role === 'customer' || account.role === 'restaurant')) void loadRestaurants();
  }, [account, loadRestaurants]);

  useEffect(() => {
    if (selectedRestaurant) void loadMenu(selectedRestaurant);
  }, [selectedRestaurant, loadMenu]);

  useEffect(() => {
    if (account && (account.role === 'customer' || account.role === 'restaurant')) void loadOrders();
  }, [account, loadOrders]);

  const selected = restaurants.find(restaurant => restaurant.id === selectedRestaurant);
  const ownedRestaurant = account?.role === 'restaurant' ? restaurants.find(r => r.ownerId === account.id) : undefined;
  const restaurantQuantityKey = ownedRestaurant ? `asiaeats-menu-quantities-${ownedRestaurant.id}` : '';
  const [menuQuantities, setMenuQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ownedRestaurant || typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(`asiaeats-menu-quantities-${ownedRestaurant.id}`);
      setMenuQuantities(saved ? JSON.parse(saved) as Record<string, number> : {});
      setRestaurantEmail(window.localStorage.getItem(`asiaeats-restaurant-email-${ownedRestaurant.id}`) ?? '');
    } catch {
      setMenuQuantities({});
    }
  }, [ownedRestaurant?.id]);
  const cartLines = useMemo(() => menu.filter(item => cart[item.id]).map(item => ({ item, quantity: cart[item.id] })), [cart, menu]);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  function addToCart(item: MenuItem) {
    setCart(current => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
  }
  function changeQuantity(item: MenuItem, delta: number) {
    setCart(current => {
      const next = { ...current };
      const quantity = (next[item.id] ?? 0) + delta;
      if (quantity <= 0) delete next[item.id]; else next[item.id] = quantity;
      return next;
    });
  }
  async function placeOrder() {
    if (!selectedRestaurant || !cartLines.length) return;
    const result = await run(() => requestJson<Order>('/orders', {
      method: 'POST',
      body: { restaurantId: selectedRestaurant, items: cartLines.map(({ item, quantity }) => ({ menuItemId: item.id, quantity })) },
    }));
    if (result) {
      setCart({});
      setCustomerPage('profile');
      await loadOrders();
    }
  }
  async function orderAction(order: Order, action: 'accept' | 'reject' | 'prepare' | 'ready') {
    const body = action === 'reject' ? { reason: window.prompt('Why is this order being rejected?') ?? '' } : undefined;
    if (action === 'reject' && (!body || body.reason.trim().length < 3)) {
      setErrorMessage('Please enter a rejection reason of at least 3 characters.');
      return;
    }
    const result = await run(() => requestJson<Order>(`/orders/${order.id}/${action}`, { method: 'POST', body }));
    if (result) await loadOrders();
  }
  function saveMenuQuantities(next: Record<string, number>) {
    setMenuQuantities(next);
    if (restaurantQuantityKey) window.localStorage.setItem(restaurantQuantityKey, JSON.stringify(next));
  }
  function startEditingMenuItem(item: MenuItem) {
    setEditingMenuItem(item.id);
    setMenuDraft({ name: item.name, price: String(item.price), quantity: String(menuQuantities[item.id] ?? 0), status: item.status });
  }
  function resetMenuDraft() {
    setEditingMenuItem(null);
    setMenuDraft({ name: '', price: '', quantity: '0', status: 'available' });
  }
  async function saveMenuItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownedRestaurant) return;
    const name = menuDraft.name.trim();
    const price = Number(menuDraft.price);
    const quantity = Number(menuDraft.quantity);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 0) {
      setErrorMessage('Enter an item name, a valid non-negative price, and a whole-number quantity.');
      return;
    }
    const body = { name, price, status: menuDraft.status };
    const result = await run(() => requestJson<MenuItem>(editingMenuItem
      ? `/restaurants/${ownedRestaurant.id}/menu-items/${editingMenuItem}`
      : `/restaurants/${ownedRestaurant.id}/menu-items`, { method: editingMenuItem ? 'PUT' : 'POST', body }));
    if (result) {
      saveMenuQuantities({ ...menuQuantities, [result.id]: quantity });
      await loadMenu(ownedRestaurant.id);
      resetMenuDraft();
    }
  }
  async function deleteMenuItem(item: MenuItem) {
    if (!ownedRestaurant || !window.confirm(`Delete “${item.name}” from your menu?`)) return;
    const result = await run(async () => { await requestJson<void>(`/restaurants/${ownedRestaurant.id}/menu-items/${item.id}`, { method: 'DELETE' }); return true; });
    if (result !== undefined) {
      const next = { ...menuQuantities };
      delete next[item.id];
      saveMenuQuantities(next);
      await loadMenu(ownedRestaurant.id);
      if (editingMenuItem === item.id) resetMenuDraft();
    }
  }
  function saveRestaurantEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownedRestaurant) return;
    window.localStorage.setItem(`asiaeats-restaurant-email-${ownedRestaurant.id}`, restaurantEmail.trim());
    setErrorMessage('');
  }
  function logout() {
    clearAccessToken();
    navigate('/login', { replace: true });
  }

  const roleLabel = account?.role ? account.role.charAt(0).toUpperCase() + account.role.slice(1) : 'Account';
  const customerNav = [
    { id: 'restaurants' as const, label: 'Restaurants', icon: '⌂' },
    { id: 'cart' as const, label: `Cart${cartCount ? ` (${cartCount})` : ''}`, icon: '🛒' },
    { id: 'profile' as const, label: 'My profile', icon: '○' },
  ];

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header site-header">
        <button className="brand-mark" onClick={() => setCustomerPage('restaurants')} aria-label="AsiaEats home"><span className="brand-icon">A</span><span>AsiaEats<small>GOOD FOOD, GOOD MOOD</small></span></button>
        <div className="header-actions">
          {account?.role === 'customer' ? customerNav.map(item => (
            <button key={item.id} className={`nav-button ${customerPage === item.id || (item.id === 'restaurants' && customerPage === 'menu') ? 'active' : ''}`} onClick={() => setCustomerPage(item.id)}>
              <span>{item.icon}</span> {item.label}
            </button>
          )) : null}
          {account ? <span className="welcome-user">Hi, {account.name}</span> : null}
          <button className="secondary-button" onClick={logout}>Sign out</button>
        </div>
      </header>

      {errorMessage ? <div className="app-alert" role="alert">{errorMessage}<button onClick={() => setErrorMessage('')} aria-label="Dismiss message">×</button></div> : null}

      <div className="dashboard-main customer-main">
        {account?.role === 'customer' ? (
          <>
            {customerPage === 'restaurants' ? <>
              <section className="welcome-banner">
                <p className="eyebrow">YOUR NEXT FAVOURITE MEAL</p>
                <h1>Cravings? We’ve got you.</h1>
                <p>Explore local flavours and find something delicious today.</p>
              </section>
              <section className="panel storefront-panel">
                <div className="panel-heading"><div><p className="eyebrow">EXPLORE</p><h2>All restaurants</h2><p className="muted">Choose a restaurant to discover its full menu.</p></div><button className="secondary-button" onClick={() => void loadRestaurants()} disabled={busy !== null}>Refresh</button></div>
                {restaurants.length ? <div className="restaurant-grid storefront-grid">{restaurants.map((restaurant, index) => (
                  <button className="restaurant-card storefront-card" key={restaurant.id} onClick={() => { if (selectedRestaurant !== restaurant.id) setCart({}); setSelectedRestaurant(restaurant.id); setCustomerPage('menu'); }}>
                    <span className={`restaurant-art art-${index % 5}`}>{['🥢', '🍜', '🥟', '🍚', '🍲'][index % 5]}</span>
                    <span className={`restaurant-status status-${restaurant.status}`}><i />{restaurant.status}</span>
                    <strong>{restaurant.name}</strong><span className="restaurant-card-caption">Explore menu <b>→</b></span>
                  </button>
                ))}</div> : <p className="empty">No restaurants are listed yet. Try refreshing in a moment.</p>}
              </section>
              <section className="panel order-history-preview"><div className="panel-heading"><div><p className="eyebrow">YOUR ACTIVITY</p><h2>Recent orders</h2></div><button className="text-button" onClick={() => setCustomerPage('profile')}>View all →</button></div><OrderList orders={orders.slice(0, 3)} restaurants={restaurants} /></section>
            </> : null}

            {customerPage === 'menu' ? <section className="panel storefront-panel">
              <button className="back-link" onClick={() => setCustomerPage('restaurants')}>← All restaurants</button>
              <div className="menu-hero"><span className="menu-hero-art">🥢</span><div><p className="eyebrow">RESTAURANT MENU</p><h1>{selected?.name ?? 'Restaurant menu'}</h1><p className="muted">Freshly made favourites, ready to order.</p><span className={`restaurant-status status-${selected?.status ?? 'closed'}`}><i />{selected?.status ?? 'status unavailable'}</span></div></div>
              <div className="panel-heading menu-heading"><div><h2>Full menu</h2><p className="muted">Choose your favourites and add them to your cart.</p></div><button className="primary-button" onClick={() => setCustomerPage('cart')}>View cart · {cartCount}</button></div>
              {menu.length ? <div className="menu-list">{menu.map(item => <article className="menu-item storefront-menu-item" key={item.id}><div className="dish-icon">{item.name.toLowerCase().includes('soup') ? '🍲' : item.name.toLowerCase().includes('duck') || item.name.toLowerCase().includes('chicken') ? '🍗' : item.name.toLowerCase().includes('dumpling') ? '🥟' : '🍜'}</div><div className="dish-description"><strong>{item.name}</strong><span>{item.status === 'available' ? 'Made fresh to order' : 'Currently sold out'}</span></div><div className="menu-action"><b>{money(item.price)}</b><button className="small-button" disabled={item.status !== 'available' || busy !== null} onClick={() => addToCart(item)}>{cart[item.id] ? `Add more (${cart[item.id]})` : 'Add to cart +'}</button></div></article>)}</div> : <p className="empty">This restaurant hasn’t added menu items yet.</p>}
            </section> : null}

            {customerPage === 'cart' ? <section className="panel storefront-panel narrow-panel"><div className="panel-heading"><div><p className="eyebrow">READY WHEN YOU ARE</p><h1>Your cart</h1><p className="muted">Review your order before sending it to the restaurant.</p></div></div>
              {cartLines.length ? <><div className="cart-restaurant-note">Ordering from <strong>{selected?.name ?? 'your selected restaurant'}</strong></div><div className="cart-list">{cartLines.map(({ item, quantity }) => <div className="cart-row storefront-cart-row" key={item.id}><div><strong>{item.name}</strong><small>{money(item.price)} each</small></div><div className="quantity-control"><button onClick={() => changeQuantity(item, -1)} aria-label={`Remove one ${item.name}`}>−</button><span>{quantity}</span><button onClick={() => changeQuantity(item, 1)} aria-label={`Add one ${item.name}`}>+</button></div><strong>{money(item.price * quantity)}</strong></div>)}</div><div className="cart-total"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><p className="muted checkout-note">Delivery fees, if applicable, are not included in this demo.</p><button className="primary-button checkout-button" disabled={busy !== null} onClick={() => void placeOrder()}>{busy ? 'Placing order…' : 'Place order · ' + money(cartTotal)}</button><button className="back-link centered-link" onClick={() => setCustomerPage('menu')}>← Continue browsing</button></> : <div className="empty-cart"><span>🛒</span><h2>Your cart is waiting</h2><p>Add something delicious from a restaurant menu to get started.</p><button className="primary-button" onClick={() => setCustomerPage('restaurants')}>Browse restaurants</button></div>}
            </section> : null}

            {customerPage === 'profile' ? <>
              <section className="profile-banner"><div className="profile-avatar">{account.name.trim().charAt(0).toUpperCase()}</div><div><p className="eyebrow">YOUR ACCOUNT</p><h1>{account.name}</h1><p>Manage your details and keep track of your orders.</p></div></section>
              <section className="panel storefront-panel"><div className="panel-heading"><div><p className="eyebrow">PERSONAL INFORMATION</p><h2>Profile details</h2></div></div><div className="profile-details"><div className="profile-detail"><span>Full name</span><strong>{account.name}</strong></div><div className="profile-detail"><span>Username</span><strong>@{account.username}</strong></div><div className="profile-detail"><span>Email address</span><strong>{account.email || 'Not provided for this account'}</strong>{!account.email ? <small>This version of AsiaEats uses usernames to sign in and does not currently store an email address.</small> : null}</div><div className="profile-detail"><span>Account type</span><strong>{roleLabel}</strong></div></div></section>
              <section className="panel storefront-panel"><div className="panel-heading"><div><p className="eyebrow">ORDER HISTORY</p><h2>Your previous orders</h2><p className="muted">Track the status and total of each order you’ve placed.</p></div><button className="secondary-button" onClick={() => void loadOrders()} disabled={busy !== null}>Refresh</button></div><OrderList orders={orders} restaurants={restaurants} /></section>
            </> : null}
          </>
        ) : account?.role === 'restaurant' ? <>
          <section className="welcome-banner restaurant-welcome"><p className="eyebrow">RESTAURANT PORTAL</p><h1>{ownedRestaurant?.name ?? 'Your restaurant'}</h1><p>Manage your restaurant profile, menu, and incoming orders.</p><div className="restaurant-tabs"><button className={`nav-button ${restaurantPage === 'orders' ? 'active' : ''}`} onClick={() => setRestaurantPage('orders')}>Incoming orders</button><button className={`nav-button ${restaurantPage === 'menu' ? 'active' : ''}`} onClick={() => setRestaurantPage('menu')}>Edit menu</button><button className={`nav-button ${restaurantPage === 'profile' ? 'active' : ''}`} onClick={() => setRestaurantPage('profile')}>Restaurant profile</button></div></section>
          {restaurantPage === 'orders' ? <section className="panel storefront-panel"><div className="panel-heading"><div><p className="eyebrow">ORDER WORKFLOW</p><h2>Incoming orders</h2><p className="muted">Accept orders, start preparing them, and mark them ready.</p></div><button className="secondary-button" onClick={() => void loadOrders()} disabled={busy !== null}>Refresh orders</button></div><div className="lifecycle"><span>Placed</span><i>→</i><span>Accepted</span><i>→</i><span>Preparing</span><i>→</i><span>Ready</span></div><RestaurantOrders orders={orders} busy={busy} onAction={orderAction} restaurants={restaurants} /></section> : null}
          {restaurantPage === 'menu' ? <section className="panel storefront-panel"><div className="panel-heading"><div><p className="eyebrow">MENU MANAGEMENT</p><h2>{editingMenuItem ? 'Edit menu item' : 'Add a menu item'}</h2><p className="muted">Create new dishes or update items already on your menu.</p></div><button className="secondary-button" onClick={() => ownedRestaurant && void loadMenu(ownedRestaurant.id)} disabled={busy !== null}>Refresh menu</button></div>
            <form className="menu-editor-form" onSubmit={saveMenuItem}><label>Article name<input required maxLength={120} value={menuDraft.name} onChange={event => setMenuDraft(current => ({ ...current, name: event.target.value }))} placeholder="e.g. Vegetable dumplings" /></label><div className="menu-form-grid"><label>Price (CAD)<input required type="number" min="0" step="0.01" value={menuDraft.price} onChange={event => setMenuDraft(current => ({ ...current, price: event.target.value }))} placeholder="12.50" /></label><label>Quantity available<input required type="number" min="0" step="1" value={menuDraft.quantity} onChange={event => setMenuDraft(current => ({ ...current, quantity: event.target.value }))} /></label><label>Availability<select value={menuDraft.status} onChange={event => setMenuDraft(current => ({ ...current, status: event.target.value as MenuDraft['status'] }))}><option value="available">Available</option><option value="sold_out">Sold out</option></select></label></div><div className="menu-form-actions"><button className="primary-button" type="submit" disabled={busy !== null}>{busy ? 'Saving…' : editingMenuItem ? 'Save changes' : 'Add article'}</button>{editingMenuItem ? <button className="secondary-button" type="button" onClick={resetMenuDraft}>Cancel edit</button> : null}</div><p className="muted menu-quantity-note">Quantity is saved in this browser only. The current backend does not store stock quantities.</p></form>
            <div className="panel-heading menu-existing-heading"><div><h2>Current menu</h2><p className="muted">Edit the name, price, quantity, or availability at any time.</p></div></div>{menu.length ? <div className="managed-menu-list">{menu.map(item => <article className="managed-menu-item" key={item.id}><div className="managed-menu-info"><strong>{item.name}</strong><span>{money(item.price)} · {menuQuantities[item.id] ?? 0} in stock</span><span className={`restaurant-status status-${item.status === 'available' ? 'open' : 'closed'}`}><i />{item.status === 'available' ? 'Available' : 'Sold out'}</span></div><div className="managed-menu-actions"><button className="secondary-button" onClick={() => startEditingMenuItem(item)}>Edit</button><button className="danger-button" disabled={busy !== null} onClick={() => void deleteMenuItem(item)}>Delete</button></div></article>)}</div> : <p className="empty">Your menu is empty. Use the form above to add your first article.</p>}
          </section> : null}
          {restaurantPage === 'profile' ? <><section className="profile-banner"><div className="profile-avatar">{(ownedRestaurant?.name ?? account.name).trim().charAt(0).toUpperCase()}</div><div><p className="eyebrow">RESTAURANT PROFILE</p><h1>{ownedRestaurant?.name ?? 'Your restaurant'}</h1><p>Review your restaurant and account details.</p></div></section><section className="panel storefront-panel"><div className="panel-heading"><div><p className="eyebrow">RESTAURANT DETAILS</p><h2>Profile information</h2></div></div><div className="profile-details"><div className="profile-detail"><span>Restaurant name</span><strong>{ownedRestaurant?.name ?? 'Not available'}</strong></div><div className="profile-detail"><span>Restaurant status</span><strong>{ownedRestaurant?.status ?? 'Not available'}</strong></div><div className="profile-detail"><span>Account name</span><strong>{account.name}</strong></div><div className="profile-detail"><span>Username</span><strong>@{account.username}</strong></div></div><form className="restaurant-email-form" onSubmit={saveRestaurantEmail}><label>Contact email<input type="email" value={restaurantEmail} onChange={event => setRestaurantEmail(event.target.value)} placeholder="restaurant@example.com" /></label><button className="primary-button" type="submit">Save email on this device</button><p className="muted">Frontend-only: this contact email is saved in this browser, not to your account or the server.</p></form></section></> : null}
        </> : account ? <section className="panel"><h1>{roleLabel} account</h1><p className="muted">This demo currently focuses on customer ordering and restaurant order management.</p></section> : <section className="panel"><p className="muted">Loading your account…</p></section>}
      </div>
      <footer className="site-footer"><strong>AsiaEats</strong><span>Discover a little more delicious.</span></footer>
    </main>
  );
}

function OrderList({ orders, restaurants }: { orders: Order[]; restaurants: Restaurant[] }) {
  if (!orders.length) return <p className="empty">No orders yet. Once you place an order, it will appear here.</p>;
  return <div className="order-list">{orders.map(order => <article className="order-card" key={order.id}><div><strong>Order #{order.id.slice(0, 8)}</strong><span className="order-restaurant-name">{restaurants.find(r => r.id === order.restaurantId)?.name ?? 'Restaurant'}</span><span>{order.lines.map(line => `${line.name} × ${line.quantity}`).join(', ')}</span><small>{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</small></div><div className="order-meta"><span className={`order-status status-pill-${order.status}`}>{order.status.replace('_', ' ')}</span><b>{money(orderTotal(order))}</b></div></article>)}</div>;
}

function RestaurantOrders({ orders, busy, onAction, restaurants }: { orders: Order[]; busy: string | null; onAction: (order: Order, action: 'accept' | 'reject' | 'prepare' | 'ready') => Promise<void>; restaurants: Restaurant[] }) {
  if (!orders.length) return <p className="empty">No incoming orders yet. A customer order will appear here.</p>;
  return <div className="order-list">{orders.map(order => <article className="order-card order-card-large" key={order.id}><div className="order-details"><div className="order-title"><strong>Order #{order.id.slice(0, 8)}</strong><span className={`order-status status-pill-${order.status}`}>{order.status.replace('_', ' ')}</span></div><span>{restaurants.find(r => r.id === order.restaurantId)?.name}</span><span>{order.lines.map(line => `${line.name} × ${line.quantity}`).join(', ')}</span><b>{money(orderTotal(order))}</b>{order.rejectionReason ? <small>Reason: {order.rejectionReason}</small> : null}</div><div className="order-controls">{order.status === 'placed' ? <><button className="primary-button small" disabled={busy !== null} onClick={() => void onAction(order, 'accept')}>Accept</button><button className="danger-button" disabled={busy !== null} onClick={() => void onAction(order, 'reject')}>Reject</button></> : null}{order.status === 'accepted' ? <button className="primary-button small" disabled={busy !== null} onClick={() => void onAction(order, 'prepare')}>Start preparing</button> : null}{order.status === 'preparing' ? <button className="primary-button small" disabled={busy !== null} onClick={() => void onAction(order, 'ready')}>Mark ready</button> : null}</div></article>)}</div>;
}
