import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Loader2 } from "lucide-react";

export const Route = createFileRoute("/gift-cards")({
  component: GiftCardsRoute,
  head: () => ({
    meta: [
      { title: "Hədiyyə Kartları — NextPlay.az" },
      { name: "description", content: "PlayStation, Steam, Xbox, Netflix və digər platformaların hədiyyə kartları. Ən ucuz qiymətlər, ani çatdırılma." },
      { property: "og:title", content: "Hədiyyə Kartları — NextPlay.az" },
      { property: "og:description", content: "Bütün məşhur platformaların gift kartları bir yerdə." },
    ],
  }),
  errorComponent: () => <div className="p-10 text-center">Xəta baş verdi</div>,
  notFoundComponent: () => <div className="p-10 text-center">Tapılmadı</div>,
});

type Platform = { id: string; slug: string; name: string; logo_url: string | null; description: string | null };

function GiftCardsRoute() {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath !== "/gift-cards") {
    return <Outlet />;
  }

  return <GiftCardsIndex />;
}

function GiftCardsIndex() {
  const [platforms, setPlatforms] = useState<Platform[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase
        .from("gift_platforms" as any)
        .select("id,slug,name,logo_url,description")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      const list = ((ps as any) ?? []) as Platform[];
      setPlatforms(list);

      const { data: ds } = await supabase
        .from("gift_denominations" as any)
        .select("platform_id")
        .eq("is_active", true);
      const map: Record<string, number> = {};
      ((ds as any[]) ?? []).forEach((d: any) => {
        map[d.platform_id] = (map[d.platform_id] ?? 0) + 1;
      });
      setCounts(map);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon/10 text-neon text-xs font-semibold mb-3">
            <Gift className="h-3.5 w-3.5" /> Hədiyyə Kartları
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Bütün gift kartları bir yerdə</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Platforma seç → istədiyin nominalı tap → ən ucuz satıcıdan al. Ani çatdırılma, eskrov qorunması.</p>
        </div>

        {!platforms ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
        ) : platforms.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">Hələ heç bir platforma əlavə edilməyib.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {platforms.map((p) => (
              <Link
                key={p.id}
                to="/gift-cards/$platform"
                params={{ platform: p.slug }}
                className="group rounded-2xl border border-border bg-card-gradient p-5 hover:border-neon hover:bg-neon/5 transition flex flex-col items-center text-center"
              >
                <div className="h-20 w-20 rounded-2xl bg-surface grid place-items-center mb-3 overflow-hidden">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <Gift className="h-10 w-10 text-muted-foreground group-hover:text-neon transition" />
                  )}
                </div>
                <div className="font-display font-bold">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{counts[p.id] ?? 0} nominal</div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
