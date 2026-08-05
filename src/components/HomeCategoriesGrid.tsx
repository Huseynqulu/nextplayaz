import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

type HomeCategory = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string;
  sort_order: number;
};

export function HomeCategoriesGrid() {
  const t = useT();
  const [cats, setCats] = useState<HomeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("home_categories" as any)
        .select("id,title,subtitle,image_url,link_url,sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .limit(24);
      setCats((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  if (!loading && cats.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-neon" />
            {t("home.catsTitle") || "Kateqoriyalar"}
          </h2>
        </div>
        <Link
          to="/marketplace"
          className="text-sm text-neon hover:underline inline-flex items-center gap-1 whitespace-nowrap"
        >
          {t("home.viewAll") || "Hamısına bax"} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-secondary animate-pulse" />
            ))
          : cats.map((c, i) => (
              <Link
                key={c.id}
                to={c.link_url as any}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-border bg-card-gradient card-shadow hover:border-neon/60 hover:-translate-y-1 transition-all"
                style={{ animation: `rise 0.5s ${i * 0.04}s both` }}
              >
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-neon/10 to-transparent" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-white text-xs sm:text-sm font-bold uppercase tracking-wide line-clamp-2 drop-shadow">
                    {c.title}
                  </p>
                  {c.subtitle && (
                    <p className="text-white/70 text-[10px] sm:text-xs mt-0.5 line-clamp-1">
                      {c.subtitle}
                    </p>
                  )}
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}

export default HomeCategoriesGrid;
