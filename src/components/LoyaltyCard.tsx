import { useEffect, useState } from "react";
import { Sparkles, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Entry = { id: string; delta: number; reason: string; created_at: string; notes: string | null };

export function LoyaltyCard({ onChanged }: { onChanged?: () => void }) {
  const [points, setPoints] = useState(0);
  const [redeem, setRedeem] = useState("100");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Entry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: p }, { data: h }] = await Promise.all([
      supabase.from("profiles").select("loyalty_points").eq("id", u.user.id).maybeSingle(),
      supabase.from("loyalty_ledger").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setPoints((p as any)?.loyalty_points ?? 0);
    setHistory((h as any) ?? []);
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    const n = parseInt(redeem, 10);
    if (!n || n < 100 || n % 100 !== 0) { toast.error("100-ə bölünən, ən azı 100 xal daxil edin"); return; }
    if (n > points) { toast.error("Kifayət qədər xal yoxdur"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("redeem_loyalty_points", { p_points: n });
      if (error) throw error;
      const credited = (data as any)?.credited ?? n / 100;
      toast.success(`${credited} ₼ balansa köçürüldü`);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Xəta baş verdi");
    } finally { setBusy(false); }
  };

  const credit = (parseInt(redeem || "0", 10) / 100).toFixed(2);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-lg inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neon" /> Loyallıq xalları
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Hər 1 ₼ alışveriş = 1 xal · 100 xal = 1 ₼</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold">{points.toLocaleString("az-AZ")}</p>
          <p className="text-xs text-muted-foreground">xal</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          step={100}
          min={100}
          value={redeem}
          onChange={(e) => setRedeem(e.target.value)}
          className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm"
          placeholder="Xal sayı (100-ə bölünən)"
        />
        <button
          onClick={submit}
          disabled={busy || points < 100}
          className="px-4 py-2 rounded-lg bg-neon text-black font-medium text-sm inline-flex items-center gap-1 disabled:opacity-50"
        >
          <Gift className="h-4 w-4" /> {busy ? "..." : `+${credit} ₼`}
        </button>
      </div>

      <button
        onClick={() => setShowHistory((v) => !v)}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground"
      >
        {showHistory ? "Tarixçəni gizlət" : "Xal tarixçəsi"}
      </button>

      {showHistory && (
        <ul className="mt-3 divide-y divide-border max-h-64 overflow-auto">
          {history.length === 0 && <li className="py-3 text-sm text-muted-foreground">Hələ heç bir əməliyyat yoxdur.</li>}
          {history.map((e) => (
            <li key={e.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{e.reason === "redeemed" ? "Balansa köçürmə" : "Sifarişdən qazanıldı"}</p>
                {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("az-AZ")}</p>
              </div>
              <span className={`font-semibold ${e.delta > 0 ? "text-neon" : "text-destructive"}`}>
                {e.delta > 0 ? `+${e.delta}` : e.delta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
