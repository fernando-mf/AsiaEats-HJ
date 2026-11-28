import { useCallback, useMemo, useState } from 'react';
import type { CustomerPage } from '../../shared/dashboard/dashboardSession';
import type { MenuItem, Restaurant, ShowToast } from './dashboard.types';

type UseCustomerCartParams = {
  initialItems: Record<string, number>;
  menu: MenuItem[];
  selectedRestaurant: string;
  setSelectedRestaurant: (restaurantId: string) => void;
  restaurants: Restaurant[];
  setCustomerPage: (page: CustomerPage) => void;
  showToast: ShowToast;
};

// Owns the customer's cart and the "switch restaurant" confirmation that guards it.
export function useCustomerCart({
  initialItems,
  menu,
  selectedRestaurant,
  setSelectedRestaurant,
  restaurants,
  setCustomerPage,
  showToast,
}: UseCustomerCartParams) {
  const [cart, setCart] = useState<Record<string, number>>(initialItems);
  const [pendingRestaurantId, setPendingRestaurantId] = useState<string | null>(null);
  // A dish waiting to be added once the customer confirms switching restaurants.
  const [pendingDish, setPendingDish] = useState<MenuItem | null>(null);

  const pendingRestaurant = restaurants.find(restaurant => restaurant.id === pendingRestaurantId);
  const cartLines = useMemo(
    () => menu.filter(item => cart[item.id]).map(item => ({ item, quantity: cart[item.id] })),
    [cart, menu],
  );
  const cartTotal = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  // The "added to cart" toasts offer a shortcut to checkout.
  const viewCartAction = { label: 'View cart', onClick: () => setCustomerPage('cart') };

  function clearCart() {
    setCart({});
  }

  // Drops cart entries for dishes the loaded menu no longer has.
  const pruneToMenu = useCallback((loadedMenu: MenuItem[]) => {
    const onMenu = new Set(loadedMenu.map(item => item.id));
    setCart(current => {
      const kept = Object.entries(current).filter(([id]) => onMenu.has(id));
      return kept.length === Object.keys(current).length ? current : Object.fromEntries(kept);
    });
  }, []);

  function addToCart(item: MenuItem) {
    setCart(current => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
    showToast(`${item.name} added to cart.`, 'success', viewCartAction);
  }

  function changeQuantity(item: MenuItem, delta: number) {
    const removesItem = cart[item.id] !== undefined && cart[item.id] + delta <= 0;
    setCart(current => {
      const next = { ...current };
      const quantity = (next[item.id] ?? 0) + delta;
      if (quantity <= 0) delete next[item.id];
      else next[item.id] = quantity;
      return next;
    });
    if (removesItem) showToast(`${item.name} removed from cart.`);
  }

  function selectRestaurant(restaurantId: string) {
    const isDifferentRestaurant = selectedRestaurant !== restaurantId;
    const cartHasItems = Object.keys(cart).length > 0;

    if (isDifferentRestaurant && cartHasItems) {
      setPendingRestaurantId(restaurantId);
      return;
    }

    setSelectedRestaurant(restaurantId);
    setCustomerPage('menu');
  }

  // addDish adds a dish from any restaurant (e.g. from the home page). A cart holds one
  // restaurant's items, so a dish from another restaurant asks to switch first.
  function addDish(item: MenuItem) {
    const otherRestaurant = item.restaurantId !== selectedRestaurant;
    if (otherRestaurant && Object.keys(cart).length > 0) {
      setPendingDish(item);
      setPendingRestaurantId(item.restaurantId);
      return;
    }
    if (otherRestaurant) setSelectedRestaurant(item.restaurantId);
    addToCart(item);
  }

  function cancelRestaurantSwitch() {
    setPendingRestaurantId(null);
    setPendingDish(null);
  }

  function confirmRestaurantSwitch() {
    if (!pendingRestaurantId) return;
    if (pendingDish) {
      setCart({ [pendingDish.id]: 1 });
      setSelectedRestaurant(pendingRestaurantId);
      setPendingRestaurantId(null);
      setPendingDish(null);
      showToast(`Cart cleared. ${pendingDish.name} added to cart.`, 'success', viewCartAction);
      return;
    }
    const restaurantName = pendingRestaurant?.name ?? 'the selected restaurant';
    setCart({});
    setSelectedRestaurant(pendingRestaurantId);
    setCustomerPage('menu');
    setPendingRestaurantId(null);
    showToast(`Cart cleared. Now browsing ${restaurantName}.`);
  }

  return {
    cart,
    cartLines,
    cartTotal,
    cartCount,
    pendingRestaurantId,
    pendingRestaurant,
    clearCart,
    pruneToMenu,
    addToCart,
    changeQuantity,
    selectRestaurant,
    addDish,
    cancelRestaurantSwitch,
    confirmRestaurantSwitch,
  };
}
