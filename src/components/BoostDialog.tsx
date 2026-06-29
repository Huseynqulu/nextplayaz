import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Rocket, X, Sparkles, Zap, Crown } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/lib/currency";

type Tier = { hours: number; cost: number; label: string; sub: string; Icon: any; bg: string };
const TIERS: Tier[] = [
  { hours: 24,  cost: 5,  label: "Standart",  sub: "24 saat öndə", Icon: Zap,       bg: "from-amber-500/15 to-amber-500/5 border-amber-500/40" },
  { hours: 72,  cost: 12, label: "Plus",      sub: "3 gün öndə",   Icon: Sparkles, bg: "from-fuchsia-500/15 to-purple-500/5 border-fuchsia-500/40" },
  { hours: 168, cost: 25, label: "Premium",   sub: "7 gün öndə",   Icon: Crown,     bg: "from-cyan-500/15 to-sky-500/5 border-cyan-500/40" },
];

export function BoostDialog({ productId, productTitle, currentExpiry, onClose, onDone }: {
  productId: string; productTitle: string; currentExpiry?: string | null;
  onClose: () => void; onDone: () => void;
}) {
  const { format } = useCurrency();
  const [busy, setBusy] = useState<number | null>(null);
  const active = currentExpiry && new Date(currentExpiry) > new Date();

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
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 grid place-items-center rounded-xl bg-neon/15 text-neon"><Rocket className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display text-xl font-bold">Məhsulu Boost et</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[420px]">{productTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-surface"><X className="h-4 w-4" /></button>
        </div>

        {active && (
          <div className="mt-3 rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-xs text-success">
            ✓ Hazırda aktiv. Bitir: {new Date(currentExpiry!).toLocaleString("az-AZ")} — yeni boost mövcud müddətə əlavə olunacaq.
          </div>
        )}

        <p className="mt-4 text-sm text-muted-foreground">
          Boost edilən məhsullar marketplace və kateqoriya səhifələrində ən üstdə göstərilir. Məbləğ balansınızdan tutulur.
        </p>

        <div className="mt-5 grid sm:grid-cols-3 gap-3">
          {TIERS.map(t => (
            <button
              key={t.hours}
              disabled={busy !== null}
              onClick={() => pick(t.hours)}
              className={`relative text-left rounded-xl border bg-gradient-to-br p-4 hover:scale-[1.02] transition disabled:opacity-50 ${t.bg}`}
            >
              <t.Icon className="h-5 w-5 mb-2" />
              <div className="font-display font-bold">{t.label}</div>
              <div className="text-[11px] text-muted-foreground">{t.sub}</div>
              <div className="mt-3 font-display text-2xl font-bold text-gradient">{format(t.cost)}</div>
              {busy === t.hours && <Loader2 className="absolute top-3 right-3 h-4 w-4 animate-spin" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
