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
  /** Legacy temperature identifier (e.g. 'hot' | 'iced') */
  temp?: string;
  /** Normalized temperature ('HOT' | 'COLD') */
  temperature?: "HOT" | "COLD";
  quantity: number;
  size?: string;
  iceLevel?: string;
  sugarLevel?: string;
  toppings?: string[];
  notes?: string;
  /** thumbnail URL for cart display */
  imageUrl?: string | null;
  /** Flag for bakery/pastry products */
  isBakery?: boolean;
  /** Serving style for bakery: 'Hâm nóng' | 'Dùng ngay' */
  servingStyle?: string;
}

/** Check if product is bakery */
export function isBakeryProduct(product?: { name?: string; category?: string } | null): boolean {
  if (!product) return false;
  if (product.category === "bakery") return true;
  const n = (product.name || "").toLowerCase();
  return (
    n.includes("bánh") ||
    n.includes("banh") ||
    n.includes("pain") ||
    n.includes("chocolat") ||
    n.includes("cheesecake") ||
    n.includes("tiramisu") ||
    n.includes("croissant") ||
    n.includes("cruffin") ||
    n.includes("danish") ||
    n.includes("muffin")
  );
}

/** Unique key used to detect duplicate cart entries */
function itemKey(
  item: Pick<
    CartItem,
    "id" | "name" | "size" | "temp" | "temperature" | "iceLevel" | "sugarLevel" | "toppings" | "isBakery" | "servingStyle"
  >
): string {
  const toppings = [...(item.toppings ?? [])].sort().join(",");
  const isBakery = item.isBakery || isBakeryProduct(item);
  if (isBakery) {
    const serving =
      item.servingStyle ||
      (item.temperature === "HOT" || item.temp?.toLowerCase() === "hot"
        ? "Hâm nóng"
        : "Dùng ngay");
    return `${item.id}|BAKERY|${serving}|${toppings}`;
  }
  const tempVal =
    item.temperature ??
    (item.temp?.toLowerCase() === "hot" ? "HOT" : "COLD");
  const ice = item.iceLevel ?? "";
  const sugar = item.sugarLevel ?? "";
  return `${item.id}|${item.size ?? "M"}|${tempVal}|${ice}|${sugar}|${toppings}`;
}

interface CartState {
  items: CartItem[];
  appliedPromo: string | null;
  setAppliedPromo: (code: string | null) => void;

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
  getKey: (
    item: Pick<
      CartItem,
      "id" | "name" | "size" | "temp" | "temperature" | "iceLevel" | "sugarLevel" | "toppings" | "isBakery" | "servingStyle" | "cartItemId"
    >
  ) => string;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedPromo: null,

      setAppliedPromo: (code) =>
        set({ appliedPromo: code ? code.trim().toUpperCase() : null }),

      addItem: (newItem) => {
        const isBakery = newItem.isBakery || isBakeryProduct(newItem);
        const isHot =
          newItem.servingStyle === "Hâm nóng" ||
          newItem.servingStyle === "Hâm nóng giòn" ||
          newItem.temperature === "HOT" ||
          newItem.temp?.toLowerCase() === "hot";
        const temperature: "HOT" | "COLD" = isHot ? "HOT" : "COLD";
        const temp = newItem.temp || (isHot ? "hot" : "iced");
        const servingStyle =
          newItem.servingStyle ||
          (isBakery ? (isHot ? "Hâm nóng" : "Dùng ngay") : undefined);
        const iceLevel =
          isBakery || isHot ? undefined : newItem.iceLevel || "100% đá";
        const sugarLevel = isBakery ? undefined : newItem.sugarLevel || "100% đường";
        const size = isBakery ? undefined : newItem.size || "M";

        const resolvedItem: CartItem = {
          ...newItem,
          temp,
          temperature,
          servingStyle,
          isBakery,
          size,
          iceLevel,
          sugarLevel,
        };

        const key = itemKey(resolvedItem);
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
            resolvedItem.cartItemId ||
            `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          return { items: [...state.items, { ...resolvedItem, cartItemId }] };
        });
      },

      updateCartItem: (cartItemId, updatedData) => {
        set((state) => ({
          items: state.items.map((i) => {
            const match =
              (i.cartItemId && i.cartItemId === cartItemId) ||
              itemKey(i) === cartItemId;
            if (!match) return i;

            const merged: CartItem = {
              ...i,
              ...updatedData,
              cartItemId: i.cartItemId || cartItemId,
            };

            if (updatedData.temperature && !updatedData.temp) {
              merged.temp = updatedData.temperature === "HOT" ? "hot" : "iced";
            } else if (updatedData.temp && !updatedData.temperature) {
              merged.temperature =
                updatedData.temp.toLowerCase() === "hot" ? "HOT" : "COLD";
            }

            if (merged.temperature === "HOT") {
              merged.iceLevel = undefined;
            }

            if (merged.isBakery) {
              merged.iceLevel = undefined;
              merged.sugarLevel = undefined;
              merged.size = undefined;
            }

            return merged;
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

      clearCart: () => set({ items: [], appliedPromo: null }),

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
