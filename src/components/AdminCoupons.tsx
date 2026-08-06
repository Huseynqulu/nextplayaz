import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2, Ticket, Eye, Layout, Clock, Globe } from "lucide-react";

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
  hero_placement: 'announcement' | 'main_carousel' | 'side_top' | 'side_bottom';
  hero_countdown_enabled: boolean;
  hero_badge_az: string | null;
  hero_badge_en: string | null;
  hero_badge_ru: string | null;
  hero_headline_az: string | null;
  hero_headline_en: string | null;
  hero_headline_ru: string | null;
  hero_description_az: string | null;
  hero_description_en: string | null;
  hero_description_ru: string | null;
  hero_cta_az: string | null;
  hero_cta_en: string | null;
  hero_cta_ru: string | null;
  hero_cta_dest: string | null;
  hero_theme: string;
  hero_image_url: string | null;
  hero_image_url_mobile: string | null;
  hero_featured_product_id: string | null;
  hero_featured_category_id: string | null;
  expires_at: string | null;
};

export function AdminCoupons() {
  const [items, setItems] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [tab, setTab] = useState<'az' | 'en' | 'ru'>('az');

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
      hero_placement: c.hero_placement,
      hero_countdown_enabled: c.hero_countdown_enabled,
      hero_badge_az: c.hero_badge_az,
      hero_badge_en: c.hero_badge_en,
      hero_badge_ru: c.hero_badge_ru,
      hero_headline_az: c.hero_headline_az,
      hero_headline_en: c.hero_headline_en,
      hero_headline_ru: c.hero_headline_ru,
      hero_description_az: c.hero_description_az,
      hero_description_en: c.hero_description_en,
      hero_description_ru: c.hero_description_ru,
      hero_cta_az: c.hero_cta_az,
      hero_cta_en: c.hero_cta_en,
      hero_cta_ru: c.hero_cta_ru,
      hero_cta_dest: c.hero_cta_dest,
      hero_theme: c.hero_theme,
      hero_image_url: c.hero_image_url,
      hero_image_url_mobile: c.hero_image_url_mobile,
      hero_featured_product_id: c.hero_featured_product_id,
      hero_featured_category_id: c.hero_featured_category_id
    }).eq("id", c.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Kampaniya ayarları yeniləndi");
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
                <Layout className="h-4 w-4" /> {c.hero_enabled ? "Yerləşdirmə Aktiv" : "Yerləşdirmə Ayarla"}
              </button>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${c.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                {c.is_active ? "Aktiv" : "Deaktiv"}
              </div>
            </div>
          </div>

          {editing === c.id && (
            <div className="pt-4 border-t border-border/50 space-y-6 animate-in fade-in slide-in-from-top-2">
              
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-muted-foreground">Yerləşdirmə</label>
                   <select 
                    value={c.hero_placement} 
                    onChange={e => {
                      const n = [...items]; n[i] = { ...c, hero_placement: e.target.value as any }; setItems(n);
                    }}
                    className="w-full h-9 px-2 rounded-md bg-background border border-border text-sm"
                   >
                     <option value="announcement">Announcement Bar</option>
                     <option value="main_carousel">Main Carousel</option>
                     <option value="side_top">Side Top Card</option>
                     <option value="side_bottom">Side Bottom Card</option>
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-muted-foreground">Vəziyyət</label>
                   <div className="flex gap-4 items-center h-9">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input type="checkbox" checked={c.hero_enabled} onChange={e => {
                          const n = [...items]; n[i] = { ...c, hero_enabled: e.target.checked }; setItems(n);
                        }} className="h-4 w-4 accent-neon" />
                        Aktiv
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input type="checkbox" checked={c.hero_countdown_enabled} onChange={e => {
                          const n = [...items]; n[i] = { ...c, hero_countdown_enabled: e.target.checked }; setItems(n);
                        }} className="h-4 w-4 accent-neon" />
                        <Clock className="h-3 w-3" /> Countdown
                      </label>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-muted-foreground">Prioritet</label>
                   <input type="number" value={c.hero_priority} onChange={e => {
                      const n = [...items]; n[i] = { ...c, hero_priority: Number(e.target.value) }; setItems(n);
                    }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" />
                </div>
              </div>

              {/* Language Tabs */}
              <div className="flex border-b border-border">
                {(['az', 'en', 'ru'] as const).map(l => (
                  <button 
                    key={l}
                    onClick={() => setTab(l)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 transition ${tab === l ? "border-neon text-white" : "border-transparent text-muted-foreground"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Badge ({tab})</span>
                    <input value={(c as any)[`hero_badge_${tab}`] || ""} onChange={e => {
                      const n = [...items]; (n[i] as any)[`hero_badge_${tab}`] = e.target.value; setItems(n);
                    }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Headline ({tab})</span>
                    <input value={(c as any)[`hero_headline_${tab}`] || ""} onChange={e => {
                      const n = [...items]; (n[i] as any)[`hero_headline_${tab}`] = e.target.value; setItems(n);
                    }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Açıqlama ({tab})</span>
                    <textarea value={(c as any)[`hero_description_${tab}`] || ""} onChange={e => {
                      const n = [...items]; (n[i] as any)[`hero_description_${tab}`] = e.target.value; setItems(n);
                    }} className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm min-h-[80px]" />
                  </div>

                   <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">CTA Text ({tab})</span>
                    <input value={(c as any)[`hero_cta_${tab}`] || ""} onChange={e => {
                      const n = [...items]; (n[i] as any)[`hero_cta_${tab}`] = e.target.value; setItems(n);
                    }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">CTA Destination</span>
                    <input value={c.hero_cta_dest || ""} onChange={e => {
                      const n = [...items]; n[i] = { ...c, hero_cta_dest: e.target.value }; setItems(n);
                    }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" placeholder="/marketplace" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Image URL (Desktop)</span>
                    <input value={c.hero_image_url || ""} onChange={e => {
                      const n = [...items]; n[i] = { ...c, hero_image_url: e.target.value }; setItems(n);
                    }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Image URL (Mobile)</span>
                    <input value={c.hero_image_url_mobile || ""} onChange={e => {
                      const n = [...items]; n[i] = { ...c, hero_image_url_mobile: e.target.value }; setItems(n);
                    }} className="w-full h-9 px-3 rounded-md bg-background border border-border text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Bitiş Tarixi</span>
                      <div className="text-xs font-mono py-2 text-muted-foreground">
                        {c.expires_at ? new Date(c.expires_at).toLocaleString() : "Yoxdur"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border/50">
                <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <Globe className="h-3 w-3" /> Dil dəstəyi: AZ, EN, RU
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="h-9 px-4 rounded-lg bg-surface text-sm font-semibold transition hover:bg-white/5">Ləğv et</button>
                  <button onClick={() => updateHero(c)} disabled={busy === c.id} className="h-9 px-4 rounded-lg bg-neon text-background text-sm font-semibold flex items-center gap-2 shadow-[0_0_15px_-3px_rgba(0,255,242,0.4)]">
                    {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Yadda saxla
                  </button>
                </div>
              </div>
              
              {!c.is_active && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning flex items-center gap-2">
                  <Layout className="h-4 w-4" /> Kampaniya qeyri-aktivdir. Heç bir yerdə görünməyəcək.
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
