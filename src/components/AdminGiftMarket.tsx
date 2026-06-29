import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Platform = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

type Denomination = {
  id: string;
  platform_id: string;
  face_value: number;
  currency: string;
  region: string | null;
  label: string | null;
  sort_order: number;
  is_active: boolean;
};

export function AdminGiftMarket() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [denoms, setDenoms] = useState<Denomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  // platform create form
  const [newPlatform, setNewPlatform] = useState({ slug: "", name: "", logo_url: "" });
  const [savingP, setSavingP] = useState(false);

  // denom form
  const [newDenom, setNewDenom] = useState({ face_value: "", currency: "TL", region: "", label: "" });
  const [savingD, setSavingD] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from("gift_platforms" as any).select("*").order("sort_order").order("name"),
      supabase.from("gift_denominations" as any).select("*").order("sort_order").order("face_value"),
    ]);
    const ps = ((p as any) ?? []) as Platform[];
    setPlatforms(ps);
    setDenoms(((d as any) ?? []) as Denomination[]);
    if (!activePlatform && ps[0]) setActivePlatform(ps[0].id);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function addPlatform() {
    const slug = newPlatform.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!slug || !newPlatform.name.trim()) { toast.error("Slug və ad mütləqdir"); return; }
    setSavingP(true);
    const { error } = await supabase.from("gift_platforms" as any).insert({
      slug, name: newPlatform.name.trim(),
      logo_url: newPlatform.logo_url.trim() || null,
      sort_order: platforms.length + 1,
    });
    setSavingP(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Platforma əlavə edildi");
    setNewPlatform({ slug: "", name: "", logo_url: "" });
    void load();
  }

  async function togglePlatform(p: Platform) {
    await supabase.from("gift_platforms" as any).update({ is_active: !p.is_active }).eq("id", p.id);
    void load();
  }

  async function deletePlatform(p: Platform) {
    if (!confirm(`"${p.name}" və bütün nominalları silinsin?`)) return;
    const { error } = await supabase.from("gift_platforms" as any).delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Silindi");
    if (activePlatform === p.id) setActivePlatform(null);
    void load();
  }

  async function addDenom() {
    if (!activePlatform) { toast.error("Platforma seçin"); return; }
    const fv = parseFloat(newDenom.face_value);
    if (!fv || fv <= 0) { toast.error("Üz dəyəri etibarsızdır"); return; }
    if (!newDenom.currency.trim()) { toast.error("Valyuta yazın"); return; }
    setSavingD(true);
    const { error } = await supabase.from("gift_denominations" as any).insert({
      platform_id: activePlatform,
      face_value: fv,
      currency: newDenom.currency.trim().toUpperCase(),
      region: newDenom.region.trim() || null,
      label: newDenom.label.trim() || null,
      sort_order: denoms.filter(d => d.platform_id === activePlatform).length + 1,
    });
    setSavingD(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Nominal əlavə edildi");
    setNewDenom({ face_value: "", currency: newDenom.currency, region: newDenom.region, label: "" });
    void load();
  }

  async function toggleDenom(d: Denomination) {
    await supabase.from("gift_denominations" as any).update({ is_active: !d.is_active }).eq("id", d.id);
    void load();
  }

  async function deleteDenom(d: Denomination) {
    if (!confirm("Bu nominal silinsin?")) return;
    const { error } = await supabase.from("gift_denominations" as any).delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  if (loading) return <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-neon" /></div>;

  const activeDenoms = denoms.filter(d => d.platform_id === activePlatform);
  const active = platforms.find(p => p.id === activePlatform);

  return (
    <div className="space-y-6">
      {/* Add new platform */}
      <div className="rounded-2xl border border-border bg-card-gradient p-5">
        <h3 className="font-display font-bold mb-3">Yeni platforma</h3>
        <div className="grid sm:grid-cols-[150px,1fr,1fr,auto] gap-2">
          <input value={newPlatform.slug} onChange={e => setNewPlatform(f => ({ ...f, slug: e.target.value }))} placeholder="slug (məs. playstation)" className="h-10 px-3 rounded-lg bg-surface border border-border text-sm" />
          <input value={newPlatform.name} onChange={e => setNewPlatform(f => ({ ...f, name: e.target.value }))} placeholder="Ad (məs. PlayStation)" className="h-10 px-3 rounded-lg bg-surface border border-border text-sm" />
          <input value={newPlatform.logo_url} onChange={e => setNewPlatform(f => ({ ...f, logo_url: e.target.value }))} placeholder="Logo URL (istəyə görə)" className="h-10 px-3 rounded-lg bg-surface border border-border text-sm" />
          <button disabled={savingP} onClick={addPlatform} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-neon text-background font-semibold text-sm disabled:opacity-50">
            {savingP ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Əlavə et
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px,1fr] gap-5">
        {/* Platforms list */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1">Platformalar</h4>
          {platforms.length === 0 && <p className="text-sm text-muted-foreground">Heç bir platforma yoxdur.</p>}
          {platforms.map(p => (
            <button key={p.id} onClick={() => setActivePlatform(p.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition ${
                activePlatform === p.id ? "bg-neon/10 border-neon" : "bg-surface/40 border-border hover:bg-surface"
              }`}>
              {p.logo_url && <img src={p.logo_url} alt="" className="h-7 w-7 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">{p.slug} · {denoms.filter(d => d.platform_id === p.id).length} nominal</div>
              </div>
              {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Deaktiv</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Active platform denominations */}
        <div className="space-y-3">
          {active ? (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-display font-bold text-lg">{active.name} — nominallar</h4>
                <div className="flex gap-2">
                  <button onClick={() => togglePlatform(active)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-surface">
                    {active.is_active ? "Deaktiv et" : "Aktiv et"}
                  </button>
                  <button onClick={() => deletePlatform(active)} className="text-xs px-3 py-1.5 rounded-md border border-border text-red-400 hover:bg-red-500/10">Sil</button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface/40 p-3 grid sm:grid-cols-[110px,90px,90px,1fr,auto] gap-2">
                <input type="number" min="1" step="0.01" value={newDenom.face_value} onChange={e => setNewDenom(f => ({ ...f, face_value: e.target.value }))} placeholder="Üz dəyəri" className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                <input value={newDenom.currency} onChange={e => setNewDenom(f => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="TL/USD" className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                <input value={newDenom.region} onChange={e => setNewDenom(f => ({ ...f, region: e.target.value.toUpperCase() }))} placeholder="TR/US" className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                <input value={newDenom.label} onChange={e => setNewDenom(f => ({ ...f, label: e.target.value }))} placeholder="Etiket (istəyə görə)" className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                <button disabled={savingD} onClick={addDenom} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-neon text-background font-semibold text-sm disabled:opacity-50">
                  {savingD ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Əlavə et
                </button>
              </div>

              {activeDenoms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Hələ nominal yoxdur.</p>
              ) : (
                <div className="space-y-1.5">
                  {activeDenoms.map(d => (
                    <div key={d.id} className="rounded-lg border border-border bg-card-gradient p-3 flex items-center gap-3 flex-wrap">
                      <span className="font-display text-lg font-bold text-gradient">{Number(d.face_value).toFixed(0)} {d.currency}</span>
                      {d.region && <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border">{d.region}</span>}
                      {d.label && <span className="text-xs text-muted-foreground">· {d.label}</span>}
                      <span className="ml-auto flex items-center gap-1">
                        <button onClick={() => toggleDenom(d)} className="text-xs px-2.5 py-1 rounded border border-border hover:bg-surface">
                          {d.is_active ? "Aktiv" : "Deaktiv"}
                        </button>
                        <button onClick={() => deleteDenom(d)} className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-red-500/10 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Sol tərəfdən platforma seçin.</p>
          )}
        </div>
      </div>
    </div>
  );
}
