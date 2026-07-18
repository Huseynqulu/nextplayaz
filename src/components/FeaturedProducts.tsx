import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { fetchProducts } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { dbToProduct, type DbProduct, type SellerLite } from "@/lib/products";
import { boostScore, type Product } from "@/lib/marketplace-data";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";

async function fetchRecommended(): Promise<Product[]> {
  const { data, error } = await supabase.rpc("get_recommended_products" as any, { _limit: 8 });
  if (error || !data || !Array.isArray(data) || data.length === 0) return [];
  const rows = data as any[];
  const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id).filter(Boolean)));
  let sellerMap = new Map<string, SellerLite>();
  if (sellerIds.length) {
    const { data: profs } = await supabase
      .from("public_profiles" as any)
      .select("id, display_name, username, shop_name, avatar_url, verified_at, sales_count")
      .in("id", sellerIds);
    sellerMap = new Map(
      ((profs as any[]) ?? []).map((p: any) => [
        p.id,
        {
          name: p.display_name || p.username || "Satıcı",
          shopName: p.shop_name ?? null,
          avatarUrl: p.avatar_url ?? null,
          verified: !!p.verified_at,
          sales: p.sales_count ?? 0,
        } as SellerLite,
      ])
    );
  }
  return rows.map((r) => dbToProduct(r as DbProduct, sellerMap.get(r.seller_id)));
}

export function FeaturedProducts() {
  const t = useT();
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [personalized, setPersonalized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try personalized recommendations first (only works when signed in and has views)
      if (user) {
        const rec = await fetchRecommended();
        if (!cancelled && rec.length >= 4) {
          setItems(rec.slice(0, 8));
          setPersonalized(true);
          return;
        }
      }
      // Fallback: editors pick (boosted + top rated)
      const all = await fetchProducts();
      const ranked = [...all].sort((a, b) => {
        const bs = boostScore(b) - boostScore(a);
        if (bs !== 0) return bs;
        return b.rating * Math.log(1 + b.reviews) - a.rating * Math.log(1 + a.reviews);
      });
      if (!cancelled) {
        setItems(ranked.slice(0, 8));
        setPersonalized(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!items.length) return null;

  const kicker = personalized ? "Sizin üçün seçilmiş" : t("home.editorsKicker");
  const title = personalized ? "Sizə uyğun məhsullar" : t("home.editorsTitle");
  const sub = personalized ? "Baxdığınız məhsullara əsasən sizin üçün tövsiyə edilir." : t("home.editorsSub");

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-neon text-xs font-semibold tracking-wider uppercase mb-2">
            <Sparkles className="h-4 w-4" /> {kicker}
          </div>
          <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold">{title}</h2>
          <p className="mt-2 text-muted-foreground">{sub}</p>
        </div>
        <Link
          to="/marketplace"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-neon hover:gap-2.5 transition-all"
        >
          {t("home.viewAll")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map(p => <ProductCard key={p.id} p={p} variant="compact" />)}
      </div>
    </section>
  );
}
