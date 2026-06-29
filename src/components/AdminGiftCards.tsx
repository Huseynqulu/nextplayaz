import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Gift, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type GiftCard = {
  id: string; code: string; amount: number; is_active: boolean;
  redeemed_by: string | null; redeemed_at: string | null;
  note: string | null; created_at: string;
};

export function AdminGiftCards() {
  const [items, setItems] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("10");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "redeemed">("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("gift_cards" as any).select("*").order("created_at", { ascending: false }).limit(500);
    setItems(((data as any) ?? []) as GiftCard[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function create() {
    const amt = parseFloat(amount);
    const q = parseInt(qty, 10);
    if (!amt || amt <= 0) { toast.error("Məbləğ etibarsızdır"); return; }
    if (!q || q < 1 || q > 200) { toast.error("Say 1-200 arası olmalıdır"); return; }
    setCreating(true);
    const { data, error } = await supabase.rpc("admin_create_gift_cards" as any, { p_amount: amt, p_quantity: q, p_note: note || null });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${q} hədiyyə kartı yaradıldı`);
    setNote("");
    void load();
    // Copy generated codes to clipboard for convenience
    const codes = ((data as any[]) ?? []).map(c => c.code).join("\n");
    if (codes) {
      try { await navigator.clipboard.writeText(codes); toast.info("Kodlar lövhəyə kopyalandı"); } catch { /* ignore */ }
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Bu kartı deaktiv etmək istəyirsiniz?")) return;
    const { error } = await supabase.rpc("admin_deactivate_gift_card" as any, { p_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Deaktiv edildi");
    void load();
  }

  async function copyCode(code: string) {
    try { await navigator.clipboard.writeText(code); toast.success("Kod kopyalandı"); } catch { toast.error("Kopyalama uğursuz"); }
  }

  const visible = items.filter(c => {
    if (filter === "active") return c.is_active && !c.redeemed_by;
    if (filter === "redeemed") return !!c.redeemed_by;
    return true;
  });
  const stats = {
    total: items.length,
    active: items.filter(c => c.is_active && !c.redeemed_by).length,
    redeemed: items.filter(c => c.redeemed_by).length,
    totalValue: items.reduce((s, c) => s + Number(c.amount), 0),
    redeemedValue: items.filter(c => c.redeemed_by).reduce((s, c) => s + Number(c.amount), 0),
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Cəmi kart", stats.total.toString()],
          ["Aktiv", stats.active.toString()],
          ["İstifadə edilmiş", stats.redeemed.toString()],
          ["Ümumi dəyər", `${stats.totalValue.toFixed(2)} ₼`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-surface/40 p-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{k}</div>
            <div className="font-display text-xl font-bold mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card-gradient p-5">
        <h3 className="font-display font-bold mb-3 flex items-center gap-2"><Gift className="h-4 w-4 text-neon" /> Yeni hədiyyə kartı yarat</h3>
        <div className="grid sm:grid-cols-[120px,100px,1fr,auto] gap-2">
          <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Məbləğ"
            className="h-10 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-neon" />
          <input type="number" min="1" max="200" value={qty} onChange={e => setQty(e.target.value)} placeholder="Say"
            className="h-10 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-neon" />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Qeyd (istəyə görə) — məs. Yeni il kampaniyası"
            className="h-10 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-neon" />
          <button disabled={creating} onClick={create}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-neon text-background font-semibold text-sm neon-ring disabled:opacity-50">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Yarat
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Yaradılan kodlar avtomatik lövhəyə kopyalanacaq.</p>
      </div>

      <div className="flex items-center gap-2">
        {(["all", "active", "redeemed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filter === f ? "bg-neon text-background border-transparent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "Hamısı" : f === "active" ? "Aktiv" : "İstifadə edilmiş"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-neon" /></div>
      ) : visible.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Kart yoxdur.</p>
      ) : (
        <div className="space-y-2">
          {visible.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card-gradient p-3 flex items-center gap-3 flex-wrap">
              <code className="font-mono text-sm font-bold tracking-wider px-2.5 py-1 rounded-md bg-surface border border-border">{c.code}</code>
              <span className="font-display font-bold text-gradient">{Number(c.amount).toFixed(2)} ₼</span>
              {c.redeemed_by ? (
                <span className="text-xs px-2 py-0.5 rounded bg-success/15 text-success">İstifadə edilib · {c.redeemed_at && new Date(c.redeemed_at).toLocaleDateString("az-AZ")}</span>
              ) : c.is_active ? (
                <span className="text-xs px-2 py-0.5 rounded bg-neon/15 text-neon">Aktiv</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Deaktiv</span>
              )}
              {c.note && <span className="text-xs text-muted-foreground truncate max-w-[200px]">· {c.note}</span>}
              <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleDateString("az-AZ")}</span>
              <div className="flex gap-1">
                <button onClick={() => copyCode(c.code)} className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-surface" aria-label="Copy"><Copy className="h-3.5 w-3.5" /></button>
                {!c.redeemed_by && c.is_active && (
                  <button onClick={() => deactivate(c.id)} className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-destructive hover:text-destructive-foreground" aria-label="Deactivate"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Cəmi {stats.redeemed} kart istifadə edilib · {stats.redeemedValue.toFixed(2)} ₼ dəyərində</p>
    </div>
  );
}
