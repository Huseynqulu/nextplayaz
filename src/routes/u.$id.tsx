import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { dbToProduct, type DbProduct } from "@/lib/products";
import { isOnline, formatLastSeen } from "@/lib/presence";
import { ShieldCheck, Star, MessageCircle, Loader2 } from "lucide-react";
import { SellerTierBadge } from "@/components/SellerTierBadge";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type ReviewRow = { id: string; rating: number; comment: string | null; created_at: string; reviewer_id: string };

export const Route = createFileRoute("/u/$id")({
  loader: async ({ params }) => {
    const { data: profile } = await supabase
      .from("public_profiles" as any)
      .select("id, display_name, username, avatar_url, created_at, last_seen_at")
      .eq("id", params.id)
      .maybeSingle();
    if (!profile) throw notFound();

    const { data: prods } = await supabase.from("products").select("*").eq("seller_id", params.id).eq("is_active", true).order("created_at", { ascending: false });
    const productIds = (prods ?? []).map(p => p.id);
    const [{ data: revs }, { count: salesCount }] = await Promise.all([
      productIds.length
        ? supabase.from("reviews").select("id, rating, comment, created_at, reviewer_id").in("product_id", productIds).order("created_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [] as ReviewRow[] }),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", params.id).eq("status", "completed"),
    ]);

    const products = (prods ?? []).map(d => dbToProduct(d as unknown as DbProduct, profile.display_name || profile.username || "Satıcı"));
    const reviews = (revs as ReviewRow[] | null) ?? [];
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return { profile, products, reviews, salesCount: salesCount ?? 0, avgRating };
  },
  component: SellerProfilePage,
  errorComponent: ({ error }) => <div className="min-h-screen grid place-items-center text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Profil tapılmadı.</div>,
  head: ({ loaderData }) => ({
    meta: loaderData?.profile ? [
      { title: `${loaderData.profile.display_name ?? loaderData.profile.username ?? "Satıcı"} — NextPlay.az` },
      { name: "description", content: `${loaderData.profile.display_name ?? "Satıcı"}-ın profili, məhsulları və rəyləri` },
    ] : [],
  }),
});

function SellerProfilePage() {
  const { profile, products, reviews, salesCount, avgRating } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const online = isOnline(profile.last_seen_at);
  const name = profile.display_name || profile.username || "Satıcı";
  const initials = name.slice(0, 2).toUpperCase();

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
                  <h1 className="font-display text-2xl sm:text-3xl font-bold">{name}</h1>
                  <ShieldCheck className="h-5 w-5 text-neon" />
                  <SellerTierBadge sellerId={profile.id} size="md" showStats />
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${online ? "bg-success/15 text-success" : "bg-surface text-muted-foreground"}`}>
                    {online ? "● Onlayn" : "Offline"}
                  </span>
                </div>
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

          <section className="mt-10">
            <h2 className="font-display text-xl font-bold mb-5">Məhsullar ({products.length})</h2>
            {products.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center">Hələ aktiv məhsul yoxdur.</p>
            ) : (
              <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
                {products.map((p: ReturnType<typeof dbToProduct>) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </section>

          <section className="mt-12">
            <h2 className="font-display text-xl font-bold mb-5">Rəylər ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center">Hələ rəy yoxdur.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r: ReviewRow) => (
                  <div key={r.id} className="rounded-2xl border border-border bg-surface/40 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("az-AZ")}</span>
                    </div>
                    {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-10">
            <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">← Marketplace-ə qayıt</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
