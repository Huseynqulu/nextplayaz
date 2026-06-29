import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { products as mockProducts } from "@/lib/marketplace-data";
import { fetchProductBySlug } from "@/lib/products";
import { Star, ShieldCheck, Zap, Lock, Package, MessageCircle, Heart, Share2, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await fetchProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  component: ProductPage,
  errorComponent: ({ error }) => <div className="min-h-screen grid place-items-center text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Məhsul tapılmadı.</div>,
  head: ({ loaderData }) => ({
    meta: loaderData?.product ? [
      { title: `${loaderData.product.title} — NextPlay.az` },
      { name: "description", content: loaderData.product.description },
      { property: "og:title", content: loaderData.product.title },
      { property: "og:description", content: loaderData.product.description },
      { property: "og:image", content: loaderData.product.image },
    ] : [],
  }),
});

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [code, setCode] = useState("");
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const similar = mockProducts.filter(x => x.id !== p.id && x.category === p.category).slice(0, 4);
  const isDbProduct = /^[0-9a-f]{8}-/i.test(p.id);

  async function buy() {
    if (!user) {
      toast.info("Sifariş üçün daxil olun");
      navigate({ to: "/login" });
      return;
    }
    if (!isDbProduct) {
      toast.info("Demo məhsul — gerçək satıcı məhsulu seçin");
      return;
    }
    setBuying(true);
    const { data, error } = await supabase.rpc("create_order", {
      p_product_id: p.id,
      p_quantity: qty,
      p_discount_code: code.trim() || null,
    } as any);
    setBuying(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sifariş yaradıldı! Escrow-da saxlanıldı.");
    navigate({ to: "/orders" });
    void data;
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
          <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
            <Link to="/" className="hover:text-foreground">Ana</Link> /
            <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link> /
            <span className="text-foreground truncate">{p.title}</span>
          </nav>

          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10">
            {/* Gallery */}
            <div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border card-shadow">
                <img src={p.image} alt={p.title} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
                {p.tag && (
                  <span className="absolute top-4 left-4 px-3 py-1.5 rounded-md text-xs font-bold bg-destructive text-destructive-foreground">
                    {p.tag}
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[p.image, p.image, p.image, p.image].map((src, i) => (
                  <button key={i} className="aspect-square overflow-hidden rounded-xl border border-border hover:border-primary transition">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-surface border border-border">{p.platform}</span>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-surface border border-border">{p.category}</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${
                  p.delivery === "Instant" ? "bg-neon/15 text-neon border border-neon/30" : "bg-surface border border-border"
                }`}>
                  {p.delivery === "Instant" && <Zap className="h-3 w-3" />}
                  {p.delivery} delivery
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
                  <span className="font-display text-4xl font-bold text-gradient">{p.price.toFixed(2)} ₼</span>
                  {p.oldPrice && (
                    <>
                      <span className="text-lg text-muted-foreground line-through pb-1">{p.oldPrice.toFixed(2)} ₼</span>
                      <span className="ml-auto px-2 py-1 rounded-md text-xs font-bold bg-destructive text-destructive-foreground pb-1">-{discount}%</span>
                    </>
                  )}
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-border bg-background">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-11 hover:bg-surface rounded-l-xl">−</button>
                    <span className="w-10 text-center font-semibold">{qty}</span>
                    <button onClick={() => setQty(Math.min(p.stock, qty + 1))} className="w-10 h-11 hover:bg-surface rounded-r-xl">+</button>
                </div>

                <div className="mt-3">
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Endirim kodu (varsa)"
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:border-primary outline-none uppercase"
                  />
                </div>

                  <button
                    disabled={buying || p.stock < 1}
                    onClick={buy}
                    className="flex-1 h-11 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.01] transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {buying && <Loader2 className="h-4 w-4 animate-spin" />}
                    Sifariş ver — {(p.price * qty).toFixed(2)} ₼
                  </button>
                  <button onClick={messageSeller} disabled={contacting} className="grid h-11 w-11 place-items-center rounded-xl border border-border hover:border-primary disabled:opacity-50" aria-label="Satıcıya mesaj">
                    {contacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  </button>
                  <button className="grid h-11 w-11 place-items-center rounded-xl border border-border hover:border-primary" aria-label="Favorilərə əlavə et"><Heart className="h-4 w-4" /></button>
                  <button className="grid h-11 w-11 place-items-center rounded-xl border border-border hover:border-primary" aria-label="Paylaş"><Share2 className="h-4 w-4" /></button>
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
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon/15 border border-neon/30 text-neon font-bold">
                      {p.seller.name[0]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{p.seller.name}</h4>
                      {p.seller.verified && <ShieldCheck className="h-4 w-4 text-neon shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {p.seller.rating}</span>
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
              <p className="text-muted-foreground leading-relaxed">{p.description}</p>
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

          {/* Similar */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold mb-6">Oxşar məhsullar</h2>
            <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
              {similar.map(s => <ProductCard key={s.id} p={s} />)}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
