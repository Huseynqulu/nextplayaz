import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Rocket, X, Sparkles, Zap, Crown } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/lib/currency";

type Tier = { hours: number; cost: number; tier: string; label: string; sub_label: string | null };

const TIER_ICON: Record<string, any> = { standard: Zap, plus: Sparkles, premium: Crown };
const TIER_BG: Record<string, string> = {
  standard: "from-amber-500/15 to-amber-500/5 border-amber-500/40",
  plus:     "from-fuchsia-500/15 to-purple-500/5 border-fuchsia-500/40",
  premium:  "from-cyan-500/15 to-sky-500/5 border-cyan-500/40",
};

export function BoostDialog({ productId, productTitle, currentExpiry, onClose, onDone }: {
  productId: string; productTitle: string; currentExpiry?: string | null;
  onClose: () => void; onDone: () => void;
}) {
  const { format } = useCurrency();
  const [busy, setBusy] = useState<number | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const active = currentExpiry && new Date(currentExpiry) > new Date();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("boost_pricing" as any)
        .select("hours,cost,tier,label,sub_label,sort_order,is_active")
        .eq("is_active", true).order("sort_order");
      setTiers(((data as any) ?? []) as Tier[]);
      setLoading(false);
    })();
  }, []);

  async function pick(hours: number) {
    setBusy(hours);
    const { error } = await supabase.rpc("boost_product" as any, { _product_id: productId, _hours: hours });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Məhsul boost edildi!");
    onDone(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card-gradient p-6 card-shadow" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-neon/15 text-neon"><Rocket className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl font-bold">Məhsulu Boost et</h3>
              <p className="text-xs text-muted-foreground truncate">{productTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 shrink-0 grid place-items-center rounded-lg hover:bg-surface"><X className="h-4 w-4" /></button>
        </div>


        {active && (
          <div className="mt-3 rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-xs text-success">
            ✓ Hazırda aktiv. Bitir: {new Date(currentExpiry!).toLocaleString("az-AZ")} — yeni boost mövcud müddətə əlavə olunacaq.
          </div>
        )}

        <p className="mt-4 text-sm text-muted-foreground">
          Boost edilən məhsullar marketplace və kateqoriya səhifələrində ən üstdə göstərilir. Məbləğ balansınızdan tutulur.
        </p>

        {loading ? (
          <div className="mt-6 grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : tiers.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground text-center py-6">Boost paketləri mövcud deyil.</p>
        ) : (
          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            {tiers.map(t => {
              const Icon = TIER_ICON[t.tier] ?? Zap;
              const bg = TIER_BG[t.tier] ?? "from-muted/10 to-muted/5 border-border";
              return (
                <button
                  key={t.hours}
                  disabled={busy !== null}
                  onClick={() => pick(t.hours)}
                  className={`relative text-left rounded-xl border bg-gradient-to-br p-4 hover:scale-[1.02] transition disabled:opacity-50 ${bg}`}
                >
                  <Icon className="h-5 w-5 mb-2" />
                  <div className="font-display font-bold">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground">{t.sub_label}</div>
                  <div className="mt-3 font-display text-2xl font-bold text-gradient">{format(Number(t.cost))}</div>
                  {busy === t.hours && <Loader2 className="absolute top-3 right-3 h-4 w-4 animate-spin" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
