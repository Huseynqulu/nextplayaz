import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Sparkles } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";

type PublicRecentSale = {
  product_title: string;
  product_slug: string;
  buyer_name_masked: string;
  display_price: number;
  sold_at: string;
};

function useTimeAgo() {
  const t = useT();
  return (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return t("common.justNow");
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t("common.minAgo")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t("common.hourAgo")}`;
    return `${Math.floor(diff / 86400)} ${t("common.dayAgo")}`;
  };
}

export function LiveSalesTicker() {
  const t = useT();
  const timeAgo = useTimeAgo();
  const { format } = useCurrency();
  const [sales, setSales] = useState<PublicRecentSale[]>([]);

  async function load() {
    const { data } = await supabase.rpc("get_recent_sales_public" as any, {
      _limit: 14,
    });
    if (Array.isArray(data)) setSales(data as PublicRecentSale[]);
  }
  useEffect(() => {
    void load();
    const t2 = setInterval(() => void load(), 25000);
    return () => clearInterval(t2);
  }, []);

  if (!sales.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="rounded-2xl border border-border bg-card-gradient p-5 sm:p-6 card-shadow relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-neon/10 blur-3xl" />
        <div className="relative flex items-center gap-2 mb-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="text-xs uppercase tracking-wider font-bold text-success">{t("home.liveLabel")}</span>
          <h3 className="font-display text-lg font-bold ml-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-neon" /> {t("home.liveTitle")}
          </h3>
        </div>

        <div className="relative overflow-hidden group">
          <div className="flex gap-3 animate-[scroll_45s_linear_infinite] group-hover:[animation-play-state:paused] w-max">
            {[...sales, ...sales].map((s, i) => (
              <Link
                key={`${s.product_slug}-${s.sold_at}-${i}`}
                to="/product/$slug"
                params={{ slug: s.product_slug }}
                className="shrink-0 inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface/60 hover:border-neon/40 transition px-3.5 py-2.5"
              >
                <div className="h-8 w-8 grid place-items-center rounded-lg bg-neon/15 text-neon">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold">
                    <span className="text-neon">{s.buyer_name_masked}</span> {t("home.liveBought")}
                  </div>
                  <div className="text-muted-foreground truncate max-w-[200px]">{s.product_title}</div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-sm font-bold text-gradient">{format(Number(s.display_price))}</div>
                  <div className="text-[10px] text-muted-foreground">{timeAgo(s.sold_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}
