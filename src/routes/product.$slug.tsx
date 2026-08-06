import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { ReviewSection } from "@/components/ReviewSection";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { products as mockProducts, categoryLabel } from "@/lib/marketplace-data";
import { fetchProductBySlug, fetchProducts, PRODUCT_PLACEHOLDER } from "@/lib/products";
import { Star, ShieldCheck, Zap, Lock, Package, MessageCircle, Heart, Share2, Loader2, X, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { trackView } from "@/lib/recently-viewed";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useCurrency } from "@/lib/currency";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useT } from "@/lib/i18n";
import { useFavorites, isRealProductId } from "@/lib/favorites";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { notifyEmail } from "@/lib/notifications/notify-email";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await fetchProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  component: ProductPage,
  errorComponent: ({ error }) => <div className="min-h-screen grid place-items-center text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Məhsul tapılmadı.</div>,
  head: ({ loaderData, params }) => ({
    meta: loaderData?.product ? [
      { title: `${loaderData.product.title} — NextPlay.az` },
      { name: "description", content: loaderData.product.description },
      { property: "og:title", content: loaderData.product.title },
      { property: "og:description", content: loaderData.product.description },
      { property: "og:image", content: loaderData.product.image },
      { property: "og:type", content: "product" },
      { property: "og:url", content: `https://nextplay.az/product/${params.slug}` },
      { name: "twitter:image", content: loaderData.product.image },
    ] : [],
    links: [{ rel: "canonical", href: `https://nextplay.az/product/${params.slug}` }],
    scripts: loaderData?.product ? [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: loaderData.product.title,
          description: loaderData.product.description,
          image: loaderData.product.image,
          offers: {
            "@type": "Offer",
            price: loaderData.product.price,
            priceCurrency: "AZN",
            availability: "https://schema.org/InStock",
            url: `https://nextplay.az/product/${params.slug}`,
          },
        }),
      },
    ] : [],
  }),
});

