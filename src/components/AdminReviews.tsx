import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Trash2, Save, Loader2, X, Edit3 } from "lucide-react";

type Row = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  product_id: string;
  reviewer?: { display_name: string | null; avatar_url: string | null } | null;
  product?: { title: string; slug: string } | null;
};

export default function AdminReviews() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, reviewer_id, product_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const base = (data as any[]) ?? [];
    const userIds = Array.from(new Set(base.map(r => r.reviewer_id)));
    const productIds = Array.from(new Set(base.map(r => r.product_id)));
    const [{ data: profs }, { data: prods }] = await Promise.all([
      userIds.length ? supabase.from("public_profiles" as any).select("id, display_name, avatar_url").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      productIds.length ? supabase.from("products").select("id, title, slug").in("id", productIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const pMap = new Map(((profs as any[]) ?? []).map(p => [p.id, p]));
    const prMap = new Map(((prods as any[]) ?? []).map(p => [p.id, p]));
    setRows(base.map(r => ({ ...r, reviewer: pMap.get(r.reviewer_id) ?? null, product: prMap.get(r.product_id) ?? null })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEdit(r: Row) {
    setEditing(r);
    setEditRating(r.rating);
    setEditComment(r.comment ?? "");
  }
  async function saveEdit() {
    if (!editing) return;
    setBusy(editing.id);
    const { error } = await supabase.rpc("admin_update_review" as any, {
      p_id: editing.id,
      p_rating: editRating,
      p_comment: editComment.trim() || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Rəy yeniləndi");
    setEditing(null);
    load();
  }
  async function removeRow(r: Row) {
    if (!confirm("Bu rəyi silmək istəyirsiz?")) return;
    setBusy(r.id);
    const { error } = await supabase.rpc("admin_delete_review" as any, { p_id: r.id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Silindi");
    setRows(s => s.filter(x => x.id !== r.id));
  }

  const filtered = rows.filter(r => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.product?.title?.toLowerCase().includes(s)) ||
           (r.reviewer?.display_name?.toLowerCase().includes(s)) ||
           (r.comment?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Axtar: məhsul, istifadəçi, mətn…"
          className="flex-1 h-10 px-3 rounded-lg bg-surface border border-border focus:border-primary outline-none text-sm"
        />
        <button onClick={load} className="h-10 px-3 rounded-lg border border-border text-sm hover:bg-surface">Yenilə</button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Rəy yoxdur.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="rounded-xl border border-border bg-card-gradient p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{r.reviewer?.display_name ?? "—"}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="text-sm truncate text-muted-foreground">{r.product?.title ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="text-[11px] text-muted-foreground ml-2">{new Date(r.created_at).toLocaleString("az-AZ")}</span>
                  </div>
                  {r.comment && <p className="text-sm mt-2 text-muted-foreground whitespace-pre-wrap">{r.comment}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} disabled={busy === r.id} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:border-primary disabled:opacity-50" aria-label="Düzəliş">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => removeRow(r)} disabled={busy === r.id} className="grid h-8 w-8 place-items-center rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50" aria-label="Sil">
                    {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={() => !busy && setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card card-shadow overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Rəyi düzəlt</h3>
              <button onClick={() => !busy && setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-center gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setEditRating(n)} className="p-1 hover:scale-110 transition">
                    <Star className={`h-8 w-8 ${n <= editRating ? "text-warning fill-warning" : "text-muted-foreground/40"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={editComment}
                onChange={e => setEditComment(e.target.value)}
                rows={5}
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border focus:border-primary outline-none text-sm resize-none"
              />
            </div>
            <div className="flex gap-2 p-4 border-t border-border">
              <button onClick={() => setEditing(null)} disabled={!!busy} className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-surface disabled:opacity-50">Ləğv</button>
              <button onClick={saveEdit} disabled={!!busy} className="flex-1 h-10 rounded-lg bg-neon text-background font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Yadda saxla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
