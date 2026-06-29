import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Loader2, ChevronRight } from "lucide-react";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/gift-cards/$platform/")({
  component: PlatformGiftCards,
  head: ({ params }) => ({
    meta: [
      { title: `${cap(params.platform)} Hədiyyə Kartları — NextPlay.az` },
      { name: "description", content: `${cap(params.platform)} gift kartları ən ucuz qiymətlərlə. Bütün nominallar tək yerdə.` },
    ],
  }),
  errorComponent: () => <div className="p-10 text-center">Xəta baş verdi</div>,
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center p-10">
        <div className="text-center">
          <p className="text-muted-foreground">Bu platforma tapılmadı.</p>
          <Link to="/gift-cards" className="text-neon underline mt-2 inline-block">← Bütün platformalar</Link>
        </div>
      </main>
      <Footer />
    </div>
  ),
});

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

type Platform = { id: string; slug: string; name: string; logo_url: string | null; description: string | null };
type Denom = { id: string; face_value: number; currency: string; region: string | null; label: string | null };

function PlatformGiftCards() {
  const { platform } = useParams({ from: "/gift-cards/$platform/" });
  const [pl, setPl] = useState<Platform | null | undefined>(undefined);
  const [denoms, setDenoms] = useState<Denom[]>([]);
  const [cheapest, setCheapest] = useState<Record<string, number>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { format } = useCurrency();

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("gift_platforms" as any)
        .select("id,slug,name,logo_url,description")
        .eq("slug", platform)
        .eq("is_active", true)
        .maybeSingle();
      if (!p) { setPl(null); return; }
      setPl(p as any);

      const { data: ds } = await supabase
        .from("gift_denominations" as any)
        .select("id,face_value,currency,region,label,sort_order")
        .eq("platform_id", (p as any).id)
        .eq("is_active", true)
        .order("sort_order").order("face_value");
      const list = ((ds as any) ?? []) as Denom[];
      setDenoms(list);

      // Find cheapest price per denomination
      if (list.length > 0) {
        const denomIds = list.map(d => d.id);
        const { data: prods } = await supabase
          .from("products")
          .select("gift_denomination_id,price")
          .in("gift_denomination_id", denomIds)
          .eq("is_active", true)
          .gt("stock", 0);
        const cheap: Record<string, number> = {};
        const cnt: Record<string, number> = {};
        ((prods as any[]) ?? []).forEach((p: any) => {
          const id = p.gift_denomination_id;
          const price = Number(p.price);
          if (cheap[id] === undefined || price < cheap[id]) cheap[id] = price;
          cnt[id] = (cnt[id] ?? 0) + 1;
        });
        setCheapest(cheap);
        setCounts(cnt);
      }
    })();
  }, [platform]);

  if (pl === undefined) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-neon" /></main>
        <Footer />
      </div>
    );
  }
  if (pl === null) throw notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-10">
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
          <Link to="/gift-cards" className="hover:text-foreground">Hədiyyə Kartları</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{pl.name}</span>
        </nav>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-surface grid place-items-center overflow-hidden">
            {pl.logo_url ? <img src={pl.logo_url} alt={pl.name} className="h-full w-full object-cover" /> : <Gift className="h-8 w-8 text-neon" />}
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">{pl.name} Hədiyyə Kartları</h1>
            <p className="text-muted-foreground text-sm">Nominal seç — alternativ satıcılar göstəriləcək</p>
          </div>
        </div>

        {denoms.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">Bu platforma üçün hələ nominal əlavə edilməyib.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {denoms.map(d => {
              const has = counts[d.id] > 0;
              return (
                <div key={d.id}
                  className={`rounded-xl border p-4 text-center transition flex flex-col ${
                    has ? "border-border bg-card-gradient hover:border-neon hover:bg-neon/5" : "border-border bg-surface/40 opacity-70"
                  }`}>
                  <div className="font-display text-2xl font-bold text-gradient">{Number(d.face_value).toFixed(0)} {d.currency}</div>
                  {d.region && <div className="text-[10px] mt-1 px-2 py-0.5 rounded-full bg-surface border border-border inline-block">{d.region}</div>}
                  {d.label && <div className="text-xs text-muted-foreground mt-1">{d.label}</div>}
                  <div className="mt-3 pt-3 border-t border-border/60 flex-1">
                    {has ? (
                      <>
                        <div className="text-[10px] text-muted-foreground uppercase">Ən ucuz</div>
                        <div className="font-bold text-neon">{format(cheapest[d.id])}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{counts[d.id]} satıcı</div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">Satışda deyil</div>
                    )}
                  </div>
                  {has ? (
                    <Link to="/gift-cards/$platform/$denom" params={{ platform: pl.slug, denom: d.id }}
                      className="mt-3 inline-flex items-center justify-center h-9 rounded-lg bg-neon text-neon-foreground text-xs font-bold hover:opacity-90 transition">
                      Al →
                    </Link>
                  ) : (
                    <button disabled className="mt-3 h-9 rounded-lg bg-surface text-muted-foreground text-xs font-semibold cursor-not-allowed">
                      Stokda yoxdur
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
