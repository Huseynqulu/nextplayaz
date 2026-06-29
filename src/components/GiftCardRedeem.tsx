import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function GiftCardRedeem({ onRedeemed }: { onRedeemed?: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function redeem() {
    if (!code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("redeem_gift_card" as any, { p_code: code.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`🎉 ${Number(data).toFixed(2)} ₼ balansınıza əlavə olundu!`);
    setCode("");
    onRedeemed?.();
  }

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-fuchsia-500/5 to-cyan-500/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 grid place-items-center rounded-lg bg-fuchsia-500/15 text-fuchsia-300"><Gift className="h-4 w-4" /></div>
        <div>
          <h3 className="font-display font-bold">Hədiyyə kartı</h3>
          <p className="text-[11px] text-muted-foreground">Kod daxil edərək balansınıza əlavə edin</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="NXT-XXXX-XXXX"
          className="flex-1 h-10 px-3 rounded-lg bg-surface border border-border text-sm font-mono tracking-wider focus:outline-none focus:border-neon"
          onKeyDown={e => e.key === "Enter" && !busy && redeem()}
        />
        <button
          disabled={busy || !code.trim()}
          onClick={redeem}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-neon text-background font-semibold text-sm neon-ring disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
          İstifadə et
        </button>
      </div>
    </div>
  );
}
