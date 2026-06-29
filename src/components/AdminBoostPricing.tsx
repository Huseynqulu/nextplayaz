import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Row = { hours: number; cost: number; tier: string; label: string; sub_label: string | null; sort_order: number; is_active: boolean; _new?: boolean };

export function AdminBoostPricing() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("boost_pricing" as any).select("*").order("sort_order");
    setRows(((data as any) ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function update(i: number, patch: Partial<Row>) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  async function save(r: Row) {
    if (!r.hours || r.hours < 1) return toast.error("Saat sayı düzgün deyil");
    if (r.cost < 0) return toast.error("Qiymət düzgün deyil");
    setBusy(String(r.hours));
    const { error } = await supabase.rpc("admin_upsert_boost_pricing" as any, {
      p_hours: r.hours, p_cost: r.cost, p_tier: r.tier, p_label: r.label,
      p_sub_label: r.sub_label, p_sort_order: r.sort_order, p_is_active: r.is_active,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Yadda saxlanıldı");
    load();
  }

  async function del(hours: number) {
    if (!confirm("Silmək istədiyinizə əminsiniz?")) return;
    setBusy(String(hours));
    const { error } = await supabase.rpc("admin_delete_boost_pricing" as any, { p_hours: hours });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Silindi"); load();
  }

  function addNew() {
    setRows(rs => [...rs, { hours: 0, cost: 0, tier: "standard", label: "", sub_label: "", sort_order: rs.length + 1, is_active: true, _new: true }]);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Məhsul boost paketləri — qiymət, müddət və etiketləri buradan idarə edin.</p>
        <button onClick={addNew} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-neon text-neon-foreground text-sm font-semibold">
          <Plus className="h-4 w-4" /> Yeni paket
        </button>
      </div>

      <div className="grid gap-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-border bg-card-gradient p-4 grid sm:grid-cols-[90px_100px_120px_1fr_1fr_80px_auto_auto] gap-2 items-end">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Saat</label>
              <input type="number" disabled={!r._new} value={r.hours || ""} onChange={e => update(i, { hours: parseInt(e.target.value) || 0 })}
                className="w-full h-9 px-2 rounded-md bg-surface border border-border text-sm disabled:opacity-60" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Qiymət ₼</label>
              <input type="number" step="0.01" value={r.cost} onChange={e => update(i, { cost: parseFloat(e.target.value) || 0 })}
                className="w-full h-9 px-2 rounded-md bg-surface border border-border text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Tier</label>
              <select value={r.tier} onChange={e => update(i, { tier: e.target.value })}
                className="w-full h-9 px-2 rounded-md bg-surface border border-border text-sm">
                <option value="standard">standard</option>
                <option value="plus">plus</option>
                <option value="premium">premium</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Ad</label>
              <input value={r.label} onChange={e => update(i, { label: e.target.value })}
                className="w-full h-9 px-2 rounded-md bg-surface border border-border text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Alt-yazı</label>
              <input value={r.sub_label ?? ""} onChange={e => update(i, { sub_label: e.target.value })}
                className="w-full h-9 px-2 rounded-md bg-surface border border-border text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Sıra</label>
              <input type="number" value={r.sort_order} onChange={e => update(i, { sort_order: parseInt(e.target.value) || 0 })}
                className="w-full h-9 px-2 rounded-md bg-surface border border-border text-sm" />
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
              <input type="checkbox" checked={r.is_active} onChange={e => update(i, { is_active: e.target.checked })} />
              Aktiv
            </label>
            <div className="flex gap-1.5">
              <button disabled={busy === String(r.hours)} onClick={() => save(r)}
                className="h-9 px-3 rounded-md bg-neon text-neon-foreground text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> Saxla
              </button>
              {!r._new && (
                <button disabled={busy === String(r.hours)} onClick={() => del(r.hours)}
                  className="h-9 w-9 grid place-items-center rounded-md bg-destructive/15 text-destructive disabled:opacity-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Paket yoxdur. Yenisini əlavə edin.</p>}
      </div>
    </div>
  );
}
