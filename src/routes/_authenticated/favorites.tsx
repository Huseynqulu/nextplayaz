import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { dbToProduct, type DbProduct } from "@/lib/products";
import { useFavorites } from "@/lib/favorites";
import type { Product } from "@/lib/marketplace-data";

export const Route = createFileRoute("/_authenticated/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { ids } = useFavorites();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idList = Array.from(ids);
    if (idList.length === 0) { setItems([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .in("id", idList)
        .eq("is_active", true);
      const sellerIds = Array.from(new Set((data ?? []).map((d) => d.seller_id)));
      const nameMap = new Map<string, string>();
      if (sellerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", sellerIds);
        (profs ?? []).forEach((p) => nameMap.set(p.id, p.display_name || p.username || "Satıcı"));
      }
      setItems((data ?? []).map((d) => dbToProduct(d as unknown as DbProduct, nameMap.get(d.seller_id))));
      setLoading(false);
    })();
  }, [ids]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-6 w-6 text-destructive fill-destructive" />
          <h1 className="font-display text-2xl font-bold">İstək siyahım</h1>
          <span className="text-muted-foreground text-sm">({items.length})</span>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Yüklənir...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">İstək siyahınız boşdur.</p>
            <Link to="/marketplace" className="inline-flex h-10 items-center px-5 rounded-lg text-sm font-semibold bg-neon text-background">
              Məhsullara bax
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
