'use client';

export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  imageUrl?: string;
  priceCents: number;
  quantity: number;
  variant?: Record<string, string>;
};

const KEY = 'gld_cart_v1';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function setCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart:updated'));
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const existing = cart.findIndex(
    (c) => c.productId === item.productId && JSON.stringify(c.variant || {}) === JSON.stringify(item.variant || {})
  );
  if (existing >= 0) {
    cart[existing].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  setCart(cart);
}

export function updateQuantity(index: number, qty: number) {
  const cart = getCart();
  if (cart[index]) {
    if (qty <= 0) cart.splice(index, 1);
    else cart[index].quantity = qty;
    setCart(cart);
  }
}

export function removeFromCart(index: number) {
  const cart = getCart();
  cart.splice(index, 1);
  setCart(cart);
}

export function clearCart() {
  setCart([]);
}

export function cartTotal(): number {
  return getCart().reduce((sum, it) => sum + it.priceCents * it.quantity, 0);
}

export function cartCount(): number {
  return getCart().reduce((sum, it) => sum + it.quantity, 0);
}

export function formatPrice(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}
