import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, Crown, Medal, Trophy } from "lucide-react";

export type SellerTier = "bronze" | "silver" | "gold" | "platinum";

const META: Record<SellerTier, { label: string; cls: string; Icon: any; rate: string }> = {
  bronze:   { label: "Bronze",   cls: "bg-amber-900/30 text-amber-400 border-amber-700/50",                 Icon: Medal,  rate: "5%" },
  silver:   { label: "Silver",   cls: "bg-slate-500/20 text-slate-200 border-slate-400/40",                 Icon: Award,  rate: "4%" },
  gold:     { label: "Gold",     cls: "bg-yellow-500/15 text-yellow-300 border-yellow-400/40 shadow-[0_0_12px_rgba(234,179,8,0.25)]", Icon: Trophy, rate: "3%" },
  platinum: { label: "Platinum", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-400/40 shadow-[0_0_14px_rgba(34,211,238,0.35)]",      Icon: Crown,  rate: "2%" },
};

type Props = { sellerId: string; size?: "sm" | "md"; showStats?: boolean };

// In-memory cache to avoid re-querying for the same seller on the same page
const cache = new Map<string, { tier: SellerTier; sales: number }>();

export function SellerTierBadge({ sellerId, size = "sm", showStats = false }: Props) {
  const [data, setData] = useState<{ tier: SellerTier; sales: number } | null>(
    cache.get(sellerId) ?? null,
  );

  useEffect(() => {
    if (cache.has(sellerId)) return;
    let cancel = false;
    (async () => {
      const { data: row } = await supabase
        .from("public_profiles" as any)
        .select("seller_tier, sales_count")
        .eq("id", sellerId)
        .maybeSingle();
      const r = row as any;
      if (!cancel && r) {
        const tier = (r.seller_tier ?? "bronze") as SellerTier;
        const sales = Number(r.sales_count ?? 0);
        cache.set(sellerId, { tier, sales });
        setData({ tier, sales });
      }
    })();
    return () => { cancel = true; };
  }, [sellerId]);

  if (!data) return null;
  const { tier, sales } = data;
  if (tier === "bronze" && sales === 0 && !showStats) return null;
  const { label, cls, Icon, rate } = META[tier];
  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-semibold ${cls} ${padding}`}
      title={`${label} satıcı — ${sales} satış · komissiya ${rate}`}
    >
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {label}
      {showStats && <span className="opacity-70 font-normal ml-1">· {sales} satış</span>}
    </span>
  );
}
