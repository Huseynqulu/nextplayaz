import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { dbToProduct, type DbProduct } from "@/lib/products";
import { categoryLabel } from "@/lib/marketplace-data";
import { isOnline, formatLastSeen } from "@/lib/presence";
import { ShieldCheck, Star, MessageCircle, Loader2, Store, Search, X } from "lucide-react";
import { SellerTierBadge } from "@/components/SellerTierBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type ReviewRow = {
  id: string; rating: number; comment: string | null; created_at: string; reviewer_id: string;
  seller_reply: string | null; seller_replied_at: string | null;
  reviewer?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export const Route = createFileRoute("/u/$id")({
  loader: async ({ params }) => {
    const { data: profileRaw } = await supabase
      .from("public_profiles" as any)
      .select("id, display_name, username, shop_name, avatar_url, created_at, last_seen_at")
      .eq("id", params.id)
      .maybeSingle();
    const profile = profileRaw as any;
    if (!profile) throw notFound();

    const { data: prods } = await supabase.from("products").select("*").eq("seller_id", params.id).eq("is_active", true).order("created_at", { ascending: false });
    const productIds = (prods ?? []).map(p => p.id);
    const [{ data: revs }, { count: salesCount }] = await Promise.all([
      productIds.length
        ? supabase.from("reviews").select("id, rating, comment, created_at, reviewer_id, seller_reply, seller_replied_at").in("product_id", productIds).order("created_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", params.id).eq("status", "completed"),
    ]);

    const reviewerIds = Array.from(new Set((revs ?? []).map((r: any) => r.reviewer_id)));
    let revProfs: any[] = [];
    if (reviewerIds.length) {
      const { data } = await supabase.from("public_profiles" as any)
        .select("id, display_name, username, avatar_url").in("id", reviewerIds);
      revProfs = (data as any[]) ?? [];
    }
    const profMap = new Map(revProfs.map(p => [p.id, p]));

    const sellerLite = {
      name: profile.display_name || profile.username || "Satıcı",
      shopName: profile.shop_name ?? null,
      avatarUrl: profile.avatar_url ?? null,
    };
    const products = (prods ?? []).map(d => dbToProduct(d as unknown as DbProduct, sellerLite));
    const reviews: ReviewRow[] = ((revs as any[]) ?? []).map(r => ({ ...r, reviewer: profMap.get(r.reviewer_id) ?? null }));
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return { profile, products, reviews, salesCount: salesCount ?? 0, avgRating };
  },
  component: SellerProfilePage,
  errorComponent: ({ error }) => <div className="min-h-screen grid place-items-center text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Profil tapılmadı.</div>,
  head: ({ loaderData, params }) => ({
    meta: loaderData?.profile ? [
      { title: `${loaderData.profile.display_name ?? loaderData.profile.username ?? "Satıcı"} — NextPlay.az` },
      { name: "description", content: `${loaderData.profile.display_name ?? "Satıcı"}-in NextPlay.az profili, məhsulları və müştəri rəyləri.` },
      { property: "og:title", content: `${loaderData.profile.display_name ?? loaderData.profile.username ?? "Satıcı"} — NextPlay.az` },
      { property: "og:description", content: `${loaderData.profile.display_name ?? "Satıcı"} — NextPlay.az satıcı profili və rəyləri.` },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: `https://nextplay.az/u/${params.id}` },
    ] : [],
    links: [{ rel: "canonical", href: `https://nextplay.az/u/${params.id}` }],
  }),
});

