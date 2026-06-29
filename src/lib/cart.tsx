import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;          // product id
  slug: string;
  title: string;
  image: string;
  price: number;
  sellerName: string;
  qty: number;
  stock: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "nextplay:cart:v1";
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        const newQty = Math.min(existing.qty + qty, item.stock || 99);
        return prev.map(p => p.id === item.id ? { ...p, qty: newQty, price: item.price, stock: item.stock } : p);
      }
      return [...prev, { ...item, qty: Math.min(qty, item.stock || 99) }];
    });
  }, []);

  const remove = useCallback((id: string) => setItems(prev => prev.filter(p => p.id !== id)), []);
  const setQty = useCallback((id: string, qty: number) => {
    setItems(prev => prev.map(p => p.id === id ? { ...p, qty: Math.max(1, Math.min(qty, p.stock || 99)) } : p));
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(() => ({
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
    add, remove, setQty, clear,
  }), [items, add, remove, setQty, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
