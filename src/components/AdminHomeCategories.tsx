import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Save } from "lucide-react";

type Row = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string;
  sort_order: number;
  active: boolean;
};

const empty: Omit<Row, "id"> = {
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "/marketplace",
  sort_order: 0,
  active: true,
};

export function AdminHomeCategories() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<typeof empty>({ ...empty });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("home_categories" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!draft.title.trim()) {
      toast.error("Başlıq lazımdır");
      return;
    }
    setBusy("new");
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 1;
    const { error } = await supabase.from("home_categories" as any).insert({
      title: draft.title.trim(),
      subtitle: draft.subtitle?.trim() || null,
      image_url: draft.image_url?.trim() || null,
      link_url: draft.link_url.trim() || "/marketplace",
      sort_order: nextOrder,
      active: draft.active,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Əlavə edildi");
    setDraft({ ...empty });
    load();
  }

  async function save(row: Row) {
    setBusy(row.id);
    const { error } = await supabase
      .from("home_categories" as any)
      .update({
        title: row.title,
        subtitle: row.subtitle,
        image_url: row.image_url,
        link_url: row.link_url,
        sort_order: row.sort_order,
        active: row.active,
      })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Yeniləndi");
  }

  async function remove(row: Row) {
    if (!window.confirm(`"${row.title}" silinsin?`)) return;
    setBusy(row.id);
    const { error } = await supabase.from("home_categories" as any).delete().eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Silindi");
    load();
  }

  async function toggleActive(row: Row) {
    setBusy(row.id);
    const { error } = await supabase
      .from("home_categories" as any)
      .update({ active: !row.active })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  }

  async function move(row: Row, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === row.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    setBusy(row.id);
    await supabase.from("home_categories" as any).update({ sort_order: swap.sort_order }).eq("id", row.id);
    await supabase.from("home_categories" as any).update({ sort_order: row.sort_order }).eq("id", swap.id);
    setBusy(null);
    load();
  }

  function patch(id: string, k: keyof Row, v: any) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  }

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card-gradient p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4 text-neon" /> Yeni ana səhifə kateqoriyası
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Başlıq (məs. Playstation Oyunları)"
            className="h-10 px-3 rounded-md bg-secondary border border-border text-sm"
          />
          <input
            value={draft.subtitle ?? ""}
            onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
            placeholder="Alt başlıq (optional, məs. PS4 / PS5)"
            className="h-10 px-3 rounded-md bg-secondary border border-border text-sm"
          />
          <input
            value={draft.image_url ?? ""}
            onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
            placeholder="Şəkil URL (məs. https://...)"
            className="h-10 px-3 rounded-md bg-secondary border border-border text-sm"
          />
          <input
            value={draft.link_url}
            onChange={(e) => setDraft({ ...draft, link_url: e.target.value })}
            placeholder="Link (məs. /marketplace?platform=playstation)"
            className="h-10 px-3 rounded-md bg-secondary border border-border text-sm"
          />
        </div>
        <button
          disabled={busy === "new"}
          onClick={create}
          className="h-10 px-4 rounded-md bg-neon text-black font-semibold text-sm inline-flex items-center gap-2"
        >
          {busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Əlavə et
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={`rounded-xl border p-3 ${
              r.active ? "border-border bg-card-gradient" : "border-border/50 bg-secondary/40 opacity-70"
            }`}
          >
            <div className="grid gap-3 md:grid-cols-[80px_1fr_auto] items-center">
              <div className="h-20 w-20 rounded-lg overflow-hidden bg-secondary border border-border grid place-items-center">
                {r.image_url ? (
                  <img src={r.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">şəkil yox</span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  value={r.title}
                  onChange={(e) => patch(r.id, "title", e.target.value)}
                  className="h-9 px-3 rounded-md bg-secondary border border-border text-sm font-semibold"
                />
                <input
                  value={r.subtitle ?? ""}
                  onChange={(e) => patch(r.id, "subtitle", e.target.value)}
                  placeholder="Alt başlıq"
                  className="h-9 px-3 rounded-md bg-secondary border border-border text-sm"
                />
                <input
                  value={r.image_url ?? ""}
                  onChange={(e) => patch(r.id, "image_url", e.target.value)}
                  placeholder="Şəkil URL"
                  className="h-9 px-3 rounded-md bg-secondary border border-border text-sm sm:col-span-1"
                />
                <input
                  value={r.link_url}
                  onChange={(e) => patch(r.id, "link_url", e.target.value)}
                  placeholder="Link"
                  className="h-9 px-3 rounded-md bg-secondary border border-border text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                <button
                  disabled={i === 0 || busy === r.id}
                  onClick={() => move(r, -1)}
                  className="h-8 w-8 rounded-md bg-secondary hover:bg-muted grid place-items-center"
                  title="Yuxarı"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  disabled={i === rows.length - 1 || busy === r.id}
                  onClick={() => move(r, 1)}
                  className="h-8 w-8 rounded-md bg-secondary hover:bg-muted grid place-items-center"
                  title="Aşağı"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => toggleActive(r)}
                  className="h-8 w-8 rounded-md bg-secondary hover:bg-muted grid place-items-center"
                  title={r.active ? "Gizlət" : "Göstər"}
                >
                  {r.active ? <Eye className="h-4 w-4 text-neon" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => save(r)}
                  className="h-8 px-3 rounded-md bg-neon/15 text-neon hover:bg-neon/25 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Save className="h-3.5 w-3.5" /> Saxla
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => remove(r)}
                  className="h-8 w-8 rounded-md bg-destructive/15 hover:bg-destructive/25 text-destructive grid place-items-center"
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Kateqoriya yoxdur — yuxarıdan əlavə edin.</p>
        )}
      </div>
    </div>
  );
}

export default AdminHomeCategories;
