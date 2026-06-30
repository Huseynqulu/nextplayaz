import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { categories, products as mockProducts } from "@/lib/marketplace-data";
import { fetchProducts } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, Zap, ShieldCheck, Star, LayoutGrid, Grid3x3, List } from "lucide-react";
import { ProductGridSkeleton } from "@/components/Skeletons";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "all").default("all"),
  sub: fallback(z.string(), "all").default("all"),
  platform: fallback(z.string(), "all").default("all"),
  psub: fallback(z.string(), "all").default("all"),
  delivery: fallback(z.enum(["all", "Instant", "Manual"]), "all").default("all"),
  min: fallback(z.number().min(0), 0).default(0),
  max: fallback(z.number().min(0), 0).default(0),
  rating: fallback(z.number().min(0).max(5), 0).default(0),
  verified: fallback(z.boolean(), false).default(false),
  inStock: fallback(z.boolean(), true).default(true),
  sort: fallback(z.enum(["popular", "low", "high", "rating", "newest"]), "popular").default("popular"),
});

export const Route = createFileRoute("/marketplace")({
  validateSearch: zodValidator(searchSchema),
  component: MarketplacePage,
  head: () => ({
    meta: [
      { title: "Marketplace — NextPlay.az" },
      { name: "description", content: "Bütün gaming məhsulları bir yerdə. Oyunlar, hesablar, açarlar və xidmətlər." },
    ],
  }),
});