function ProductPage() {
  const t = useT();
  const { product: p } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{ code: string; percent: number } | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [lowBalance, setLowBalance] = useState<{ balance: number; total: number } | null>(null);

  const subtotal = +(Number(p.price) * qty).toFixed(2);
  const discountAmount = applied ? +(subtotal * applied.percent / 100).toFixed(2) : 0;
  const finalTotal = +(subtotal - discountAmount).toFixed(2);

  async function applyCode() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setApplying(true);
    const { data, error } = await supabase.rpc("validate_discount_code" as any, { p_code: c });
    setApplying(false);
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result || result.status === "not_found") { toast.error("Endirim kodu tapılmadı"); return; }
    if (result.status === "inactive") { toast.error("Bu kod aktiv deyil"); return; }
    if (result.status === "expired") { toast.error("Kodun vaxtı bitib"); return; }
    if (result.status === "limit_reached") { toast.error("Kod limiti dolub"); return; }
    if (result.status !== "valid") { toast.error("Endirim kodu tətbiq edilmədi"); return; }
    const percent = Number(result.percent);
    setApplied({ code: result.code, percent });
    toast.success(`${percent}% endirim tətbiq edildi`);
  }

  function removeCode() {
    setApplied(null);
    setCode("");
  }

  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const { isFav, toggle: toggleFav } = useFavorites();
  const fav = isFav(p.id);
  useEffect(() => { trackView(p.id); }, [p.id]);
  async function handleFav() {
    if (!user) { toast.error("Daxil olun"); navigate({ to: "/login" }); return; }
    if (!isRealProductId(p.id)) { toast.error("Bu məhsul saxlanıla bilməz"); return; }
    await toggleFav(p.id);
  }
  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link kopyalandı");
      } catch {
        const ta = document.createElement("textarea");
        ta.value = url; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); toast.success("Link kopyalandı"); } catch { toast.error("Kopyalanmadı"); }
        document.body.removeChild(ta);
      }
    };
    try {
      if (navigator.share) { await navigator.share({ title: p.title, url }); return; }
      await copy();
    } catch (e: any) {
      if (e?.name !== "AbortError") await copy();
    }
  }
  const [similar, setSimilar] = useState<typeof p[]>([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const all = await fetchProducts();
      if (cancel) return;
      const sameCat = all.filter(x => x.id !== p.id && x.category === p.category);
      const pool = sameCat.length >= 4 ? sameCat : [...sameCat, ...all.filter(x => x.id !== p.id && x.category !== p.category)];
      setSimilar(pool.slice(0, 8));
    })();
    return () => { cancel = true; };
  }, [p.id, p.category]);
  const isDbProduct = /^[0-9a-f]{8}-/i.test(p.id);
  const gallery = Array.from(new Set([p.image, ...((p.images ?? []) as string[])].filter(Boolean)));
  const [activeImg, setActiveImg] = useState(gallery[0] ?? p.image);

  async function openBuy() {
    if (!user) {
      toast.info("Sifariş üçün daxil olun");
      navigate({ to: "/login" });
      return;
    }
    if (!isDbProduct) {
      toast.info("Demo məhsul — gerçək satıcı məhsulu seçin");
      return;
    }
    // Check balance before opening terms
    const { data: prof } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .maybeSingle();
    const balance = Number((prof as any)?.wallet_balance ?? 0);
    if (balance < finalTotal) {
      setLowBalance({ balance, total: finalTotal });
      return;
    }
    setAgreed(false);
    setShowTerms(true);
  }

  async function buy() {
    if (!agreed) { toast.error("Şərtləri qəbul etməlisiniz"); return; }
    setBuying(true);
    const { data, error } = await supabase.rpc("create_order", {
      p_product_id: p.id,
      p_quantity: qty,
      p_discount_code: applied?.code || null,
    } as any);
    setBuying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setShowTerms(false);
    toast.success("Sifariş yaradıldı! Satıcı ilə söhbət açıldı.");
    const orderId = data as string | null;
    // Fire-and-forget email notifications
    if (user?.email) {
      notifyEmail({
        recipientEmail: user.email,
        templateName: 'order-placed-buyer',
        templateData: { name: (user as any)?.user_metadata?.display_name || null, productTitle: p.title, amount: finalTotal, orderId: orderId || undefined },
        idempotencyKey: orderId ? `order-buyer-${orderId}` : undefined,
      });
    }
    if (p.sellerId) {
      notifyEmail({
        recipientUserId: p.sellerId,
        templateName: 'new-sale-seller',
        templateData: { productTitle: p.title, amount: finalTotal },
        idempotencyKey: orderId ? `order-seller-${orderId}` : undefined,
      });
    }
    if (orderId) {
      const { data: ord } = await supabase.from("orders").select("conversation_id").eq("id", orderId).maybeSingle();
      const convId = (ord as any)?.conversation_id as string | null;
      if (convId) { navigate({ to: "/messages/$conversationId", params: { conversationId: convId } }); return; }
    }
    navigate({ to: "/orders" });
  }

  async function messageSeller() {
    if (!user) { toast.info("Daxil olun"); navigate({ to: "/login" }); return; }
    if (!p.sellerId) { toast.info("Demo məhsul üçün satıcı mövcud deyil"); return; }
    if (p.sellerId === user.id) { toast.info("Bu sizin məhsulunuzdur"); return; }
    setContacting(true);
    const { data, error } = await supabase.rpc("start_conversation", {
      p_other_user: p.sellerId,
      p_product_id: isDbProduct ? p.id : null,
    } as any);
    setContacting(false);
    if (error || !data) { toast.error(error?.message ?? "Xəta"); return; }
    navigate({ to: "/messages/$conversationId", params: { conversationId: data as string } });
  }


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { label: "Market", to: "/marketplace" },
              ...(p.category ? [{
                label: categoryLabel(p.category),
                to: "/marketplace",
                search: { cat: p.category },
              }] : []),
              ...(p.subcategory ? [{
                label: p.subcategory,
                to: "/marketplace",
                search: { cat: p.category, sub: p.subcategory },
              }] : []),
              ...(p.platform ? [{
                label: p.platform,
                to: "/marketplace",
                search: { cat: p.category, sub: p.subcategory ?? "all", platform: p.platform },
              }] : []),
              { label: p.title },
            ]}
          />

          <div className="grid lg:grid-cols-[260px_1fr] gap-8 min-w-0">
            {/* Gallery — kiçik */}
            <div className="min-w-0 flex flex-col items-center lg:items-start">
              {p.image && p.image !== PRODUCT_PLACEHOLDER ? (
                <>
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-border card-shadow w-full max-w-[260px]">
                    <img src={activeImg} alt={p.title} className="absolute inset-0 h-full w-full object-cover" />
                    {p.tag && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-destructive text-destructive-foreground">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  {gallery.length > 1 && (
                    <div className="mt-3 grid grid-cols-4 gap-2 w-full max-w-[260px]">
                      {gallery.map((src, i) => (
                        <button key={i} onClick={() => setActiveImg(src)} className={`aspect-square overflow-hidden rounded-md border transition ${activeImg === src ? "border-primary" : "border-border hover:border-primary/60"}`}>
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>



            {/* Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-surface border border-border">{p.platform}</span>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-surface border border-border">{categoryLabel(p.category)}</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${
                  p.delivery === "Instant" ? "bg-neon/15 text-neon border border-neon/30" : "bg-surface border border-border"
                }`}>
                  {p.delivery === "Instant" && <Zap className="h-3 w-3" />}
                  {p.delivery === "Instant" ? t("product.delivery.instant") : t("product.delivery.manual")}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight">{p.title}</h1>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(p.rating) ? "fill-warning text-warning" : "text-muted"}`} />
                  ))}
                  <span className="ml-1 font-semibold">{p.rating}</span>
                  <span className="text-muted-foreground text-sm">({p.reviews} rəy)</span>
                </div>
                <span className="text-sm text-muted-foreground">Stok: <span className="text-success font-semibold">{p.stock}</span></span>
              </div>

              <div className="mt-6 p-5 rounded-2xl bg-card-gradient border border-border card-shadow">
                <div className="flex items-end gap-3">
                  <span className="font-display text-4xl font-bold text-gradient">{format(p.price)}</span>
                  {p.oldPrice && (
                    <>
                      <span className="text-lg text-muted-foreground line-through pb-1">{format(p.oldPrice)}</span>
                      <span className="ml-auto px-2 py-1 rounded-md text-xs font-bold bg-destructive text-destructive-foreground pb-1">-{discount}%</span>
                    </>
                  )}
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center rounded-xl border border-border bg-background shrink-0">
                      <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-11 hover:bg-surface rounded-l-xl">−</button>
                      <span className="w-10 text-center font-semibold">{qty}</span>
                      <button onClick={() => setQty(Math.min(p.stock, qty + 1))} className="w-10 h-11 hover:bg-surface rounded-r-xl">+</button>
                    </div>
                    {applied ? (
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2 h-11 px-3 rounded-xl bg-success/10 border border-success/30 text-sm">
                        <span className="font-semibold text-success truncate">✓ {applied.code} · −{applied.percent}%</span>
                        <button onClick={removeCode} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Kodu sil"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 flex gap-2">
                        <input
                          value={code}
                          onChange={e => setCode(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") applyCode(); }}
                          placeholder="Endirim kodu (varsa)"
                          className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-background border border-border text-sm focus:border-primary outline-none uppercase"
                        />
                        <button
                          onClick={applyCode}
                          disabled={applying || !code.trim()}
                          className="h-11 px-4 rounded-xl border border-neon/40 bg-neon/10 text-neon text-sm font-semibold hover:bg-neon/20 disabled:opacity-50 shrink-0 inline-flex items-center gap-1.5"
                        >
                          {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tətbiq et"}
                        </button>
                      </div>
                    )}
                  </div>

                  {applied && (
                    <div className="rounded-xl border border-border bg-surface/40 p-3 text-sm space-y-1">
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Ara cəmi</span><span className="font-medium">{format(subtotal)}</span></div>
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Endirim ({applied.percent}%)</span><span className="text-success">−{format(discountAmount)}</span></div>
                      <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border"><span className="font-semibold">Son qiymət</span><span className="font-display text-lg font-bold text-neon">{format(finalTotal)}</span></div>
                    </div>
                  )}


                  <div className="flex items-center gap-2">
                    <button
                      disabled={buying || p.stock < 1}
                      onClick={openBuy}
                      className="flex-1 min-w-0 h-12 px-4 rounded-xl bg-neon text-background font-bold neon-ring hover:scale-[1.01] transition disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      Balansla al
                    </button>
                    <button onClick={messageSeller} disabled={contacting} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border hover:border-primary disabled:opacity-50" aria-label="Satıcıya mesaj">
                      {contacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    </button>
                    <button onClick={handleFav} className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${fav ? "border-neon text-neon" : "border-border hover:border-primary"}`} aria-label="Favorilərə əlavə et"><Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} /></button>
                    <button onClick={handleShare} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border hover:border-primary" aria-label="Paylaş"><Share2 className="h-4 w-4" /></button>
                  </div>

                </div>


                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Lock className="h-3.5 w-3.5 text-neon" /> Escrow</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Package className="h-3.5 w-3.5 text-neon" /> Sürətli</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-neon" /> Zəmanət</div>
                </div>
              </div>

              {/* Seller card */}
              {p.sellerId ? (
                <Link to="/u/$id" params={{ id: p.sellerId }} className="mt-5 p-5 rounded-2xl border border-border bg-surface/50 flex items-center gap-4 hover:border-primary transition">
                  <div className="relative shrink-0">
                    {p.seller.avatarUrl ? (
                      <img src={p.seller.avatarUrl} alt={p.seller.name} className="h-12 w-12 rounded-xl object-cover border border-border" />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon/15 border border-neon/30 text-neon font-bold">
                        {p.seller.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{p.seller.name}</h4>
                      <VerifiedBadge verified={p.seller.verified} size={16} />
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> <b className="text-foreground">{p.seller.rating.toFixed(1)}</b> ({(p.seller as any).reviewsCount ?? 0} rəy)</span>
                      <span>{p.seller.sales} satış</span>
                      <span>Profilə bax →</span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); messageSeller(); }} disabled={contacting} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border text-sm hover:border-primary disabled:opacity-50">
                    {contacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} Mesaj
                  </button>
                </Link>
              ) : (
                <div className="mt-5 p-5 rounded-2xl border border-border bg-surface/50 flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon/15 border border-neon/30 text-neon font-bold">
                    {p.seller.name[0]}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{p.seller.name}</h4>
                    <p className="text-xs text-muted-foreground">Demo satıcı</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-16 grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <h2 className="font-display text-2xl font-bold mb-4">Məhsul haqqında</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{p.description}</p>
              <h3 className="font-display text-lg font-semibold mt-8 mb-3">Çatdırılma qaydası</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Ödəniş təsdiqləndikdən sonra məhsul avtomatik açılır</li>
                <li>• Hesab məlumatları və ya açar şəxsi panelində görünür</li>
                <li>• Problem yaranarsa 24/7 dəstək komandası kömək edir</li>
                <li>• Escrow sistem hər iki tərəfi qoruyur</li>
              </ul>
            </div>
            <aside className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow h-fit">
              <h3 className="font-display font-semibold mb-4">Zəmanətlər</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3"><ShieldCheck className="h-5 w-5 text-neon shrink-0" /> 100% escrow qorunma — pul satıcıya yalnız təsdiqdən sonra köçür</li>
                <li className="flex gap-3"><Zap className="h-5 w-5 text-neon shrink-0" /> Anında çatdırılma — sifariş sonrası dərhal</li>
                <li className="flex gap-3"><Package className="h-5 w-5 text-neon shrink-0" /> Geri qaytarma — çatdırılma uğursuz olarsa</li>
              </ul>
            </aside>
          </div>

          {/* Reviews */}
          {isDbProduct && <ReviewSection productId={p.id} sellerId={p.sellerId ?? null} />}

          {/* Similar */}
          {similar.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-2xl font-bold mb-6">Oxşar məhsullar</h2>
              <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
                {similar.slice(0, 8).map(s => <ProductCard key={s.id} p={s} />)}
              </div>
            </div>
          )}

          {/* Recently viewed */}
          <RecentlyViewed excludeId={p.id} />
        </div>
      </main>
      <Footer />

      {showTerms && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={() => !buying && setShowTerms(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card card-shadow overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-lg font-bold inline-flex items-center gap-2">
                <FileText className="h-5 w-5 text-neon" /> Alış-veriş şərtləri
              </h3>
              <button onClick={() => !buying && setShowTerms(false)} className="text-muted-foreground hover:text-foreground" aria-label="Bağla">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto px-5 py-4 text-sm space-y-3 text-muted-foreground">
              <div className="rounded-xl border border-neon/30 bg-neon/5 p-4 space-y-1.5 text-foreground">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Sifariş xülasəsi</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Məhsul</span>
                  <span className="font-medium line-clamp-1 max-w-[60%] text-right">{p.title}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Qiymət × Say</span>
                  <span className="font-medium">{format(p.price)} × {qty}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ara cəmi</span>
                  <span className="font-medium">{format(subtotal)}</span>
                </div>
                {applied && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Endirim ({applied.code} · {applied.percent}%)</span>
                    <span className="text-success">−{format(discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-border">
                  <span className="font-semibold">Ödəniləcək məbləğ</span>
                  <span className="font-display text-xl font-bold text-neon">{format(finalTotal)}</span>
                </div>
              </div>
              <p><b className="text-foreground">1. Escrow qoruması.</b> Ödədiyiniz <span className="text-neon font-semibold">{format(finalTotal)}</span> NextPlay tərəfindən saxlanılır və yalnız sifarişi təsdiqlədikdən sonra satıcıya köçürülür.</p>
              <p><b className="text-foreground">2. Çatdırılma müddəti.</b> Satıcı sifarişi 24 saat ərzində mesaj vasitəsi ilə təhvil verməlidir. Anında çatdırılma məhsullarında məlumat dərhal göstərilir.</p>
              <p><b className="text-foreground">3. Avtomatik təsdiq.</b> Çatdırılmadan 24 saat sonra sifariş təsdiq etməsəniz, sistem onu avtomatik tamamlayır və vəsait satıcıya keçir.</p>
              <p><b className="text-foreground">4. Etiraz hüququ.</b> Problem yaranarsa, "Etiraz et" düyməsi ilə dəstəyə müraciət edə bilərsiniz. Etiraz üçün <b>video sübut və ya ekran görüntüsü</b> mütləqdir.</p>
              <p><b className="text-foreground">5. Geri qaytarma.</b> Sübutlu etirazda admin tam və ya qismən geri qaytarma edə bilər. Hesab dəyişikliyi (şifrə, e-poçt) edildikdən sonra geri qaytarma rədd edilir.</p>
              <p><b className="text-foreground">6. Qadağalar.</b> Satıcı ilə platforma xaricində ödəniş və ya əlaqə qadağandır — bu halda Escrow qorunması itirilir və hesab bloklana bilər.</p>
              <p><b className="text-foreground">7. Komissiya.</b> NextPlay hər uğurlu sifarişdən 5% komissiya tutur — bu məbləğ satıcıdan tutulur, alıcı yalnız məhsul qiymətini ödəyir.</p>
              <p>Tam mətn üçün <Link to="/terms" target="_blank" className="text-neon hover:underline">Şərtlər</Link>, <Link to="/refund" target="_blank" className="text-neon hover:underline">Geri qaytarma</Link> və <Link to="/privacy" target="_blank" className="text-neon hover:underline">Məxfilik</Link> səhifələrinə baxın.</p>
            </div>

            <label className="flex items-start gap-2.5 px-5 py-3 border-t border-border bg-surface/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
              />
              <span className="text-sm">Yuxarıdakı bütün şərtləri oxudum və qəbul edirəm.</span>
            </label>
            <div className="flex gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowTerms(false)}
                disabled={buying}
                className="h-11 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface disabled:opacity-50"
              >
                Ləğv et
              </button>
              <button
                onClick={buy}
                disabled={!agreed || buying}
                className="flex-1 h-11 rounded-xl bg-neon text-background font-semibold neon-ring transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {buying && <Loader2 className="h-4 w-4 animate-spin" />}
                {agreed ? `Razıyam — ${format(finalTotal)} ödə` : "Şərtləri qəbul edin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {lowBalance && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setLowBalance(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card card-shadow overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border">
              <h3 className="font-display text-lg font-bold">Balans kifayət etmir</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl border border-border bg-surface/40 p-3 text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mövcud balans</span>
                  <span className="font-semibold tabular-nums">{format(lowBalance.balance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sifariş məbləği</span>
                  <span className="font-semibold tabular-nums text-neon">{format(lowBalance.total)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Çatışmır</span>
                  <span className="font-semibold tabular-nums text-destructive">{format(lowBalance.total - lowBalance.balance)}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Balansınızı artırmaq istəyirsiniz?</p>
            </div>
            <div className="flex gap-2 p-4 border-t border-border">
              <button
                onClick={() => setLowBalance(null)}
                className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-surface"
              >
                İptal
              </button>
              <button
                onClick={() => { setLowBalance(null); navigate({ to: "/wallet" }); }}
                className="flex-1 h-11 rounded-xl bg-neon text-background font-semibold neon-ring hover:opacity-95"
              >
                Balansı artır
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