function SellerProfilePage() {
  const { profile, products, reviews, salesCount, avgRating } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const online = isOnline(profile.last_seen_at);
  const shopName: string | null = profile.shop_name ?? null;
  const realName = profile.display_name || profile.username || "Satıcı";
  const name = shopName || realName;
  const initials = name.slice(0, 2).toUpperCase();
  const [catFilter, setCatFilter] = useState<string>("all");
  const cats = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p: any) => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [products]);
  const visibleProducts = useMemo(
    () => catFilter === "all" ? products : products.filter((p: any) => p.category === catFilter),
    [products, catFilter]
  );

  async function startChat() {
    if (!user) { toast.info("Daxil olun"); navigate({ to: "/login" }); return; }
    if (user.id === profile.id) { toast.info("Bu sizin profilinizdir"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("start_conversation", { p_other_user: profile.id, p_product_id: null } as any);
    setBusy(false);
    if (error || !data) { toast.error(error?.message ?? "Xəta"); return; }
    navigate({ to: "/messages/$conversationId", params: { conversationId: data as string } });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-3xl border border-border bg-card-gradient p-6 sm:p-8 card-shadow">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={name} className="h-24 w-24 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-2xl bg-neon/15 border border-neon/30 text-neon font-bold text-2xl">{initials}</div>
                )}
                <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background ${online ? "bg-success" : "bg-muted"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold inline-flex items-center gap-2">
                    {shopName && <Store className="h-6 w-6 text-neon" />}{name}
                  </h1>
                  <VerifiedBadge verified={profile.verified_at} size={16} variant="pill" />
                  <SellerTierBadge sellerId={profile.id} size="md" showStats />
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${online ? "bg-success/15 text-success" : "bg-surface text-muted-foreground"}`}>
                    {online ? "● Onlayn" : "Offline"}
                  </span>
                </div>
                {shopName && <p className="text-sm text-muted-foreground mt-0.5">Sahibi: <span className="text-foreground font-medium">{realName}</span></p>}
                <p className="text-sm text-muted-foreground mt-1">@{profile.username ?? profile.id.slice(0, 8)} · {formatLastSeen(profile.last_seen_at)}</p>
                <div className="flex flex-wrap items-center gap-5 mt-4 text-sm">
                  <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-warning text-warning" /> <b>{avgRating.toFixed(1)}</b> <span className="text-muted-foreground">({reviews.length} rəy)</span></span>
                  <span><b>{salesCount}</b> <span className="text-muted-foreground">tamamlanmış satış</span></span>
                  <span><b>{products.length}</b> <span className="text-muted-foreground">aktiv məhsul</span></span>
                  <span className="text-muted-foreground">Qoşulub: {new Date(profile.created_at).toLocaleDateString("az-AZ")}</span>
                </div>
              </div>
              <button
                onClick={startChat}
                disabled={busy || user?.id === profile.id}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-neon text-background font-semibold neon-ring disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                Mesaj göndər
              </button>
            </div>
          </div>

          <SellerTabs
            products={products}
            visibleProducts={visibleProducts}
            reviews={reviews}
            cats={cats}
            catFilter={catFilter}
            setCatFilter={setCatFilter}
          />

          <div className="mt-10">
            <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">← Marketplace-ə qayıt</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SellerTabs({ products, visibleProducts, reviews, cats, catFilter, setCatFilter }: {
  products: any[]; visibleProducts: any[]; reviews: ReviewRow[];
  cats: string[]; catFilter: string; setCatFilter: (v: string) => void;
}) {
  const [tab, setTab] = useState<"products" | "reviews">("products");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searched = useMemo(() => {
    if (!q) return visibleProducts;
    return visibleProducts.filter((p: any) =>
      (p.title ?? "").toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q)
    );
  }, [visibleProducts, q]);
  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 border-b border-border mb-6">
        <button
          onClick={() => setTab("products")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${tab === "products" ? "border-neon text-neon" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >Məhsullar ({products.length})</button>
        <button
          onClick={() => setTab("reviews")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${tab === "reviews" ? "border-neon text-neon" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >Dəyərləndirmələr ({reviews.length})</button>
      </div>

      {tab === "products" && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bu satıcının məhsulları arasında axtar..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface border border-border focus:border-neon focus:outline-none text-sm"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Təmizlə">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {cats.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-5">
              <button onClick={() => setCatFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${catFilter === "all" ? "bg-neon text-background border-transparent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>
                Hamısı ({products.length})
              </button>
              {cats.map(c => {
                const count = products.filter((p: any) => p.category === c).length;
                return (
                  <button key={c} onClick={() => setCatFilter(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${catFilter === c ? "bg-neon text-background border-transparent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>
                    {categoryLabel(c)} ({count})
                  </button>
                );
              })}
            </div>
          )}
          {searched.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">
              {q ? `"${query}" üzrə nəticə tapılmadı.` : "Bu kateqoriyada məhsul yoxdur."}
            </p>
          ) : (
            <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
              {searched.map((p: any) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </>
      )}

      {tab === "reviews" && (
        reviews.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center">Hələ rəy yoxdur.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const rname = r.reviewer?.display_name || r.reviewer?.username || "İstifadəçi";
              const initials = rname.slice(0, 2).toUpperCase();
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-surface/40 p-5">
                  <div className="flex items-start gap-3">
                    <Link to="/u/$id" params={{ id: r.reviewer_id }} className="shrink-0">
                      {r.reviewer?.avatar_url ? (
                        <img src={r.reviewer.avatar_url} alt={rname} className="h-10 w-10 rounded-xl object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-neon/15 border border-neon/30 text-neon font-bold text-sm">{initials}</div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <Link to="/u/$id" params={{ id: r.reviewer_id }} className="font-semibold hover:text-primary text-sm">{rname}</Link>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("az-AZ")}</span>
                        </div>
                      </div>
                      {r.comment && <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>}
                      {r.seller_reply && (
                        <div className="mt-3 ml-2 pl-4 border-l-2 border-neon/40 bg-neon/5 rounded-r-lg p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-neon">
                              <Store className="h-3.5 w-3.5" /> Satıcı cavabı
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {r.seller_replied_at && new Date(r.seller_replied_at).toLocaleDateString("az-AZ")}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.seller_reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