function MarketplacePage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/marketplace" });
  const update = (patch: Partial<typeof s>) =>
    navigate({ search: ((prev: any) => ({ ...prev, ...patch })) as any, replace: true });

  const [products, setProducts] = useState<import("@/lib/marketplace-data").Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qLocal, setQLocal] = useState(s.q);
  const [view, setView] = useState<"compact" | "grid" | "list">("compact");
  const [subcats, setSubcats] = useState<{ slug: string; label_az: string; category_slug: string }[]>([]);
  const [platforms, setPlatforms] = useState<{ slug: string; label_az: string }[]>([]);
  const [psubs, setPsubs] = useState<{ slug: string; label_az: string; platform_slug: string }[]>([]);

  useEffect(() => { fetchProducts().then(p => { setProducts(p); setLoading(false); }); }, []);
  useEffect(() => {
    supabase.from("subcategories" as any).select("slug,label_az,category_slug").eq("is_active", true).order("sort_order")
      .then(({ data }) => setSubcats(((data as any) ?? []) as any));
    supabase.from("platforms" as any).select("slug,label_az").eq("is_active", true).order("sort_order")
      .then(({ data }) => setPlatforms(((data as any) ?? []) as any));
    supabase.from("platform_subcategories" as any).select("slug,label_az,platform_slug").eq("is_active", true).order("sort_order")
      .then(({ data }) => setPsubs(((data as any) ?? []) as any));
  }, []);
  useEffect(() => { setQLocal(s.q); }, [s.q]);
  const currentSubs = s.cat !== "all" ? subcats.filter(x => x.category_slug === s.cat) : [];
  const currentPlatformSlug = platforms.find(p => p.label_az === s.platform)?.slug;
  const currentPsubs = s.platform !== "all" && currentPlatformSlug ? psubs.filter(x => x.platform_slug === currentPlatformSlug) : [];

  // Debounce free-text search → URL
  useEffect(() => {
    const t = setTimeout(() => { if (qLocal !== s.q) update({ q: qLocal }); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  const filtered = useMemo(() => {
    let r = products.slice();
    if (s.cat !== "all") r = r.filter(p => p.category === s.cat);
    if (s.sub !== "all") r = r.filter(p => p.subcategory === s.sub);
    if (s.platform !== "all") r = r.filter(p => p.platform === s.platform);
    if (s.psub !== "all") r = r.filter(p => (p as any).platformSubcategory === s.psub);
    if (s.delivery !== "all") r = r.filter(p => p.delivery === s.delivery);
    if (s.verified) r = r.filter(p => p.seller?.verified);
    if (s.inStock) r = r.filter(p => (p.stock ?? 0) > 0);
    if (s.min > 0) r = r.filter(p => p.price >= s.min);
    if (s.max > 0) r = r.filter(p => p.price <= s.max);
    if (s.rating > 0) r = r.filter(p => (p.rating ?? 0) >= s.rating);
    if (s.q.trim()) {
      const q = s.q.toLowerCase();
      r = r.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.seller?.shopName ?? "").toLowerCase().includes(q) ||
        (p.seller?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (s.sort === "low") r.sort((a, b) => a.price - b.price);
    else if (s.sort === "high") r.sort((a, b) => b.price - a.price);
    else if (s.sort === "rating") r.sort((a, b) => b.rating - a.rating);
    else if (s.sort === "newest") r.sort((a, b) => (b.id > a.id ? 1 : -1));
    return r;
  }, [products, s]);

  const activeCount =
    (s.cat !== "all" ? 1 : 0) +
    (s.sub !== "all" ? 1 : 0) +
    (s.platform !== "all" ? 1 : 0) +
    (s.psub !== "all" ? 1 : 0) +
    (s.delivery !== "all" ? 1 : 0) +
    (s.verified ? 1 : 0) +
    (s.min > 0 ? 1 : 0) +
    (s.max > 0 ? 1 : 0) +
    (s.rating > 0 ? 1 : 0);

  const reset = () => navigate({
    search: { q: "", cat: "all", sub: "all", platform: "all", psub: "all", delivery: "all", min: 0, max: 0, rating: 0, verified: false, inStock: true, sort: "popular" } as any,
    replace: true,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b border-border bg-surface/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="font-display text-4xl sm:text-5xl font-bold">Marketplace</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              {loading ? "Yüklənir..." : `${products.length} məhsul`}, yoxlanılmış satıcılar, escrow qorunma altında.
            </p>

            <div className="mt-8 flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={qLocal}
                  onChange={e => setQLocal(e.target.value)}
                  placeholder="Məhsul, satıcı və ya mağaza axtar..."
                  className="w-full h-12 pl-12 pr-10 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {qLocal && (
                  <button onClick={() => setQLocal("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface" aria-label="Sil">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <select value={s.sort} onChange={e => update({ sort: e.target.value as typeof s.sort })}
                className="h-12 px-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring min-w-[170px]">
                <option value="popular">Populyar</option>
                <option value="newest">Ən yenilər</option>
                <option value="low">Ən aşağı qiymət</option>
                <option value="high">Ən yüksək qiymət</option>
                <option value="rating">Reytinqə görə</option>
              </select>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c.id} onClick={() => update({ cat: c.id, sub: "all" })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                    s.cat === c.id
                      ? "bg-neon text-background border-transparent neon-ring"
                      : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}>
                  {c.label} <span className="opacity-60">({c.count})</span>
                </button>
              ))}
            </div>

            {currentSubs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => update({ sub: "all" })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    s.sub === "all" ? "bg-primary text-primary-foreground border-transparent" : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  Hamısı
                </button>
                {currentSubs.map(sc => (
                  <button key={sc.slug} onClick={() => update({ sub: sc.slug })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      s.sub === sc.slug ? "bg-primary text-primary-foreground border-transparent" : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}>
                    {sc.label_az}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar filters */}
          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-card-gradient p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-neon" /> Filtrlər
                  {activeCount > 0 && <span className="text-[10px] bg-neon text-background rounded-full px-2 py-0.5">{activeCount}</span>}
                </h3>
                {activeCount > 0 && (
                  <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Sıfırla</button>
                )}
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Platforma</label>
                  <select value={s.platform} onChange={e => update({ platform: e.target.value, psub: "all" })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="all">Bütün platformalar</option>
                    {platforms.map(p => <option key={p.slug} value={p.label_az}>{p.label_az}</option>)}
                  </select>
                </div>

                {currentPsubs.length > 0 && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Alt kateqoriya ({s.platform})</label>
                    <select value={s.psub} onChange={e => update({ psub: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="all">Hamısı</option>
                      {currentPsubs.map(p => <option key={p.slug} value={p.slug}>{p.label_az}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Çatdırılma</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["all", "Instant", "Manual"] as const).map(d => (
                      <button key={d} onClick={() => update({ delivery: d })}
                        className={`h-9 rounded-lg text-xs font-semibold border transition ${
                          s.delivery === d ? "bg-neon text-background border-transparent" : "bg-background border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        {d === "all" ? "Hamısı" : d === "Instant" ? "⚡ Anında" : "Əl ilə"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Qiymət (₼)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} value={s.min || ""} onChange={e => update({ min: Number(e.target.value) || 0 })}
                      placeholder="Min" className="w-full h-10 px-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
                    <span className="text-muted-foreground">–</span>
                    <input type="number" min={0} value={s.max || ""} onChange={e => update({ max: Number(e.target.value) || 0 })}
                      placeholder="Max" className="w-full h-10 px-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Minimum reytinq</label>
                  <div className="flex gap-1">
                    {[0, 3, 4, 4.5].map(r => (
                      <button key={r} onClick={() => update({ rating: r })}
                        className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition inline-flex items-center justify-center gap-1 ${
                          s.rating === r ? "bg-neon text-background border-transparent" : "bg-background border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        {r === 0 ? "Hamısı" : <><Star className="h-3 w-3 fill-current" />{r}+</>}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={s.verified} onChange={e => update({ verified: e.target.checked })}
                    className="h-4 w-4 accent-neon" />
                  <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-sky-400" /> Yalnız doğrulanmış satıcılar</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={s.inStock} onChange={e => update({ inStock: e.target.checked })}
                    className="h-4 w-4 accent-neon" />
                  <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-success" /> Yalnız stokda olanlar</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                {filtered.length} məhsul tapıldı
              </p>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card/40 p-1">
                <button
                  type="button"
                  aria-label="Sıx görünüş"
                  onClick={() => setView("compact")}
                  className={`grid h-7 w-7 place-items-center rounded-md transition ${view === "compact" ? "bg-neon text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Şəbəkə görünüşü"
                  onClick={() => setView("grid")}
                  className={`grid h-7 w-7 place-items-center rounded-md transition ${view === "grid" ? "bg-neon text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Siyahı görünüşü"
                  onClick={() => setView("list")}
                  className={`grid h-7 w-7 place-items-center rounded-md transition ${view === "list" ? "bg-neon text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              {(s.q || activeCount > 0) && (
                <div className="flex flex-wrap gap-1.5 w-full">
                  {s.q && (
                    <Chip label={`"${s.q}"`} onClear={() => { setQLocal(""); update({ q: "" }); }} />
                  )}
                  {s.cat !== "all" && <Chip label={s.cat} onClear={() => update({ cat: "all", sub: "all" })} />}
                  {s.sub !== "all" && <Chip label={subcats.find(x => x.slug === s.sub)?.label_az ?? s.sub} onClear={() => update({ sub: "all" })} />}
                  {s.platform !== "all" && <Chip label={s.platform} onClear={() => update({ platform: "all", psub: "all" })} />}
                  {s.psub !== "all" && <Chip label={psubs.find(x => x.slug === s.psub)?.label_az ?? s.psub} onClear={() => update({ psub: "all" })} />}
                  {s.delivery !== "all" && <Chip label={s.delivery === "Instant" ? "⚡ Anında" : "Əl ilə"} onClear={() => update({ delivery: "all" })} />}
                  {s.min > 0 && <Chip label={`≥ ${s.min}₼`} onClear={() => update({ min: 0 })} />}
                  {s.max > 0 && <Chip label={`≤ ${s.max}₼`} onClear={() => update({ max: 0 })} />}
                  {s.rating > 0 && <Chip label={`★ ${s.rating}+`} onClear={() => update({ rating: 0 })} />}
                  {s.verified && <Chip label="Doğrulanmış" onClear={() => update({ verified: false })} />}
                </div>
              )}
            </div>

            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-lg text-muted-foreground">Heç bir nəticə tapılmadı.</p>
                <button onClick={reset} className="mt-4 h-10 px-5 rounded-lg bg-neon text-background font-semibold text-sm">Filtrləri sıfırla</button>
              </div>
            ) : view === "list" ? (
              <div className="flex flex-col gap-2">
                {filtered.map(p => <ProductCard key={p.id} p={p} variant="list" />)}
              </div>
            ) : view === "compact" ? (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {filtered.map(p => <ProductCard key={p.id} p={p} variant="compact" />)}
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map(p => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </div>

        </section>
      </main>
      <Footer />
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-surface border border-border text-xs">
      {label}
      <button onClick={onClear} className="hover:text-foreground text-muted-foreground" aria-label="Sil"><X className="h-3 w-3" /></button>
    </span>
  );
}
