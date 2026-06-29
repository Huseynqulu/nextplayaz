import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isRealProductId = (id: string) => UUID_RE.test(id);

type Ctx = {
  ids: Set<string>;
  isFav: (id: string) => boolean;
  toggle: (id: string) => Promise<void>;
  loading: boolean;
};

const FavCtx = createContext<Ctx | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setIds(new Set()); return; }
    setLoading(true);
    supabase
      .from("favorites")
      .select("product_id")
      .then(({ data }) => {
        setIds(new Set((data ?? []).map((r) => r.product_id as string)));
        setLoading(false);
      });
  }, [user]);

  const toggle = useCallback(async (id: string) => {
    if (!user || !isRealProductId(id)) return;
    // optimistic
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    const { data, error } = await supabase.rpc("toggle_favorite", { p_product_id: id });
    if (error) {
      // revert
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      return;
    }
    setIds((prev) => {
      const next = new Set(prev);
      if (data === true) next.add(id); else next.delete(id);
      return next;
    });
  }, [user]);

  const value = useMemo<Ctx>(() => ({
    ids,
    isFav: (id: string) => ids.has(id),
    toggle,
    loading,
  }), [ids, toggle, loading]);

  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavCtx);
  if (!ctx) return { ids: new Set<string>(), isFav: () => false, toggle: async () => {}, loading: false };
  return ctx;
}
