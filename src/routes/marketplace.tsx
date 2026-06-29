import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { categories, platforms, products as mockProducts } from "@/lib/marketplace-data";
import { fetchProducts } from "@/lib/products";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  cat: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/marketplace")({
  validateSearch: searchSchema,
  component: MarketplacePage,
  head: () => ({
    meta: [
      { title: "Marketplace — NextPlay.az" },
      { name: "description", content: "Bütün gaming məhsulları bir yerdə. Oyunlar, hesablar, açarlar və xidmətlər." },
    ],
  }),
});

function MarketplacePage() {
  const { cat: initialCat, q: initialQ } = Route.useSearch();
  const [cat, setCat] = useState<string>(initialCat ?? "all");
  const [platform, setPlatform] = useState<string>("all");
  const [q, setQ] = useState<string>(initialQ ?? "");
  const [sort, setSort] = useState<"popular" | "low" | "high" | "rating">("popular");
  const [products, setProducts] = useState<import("@/lib/marketplace-data").Product[]>(mockProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then(p => { setProducts(p); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let r = products.slice();
    if (cat !== "all") r = r.filter(p => p.category === cat);
    if (platform !== "all") r = r.filter(p => p.platform === platform);
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter(p => p.title.toLowerCase().includes(s) || (p.description ?? "").toLowerCase().includes(s));
    }
    if (sort === "low") r.sort((a, b) => a.price - b.price);
    if (sort === "high") r.sort((a, b) => b.price - a.price);
    if (sort === "rating") r.sort((a, b) => b.rating - a.rating);
    return r;
  }, [cat, platform, q, sort, products]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b border-border bg-surface/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="font-display text-4xl sm:text-5xl font-bold">Marketplace</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              {loading ? "Yüklənir..." : `${products.length} məhsul`}, yoxlanılmış satıcılar, escrow qorunma altında.
            </p>

            <div className="mt-8 flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Məhsul axtar..."
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Məhsul axtar..."
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="h-12 px-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
              >
                <option value="all">Bütün platformalar</option>
                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as typeof sort)}
                className="h-12 px-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
              >
                <option value="popular">Populyar</option>
                <option value="low">Ən aşağı qiymət</option>
                <option value="high">Ən yüksək qiymət</option>
                <option value="rating">Reytinqə görə</option>
              </select>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                    cat === c.id
                      ? "bg-neon text-background border-transparent neon-ring"
                      : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {c.label} <span className="opacity-60">({c.count})</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              <SlidersHorizontal className="inline h-4 w-4 mr-1.5" />
              {filtered.length} məhsul tapıldı
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">Heç bir nəticə tapılmadı.</p>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
              {filtered.map(p => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
