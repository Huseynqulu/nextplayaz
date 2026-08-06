import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, ArrowRight } from "lucide-react";
import { boostScore } from "@/lib/marketplace-data";
import type { Product } from "@/lib/marketplace-data";
import { ProductCard } from "./ProductCard";
import { fetchProducts } from "@/lib/products";

export function TrendingSection() {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    (async () => {
      const all = await fetchProducts();
      const sorted = [...all].sort((a, b) => {
        const bs = boostScore(b) - boostScore(a);
        return bs !== 0 ? bs : b.reviews - a.reviews;
      });
      setItems(sorted.slice(0, 4));
    })();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-neon text-xs font-semibold tracking-wider uppercase mb-2">
            <Flame className="h-4 w-4" /> Trend
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Hazırda ən çox satılan</h2>
        </div>
        <Link to="/marketplace" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-neon hover:gap-2.5 transition-all">
          Hamısına bax <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        {items.map(p => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
