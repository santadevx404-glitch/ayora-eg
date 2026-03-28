import React, { createContext, useContext, useState, useCallback } from "react";
import type { SelectedAddon } from "@/integrations/supabase/types";

export interface CartItem {
  id: string;          // product id
  cartKey: string;     // unique key = product_id + addon combo hash
  name: string;
  price: number;       // base price (already discounted if applicable)
  quantity: number;
  image_url: string | null;
  addons: SelectedAddon[];
  addonsPrice: number; // total extra from addons per unit
  category: string;    // product category slug — needed for category-scoped discount codes
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "cartKey">) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const makeCartKey = (id: string, addons: SelectedAddon[]) => {
  const addonIds = addons.map(a => a.item.id).sort().join(",");
  return `${id}__${addonIds}`;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((item: Omit<CartItem, "quantity" | "cartKey">) => {
    const cartKey = makeCartKey(item.id, item.addons);
    setItems(prev => {
      const existing = prev.find(i => i.cartKey === cartKey);
      if (existing) {
        return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, cartKey, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((cartKey: string) => {
    setItems(prev => prev.filter(i => i.cartKey !== cartKey));
  }, []);

  const updateQuantity = useCallback((cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.cartKey !== cartKey));
    } else {
      setItems(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + (i.price + i.addonsPrice) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
