import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, Medal, Trophy } from "lucide-react";

export type SellerTier = "new" | "bronze" | "silver" | "gold";

export function tierFor(sales: number, rating: number, reviews: number): SellerTier {
  if (sales >= 50 && rating >= 4.5 && reviews >= 10) return "gold";
  if (sales >= 15 && rating >= 4.0 && reviews >= 3) return "silver";
  if (sales >= 3) return "bronze";
  return "new";
}

const META: Record<SellerTier, { label: string; cls: string; Icon: any }> = {
  new:    { label: "Yeni",   cls: "bg-muted/30 text-muted-foreground border-border",                 Icon: Medal },
  bronze: { label: "Bronze", cls: "bg-amber-900/30 text-amber-400 border-amber-700/50",              Icon: Medal },
  silver: { label: "Silver", cls: "bg-slate-500/20 text-slate-200 border-slate-400/40",              Icon: Award },
  gold:   { label: "Gold",   cls: "bg-yellow-500/15 text-yellow-300 border-yellow-400/40 shadow-[0_0_12px_rgba(234,179,8,0.25)]", Icon: Trophy },
};

type Props = { sellerId: string; size?: "sm" | "md"; showStats?: boolean };

export function SellerTierBadge({ sellerId, size = "sm", showStats = false }: Props) {
  const [stats, setStats] = useState<{ sales: number; rating: number; reviews: number } | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.rpc("get_seller_stats" as any, { p_seller_id: sellerId });
      const row = Array.isArray(data) ? data[0] : data;
      if (!cancel && row) {
        setStats({
          sales: Number(row.completed_sales ?? 0),
          rating: Number(row.avg_rating ?? 0),
          reviews: Number(row.reviews_count ?? 0),
        });
      }
    })();
    return () => { cancel = true; };
  }, [sellerId]);

  if (!stats) return null;
  const tier = tierFor(stats.sales, stats.rating, stats.reviews);
  const { label, cls, Icon } = META[tier];
  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-semibold ${cls} ${padding}`}
      title={`${label} satıcı — ${stats.sales} satış · ${stats.rating.toFixed(1)}★ (${stats.reviews})`}>
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {label}
      {showStats && <span className="opacity-70 font-normal ml-1">· {stats.sales} satış</span>}
    </span>
  );
}
