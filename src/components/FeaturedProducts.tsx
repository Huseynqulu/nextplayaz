import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { fetchProducts } from "@/lib/products";
import type { Product } from "@/lib/marketplace-data";
import { useT } from "@/lib/i18n";

export function FeaturedProducts() {
  const t = useT();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const all = await fetchProducts();
      const scored = [...all].sort(
        (a, b) => b.rating * Math.log(1 + b.reviews) - a.rating * Math.log(1 + a.reviews),
      );
      setItems(scored.slice(0, 8));
    })();
  }, []);

  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-neon text-xs font-semibold tracking-wider uppercase mb-2">
            <Sparkles className="h-4 w-4" /> {t("home.editorsKicker")}
          </div>
          <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold">{t("home.editorsTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("home.editorsSub")}</p>
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
