import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  bg_color: string | null;
  text_color: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const empty: Omit<Banner, "id"> = {
  title: "", subtitle: "", image_url: "", link_url: "",
  bg_color: "#0f172a", text_color: "#ffffff",
  sort_order: 0, is_active: true, starts_at: null, ends_at: null,
};

export function AdminBanners() {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setItems((data ?? []) as Banner[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(b: Partial<Banner> & { id?: string }) {
    setBusy(b.id ?? "new");
    const { error } = await supabase.rpc("admin_upsert_banner", {
      p_id: b.id ?? null,
      p_title: b.title!,
      p_subtitle: b.subtitle ?? null,
      p_image_url: b.image_url ?? null,
      p_link_url: b.link_url ?? null,
      p_bg_color: b.bg_color ?? null,
      p_text_color: b.text_color ?? null,
      p_sort_order: b.sort_order ?? 0,
      p_is_active: b.is_active ?? true,
      p_starts_at: b.starts_at ?? null,
      p_ends_at: b.ends_at ?? null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Yadda saxlandı");
    if (!b.id) setForm(empty);
    await load();
  }

  async function del(id: string) {
    if (!confirm("Banneri silmək istəyirsiz?")) return;
    setBusy(id);
    const { error } = await supabase.rpc("admin_delete_banner", { p_id: id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Silindi");
    await load();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card-gradient p-4 card-shadow space-y-3">
        <h3 className="font-semibold inline-flex items-center gap-2"><Plus className="h-4 w-4 text-neon" /> Yeni banner əlavə et</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Başlıq" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
          <input value={form.link_url ?? ""} onChange={e => setForm({ ...form, link_url: e.target.value })} placeholder="Link (/marketplace və ya https://...)" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
          <input value={form.subtitle ?? ""} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Açıqlama" className="sm:col-span-2 h-10 px-3 rounded-md bg-background border border-border text-sm" />
          <input value={form.image_url ?? ""} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="Arxa fon şəkli URL (istəyə görə)" className="sm:col-span-2 h-10 px-3 rounded-md bg-background border border-border text-sm" />
          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground">Fon:</label>
            <input type="color" value={form.bg_color ?? "#0f172a"} onChange={e => setForm({ ...form, bg_color: e.target.value })} className="h-10 w-14 rounded-md border border-border bg-background" />
            <label className="text-xs text-muted-foreground ml-2">Mətn:</label>
            <input type="color" value={form.text_color ?? "#ffffff"} onChange={e => setForm({ ...form, text_color: e.target.value })} className="h-10 w-14 rounded-md border border-border bg-background" />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground">Sıra:</label>
            <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className="h-10 px-2 w-20 rounded-md bg-background border border-border text-sm text-center" />
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-neon" /> Aktiv
            </label>
          </div>
        </div>
        <button onClick={() => form.title.trim() ? save(form) : toast.error("Başlıq tələb olunur")}
          disabled={busy === "new"} className="h-10 px-4 rounded-md bg-neon text-background text-sm font-semibold neon-ring disabled:opacity-50 inline-flex items-center gap-1.5">
          {busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Əlavə et
        </button>
      </div>

      {items.length === 0 && <p className="text-muted-foreground text-center py-12">Banner yoxdur.</p>}

      {items.map((b, i) => (
        <div key={b.id} className="rounded-xl border border-border bg-card-gradient p-4 card-shadow space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={b.title} onChange={e => { const n=[...items]; n[i]={...b,title:e.target.value}; setItems(n); }} className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
            <input value={b.link_url ?? ""} onChange={e => { const n=[...items]; n[i]={...b,link_url:e.target.value}; setItems(n); }} placeholder="Link" className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
            <input value={b.subtitle ?? ""} onChange={e => { const n=[...items]; n[i]={...b,subtitle:e.target.value}; setItems(n); }} placeholder="Açıqlama" className="sm:col-span-2 h-9 px-3 rounded-md bg-background border border-border text-sm" />
            <input value={b.image_url ?? ""} onChange={e => { const n=[...items]; n[i]={...b,image_url:e.target.value}; setItems(n); }} placeholder="Şəkil URL" className="sm:col-span-2 h-9 px-3 rounded-md bg-background border border-border text-sm" />
          </div>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <input type="color" value={b.bg_color ?? "#0f172a"} onChange={e => { const n=[...items]; n[i]={...b,bg_color:e.target.value}; setItems(n); }} className="h-8 w-12 rounded border border-border bg-background" />
            <input type="color" value={b.text_color ?? "#ffffff"} onChange={e => { const n=[...items]; n[i]={...b,text_color:e.target.value}; setItems(n); }} className="h-8 w-12 rounded border border-border bg-background" />
            <input type="number" value={b.sort_order} onChange={e => { const n=[...items]; n[i]={...b,sort_order:Number(e.target.value)}; setItems(n); }} className="h-8 w-16 px-2 rounded bg-background border border-border text-center" />
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={b.is_active} onChange={e => { const n=[...items]; n[i]={...b,is_active:e.target.checked}; setItems(n); }} className="h-4 w-4 accent-neon" /> Aktiv
            </label>
            <div className="flex-1" />
            <button disabled={busy===b.id} onClick={() => save(b)} className="h-8 px-3 rounded-md bg-neon text-background font-semibold disabled:opacity-50 inline-flex items-center gap-1">
              {busy===b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Yadda saxla
            </button>
            <button disabled={busy===b.id} onClick={() => del(b.id)} className="h-8 w-8 grid place-items-center rounded-md bg-destructive text-destructive-foreground disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
