import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2, Ticket, Eye, Layout } from "lucide-react";

type DiscountCode = {
  id: string;
  code: string;
  percent: number;
  discount_type: 'percentage' | 'fixed';
  fixed_amount: number | null;
  max_discount_amount: number | null;
  min_subtotal: number;
  is_active: boolean;
  hero_enabled: boolean;
  hero_priority: number;
  hero_badge_az: string | null;
  hero_headline_az: string | null;
  hero_description_az: string | null;
  hero_cta_az: string | null;
  hero_cta_dest: string | null;
  hero_theme: string;
};

export function AdminCoupons() {
  const [items, setItems] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as DiscountCode[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateHero(c: DiscountCode) {
    setBusy(c.id);
    const { error } = await supabase.from("discount_codes").update({
      hero_enabled: c.hero_enabled,
      hero_priority: c.hero_priority,
      hero_badge_az: c.hero_badge_az,
      hero_headline_az: c.hero_headline_az,
      hero_description_az: c.hero_description_az,
      hero_cta_az: c.hero_cta_az,
      hero_cta_dest: c.hero_cta_dest,
      hero_theme: c.hero_theme
    }).eq("id", c.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Hero ayarları yeniləndi");
      setEditing(null);
      await load();
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>;

  return (
    <div className="space-y-4">
      {items.map((c, i) => (
        <div key={c.id} className="rounded-xl border border-border bg-card-gradient p-4 card-shadow space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-neon" />
              <div>
                <span className="font-mono font-bold text-lg">{c.code}</span>
                <p className="text-xs text-muted-foreground">
                  {c.discount_type === 'percentage' ? `-${c.percent}%` : `-${c.fixed_amount} AZN`} · min {c.min_subtotal} AZN
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setEditing(editing === c.id ? null : c.id)}
                className={`h-9 px-3 rounded-lg border flex items-center gap-2 text-xs font-semibold transition ${
                  c.hero_enabled ? "bg-neon/10 border-neon/30 text-neon" : "bg-surface border-border text-muted-foreground"
                }`}
              >
                <Layout className="h-4 w-4" /> {c.hero_enabled ? "Hero Aktiv" : "Hero Ayarla"}
              </button>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${c.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                {c.is_active ? "Aktiv" : "Deaktiv"}
              </div>
            </div>
          </div>

          {editing === c.id && (
            <div className="pt-4 border-t border-border/50 grid sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                  <input type="checkbox" checked={c.hero_enabled} onChange={e => {
                    const n = [...items]; n[i] = { ...c, hero_enabled: e.target.checked }; setItems(n);
                  }} className="h-4 w-4 accent-neon" />
                  Hero Karuseldə Göstər
                </label>
                
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Badge (AZ)</span>
                  <input value={c.hero_badge_az || ""} onChange={e => {
                    const n = [...items]; n[i] = { ...c, hero_badge_az: e.target.value }; setItems(n);
                  }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" placeholder="YENİ ÜZVLƏRƏ XÜSUSİ" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Headline (AZ)</span>
                  <input value={c.hero_headline_az || ""} onChange={e => {
                    const n = [...items]; n[i] = { ...c, hero_headline_az: e.target.value }; setItems(n);
                  }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" placeholder="İlk sifarişinə 10% endirim" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Açıqlama (AZ)</span>
                  <textarea value={c.hero_description_az || ""} onChange={e => {
                    const n = [...items]; n[i] = { ...c, hero_description_az: e.target.value }; setItems(n);
                  }} className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm min-h-[80px]" placeholder="Qısa məlumat..." />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Prioritet</span>
                    <input type="number" value={c.hero_priority} onChange={e => {
                      const n = [...items]; n[i] = { ...c, hero_priority: Number(e.target.value) }; setItems(n);
                    }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Tema</span>
                    <select value={c.hero_theme} onChange={e => {
                      const n = [...items]; n[i] = { ...c, hero_theme: e.target.value }; setItems(n);
                    }} className="w-full h-9 px-2 rounded-md bg-background border border-border text-sm">
                      <option value="cyan">Cyan (Neon)</option>
                      <option value="purple">Purple</option>
                      <option value="blue">Blue</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditing(null)} className="h-9 px-4 rounded-lg bg-surface text-sm font-semibold">Ləğv et</button>
                  <button onClick={() => updateHero(c)} disabled={busy === c.id} className="h-9 px-4 rounded-lg bg-neon text-background text-sm font-semibold flex items-center gap-2">
                    {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Yadda saxla
                  </button>
                </div>
              </div>
              
              {!c.is_active && (
                <div className="sm:col-span-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning flex items-center gap-2">
                  <Layout className="h-4 w-4" /> Kampaniya qeyri-aktivdir. Hero-da görünməyəcək.
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
