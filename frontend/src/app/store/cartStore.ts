/**
 * BrewLite — Zustand Cart Store (Task 5)
 * Single source of truth for cart state across the entire app.
 * Replaces the local useState approach in MenuPage.
 *
 * Unicode NFC standard: all Vietnamese string operations use .normalize("NFC")
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  /** unique instance identifier in cart */
  cartItemId?: string;
  /** product id */
  id: number;
  name: string;
  /** unit price (after size/topping adjustments) */
  price: number;
  temp: string;
  quantity: number;
  size?: string;
  toppings?: string[];
  notes?: string;
  /** thumbnail URL for cart display */
  imageUrl?: string | null;
}

/** Unique key used to detect duplicate cart entries */
function itemKey(item: Pick<CartItem, "id" | "size" | "temp" | "toppings">): string {
  const toppings = [...(item.toppings ?? [])].sort().join(",");
  return `${item.id}|${item.size ?? "M"}|${item.temp}|${toppings}`;
}

interface CartState {
  items: CartItem[];

  // ── Mutations ──────────────────────────────────────────────────────────────
  /** Add an item or merge into existing identical entry */
  addItem: (item: CartItem) => void;
  /** Set absolute quantity for a specific item key or cartItemId */
  updateQuantity: (key: string, quantity: number) => void;
  /** Update specific cart item details (size, temp, toppings, price, notes...) */
  updateCartItem: (cartItemId: string, updatedData: Partial<CartItem>) => void;
  /** Remove a specific item by its unique key or cartItemId */
  removeItem: (key: string) => void;
  /** Empty the entire cart */
  clearCart: () => void;

  // ── Selectors (derived) ────────────────────────────────────────────────────
  /** Total number of units across all items */
  cartCount: () => number;
  /** Grand total in VND */
  cartTotal: () => number;
  /** Get the composite key or cartItemId for any CartItem */
  getKey: (item: Pick<CartItem, "id" | "size" | "temp" | "toppings" | "cartItemId">) => string;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const key = itemKey(newItem);
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => itemKey(i) === key
          );
          if (existingIndex > -1) {
            const updated = [...state.items];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + newItem.quantity,
            };
            return { items: updated };
          }
          const cartItemId =
            newItem.cartItemId ||
            `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          return { items: [...state.items, { ...newItem, cartItemId }] };
        });
      },

      updateCartItem: (cartItemId, updatedData) => {
        set((state) => ({
          items: state.items.map((i) => {
            const match =
              (i.cartItemId && i.cartItemId === cartItemId) ||
              itemKey(i) === cartItemId;
            if (!match) return i;
            return {
              ...i,
              ...updatedData,
              cartItemId: i.cartItemId || cartItemId,
            };
          }),
        }));
      },

      updateQuantity: (key, quantity) => {
        if (quantity <= 0) {
          get().removeItem(key);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => {
            const match =
              (i.cartItemId && i.cartItemId === key) || itemKey(i) === key;
            return match ? { ...i, quantity } : i;
          }),
        }));
      },

      removeItem: (key) => {
        set((state) => ({
          items: state.items.filter(
            (i) =>
              !(
                (i.cartItemId && i.cartItemId === key) ||
                itemKey(i) === key
              )
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      cartCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),

      cartTotal: () =>
        get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),

      getKey: (item) => (item as CartItem).cartItemId || itemKey(item),
    }),
    {
      name: "brewlite-cart",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : sessionStorage
      ),
    }
  )
);
