import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Loader2, ChevronRight, Zap, Hand, ShieldCheck, Star } from "lucide-react";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/gift-cards/$platform/$denom")({
  component: DenomSellers,
  head: () => ({
    meta: [{ title: "Hədiyyə kartı — Satıcılar — NextPlay.az" }],
  }),
  errorComponent: () => <div className="p-10 text-center">Xəta baş verdi</div>,
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center p-10">
        <div className="text-center">
          <p className="text-muted-foreground">Bu nominal tapılmadı.</p>
          <Link to="/gift-cards" className="text-neon underline mt-2 inline-block">← Bütün gift kartları</Link>
        </div>
      </main>
      <Footer />
    </div>
  ),
});

type Platform = { id: string; slug: string; name: string; logo_url: string | null };
type Denom = { id: string; platform_id: string; face_value: number; currency: string; region: string | null; label: string | null };
type Listing = {
  id: string; slug: string; title: string; price: number; stock: number;
  delivery: "Instant" | "Manual";
  seller_id: string;
  seller?: { name: string; shop?: string | null; avatar: string | null; verified: boolean };
};

function DenomSellers() {
  const { platform, denom } = useParams({ from: "/gift-cards/$platform/$denom" });
  const [pl, setPl] = useState<Platform | null>(null);
  const [d, setD] = useState<Denom | null | undefined>(undefined);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { format } = useCurrency();

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) Fetch denom
      const { data: dd } = await supabase
        .from("gift_denominations" as any)
        .select("id,platform_id,face_value,currency,region,label,is_active")
        .eq("id", denom).maybeSingle();
      if (!dd || !(dd as any).is_active) { setD(null); setLoading(false); return; }
      setD(dd as any);

      // 2) Platform
      const { data: pp } = await supabase
        .from("gift_platforms" as any)
        .select("id,slug,name,logo_url")
        .eq("id", (dd as any).platform_id).maybeSingle();
      setPl((pp as any) ?? null);

      // 3) Listings (cheapest first)
      const { data: prods } = await supabase
        .from("products")
        .select("id,slug,title,price,stock,delivery,seller_id")
        .eq("gift_denomination_id", denom)
        .eq("is_active", true)
        .gt("stock", 0)
        .order("price", { ascending: true })
        .limit(100);
      const rows = ((prods as any) ?? []) as Listing[];

      if (rows.length > 0) {
        const sellerIds = Array.from(new Set(rows.map(r => r.seller_id)));
        const { data: profs } = await supabase
          .from("public_profiles" as any)
          .select("id,display_name,username,shop_name,avatar_url,verified_at")
          .in("id", sellerIds);
        const map = new Map<string, any>(((profs as any[]) ?? []).map((p: any) => [p.id, p]));
        rows.forEach(r => {
          const p = map.get(r.seller_id);
          r.seller = p ? {
            name: p.shop_name || p.display_name || p.username || "Satıcı",
            shop: p.shop_name,
            avatar: p.avatar_url,
            verified: !!p.verified_at,
          } : undefined;
        });
      }
      setListings(rows);
      setLoading(false);
    })();
  }, [denom]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-neon" /></main>
        <Footer />
      </div>
    );
  }
  if (d === null) throw notFound();
  if (!d) return null;

  const cheapest = listings[0]?.price;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-10">
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5 flex-wrap">
          <Link to="/gift-cards" className="hover:text-foreground">Hədiyyə Kartları</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          {pl && <Link to="/gift-cards/$platform" params={{ platform: pl.slug }} className="hover:text-foreground">{pl.name}</Link>}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{Number(d.face_value).toFixed(0)} {d.currency}</span>
        </nav>

        <div className="rounded-2xl border border-border bg-card-gradient p-6 mb-6 flex items-center gap-4 flex-wrap">
          <div className="h-16 w-16 rounded-xl bg-surface grid place-items-center overflow-hidden">
            {pl?.logo_url ? <img src={pl.logo_url} alt={pl.name} className="h-full w-full object-cover" /> : <Gift className="h-8 w-8 text-neon" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold">
              {pl?.name} {Number(d.face_value).toFixed(0)} {d.currency} {d.region && <span className="text-sm text-muted-foreground">· {d.region}</span>}
            </h1>
            {d.label && <p className="text-sm text-muted-foreground">{d.label}</p>}
            <p className="text-xs text-muted-foreground mt-1">{listings.length} satıcı · eskrov ilə qorunan ödəniş</p>
          </div>
          {cheapest !== undefined && (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase">Ən ucuz</div>
              <div className="font-display text-2xl font-bold text-neon">{format(cheapest)}</div>
            </div>
          )}
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Satıcılar (ən ucuzdan)</h2>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface/40 p-10 text-center">
            <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Bu nominalı satan satıcı hələ yoxdur.</p>
            <p className="text-sm text-muted-foreground mt-1">Satıcı olsanız, panelinizdən gift kartı əlavə edə bilərsiniz.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {listings.map((l, i) => (
              <Link key={l.id} to="/product/$slug" params={{ slug: l.slug }}
                className={`group rounded-xl border p-4 flex items-center gap-4 transition ${
                  i === 0 ? "border-neon bg-neon/5" : "border-border bg-card-gradient hover:border-neon/50"
                }`}>
                <div className="h-10 w-10 rounded-full bg-surface overflow-hidden grid place-items-center flex-shrink-0">
                  {l.seller?.avatar ? <img src={l.seller.avatar} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-bold">{(l.seller?.name ?? "S")[0]}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{l.seller?.name ?? "Satıcı"}</span>
                    {l.seller?.verified && <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-neon/15 text-neon"><ShieldCheck className="h-3 w-3" /> Təsdiqli</span>}
                    {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon text-background font-bold">ƏN UCUZ</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                    {l.delivery === "Instant" ? (
                      <span className="inline-flex items-center gap-1 text-neon"><Zap className="h-3 w-3" /> Anında</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Hand className="h-3 w-3" /> Əllə</span>
                    )}
                    <span>Stok: {l.stock}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-lg">{format(l.price)}</div>
                  <div className="text-[10px] text-muted-foreground group-hover:text-neon transition">Detallara bax →</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-border bg-surface/40 p-4 flex items-start gap-3 text-xs text-muted-foreground">
          <Star className="h-4 w-4 text-neon flex-shrink-0 mt-0.5" />
          <p>Hər ödəniş eskrov sistemi ilə qorunur. Kart işləməzsə dəstəyə müraciət edin — vəsait geri qaytarılır.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
