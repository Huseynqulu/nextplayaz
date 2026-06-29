import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Plus, Package, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller-dashboard")({
  component: SellerDashboard,
  head: () => ({ meta: [{ title: "Satıcı paneli — NextPlay.az" }] }),
});

type Product = {
  id: string;
  title: string;
  slug: string;
  price: number;
  old_price: number | null;
  stock: number;
  category: "Games" | "Accounts" | "Keys" | "Services";
  platform: string;
  delivery: "Instant" | "Manual";
  description: string | null;
  image_url: string | null;
  is_active: boolean;
};

const CATEGORIES = ["Games", "Accounts", "Keys", "Services"] as const;
const PLATFORMS = ["Steam", "PS5", "PS4", "Xbox", "EA", "Battle.net", "Epic", "Rockstar"];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80) + "-" + Math.random().toString(36).slice(2, 6);
}

function SellerDashboard() {
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const [isSeller, setIsSeller] = useState<boolean | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", price: "", old_price: "",
    stock: "1", category: "Games" as Product["category"], platform: "Steam",
    delivery: "Instant" as "Instant" | "Manual", image_url: "",
    stock_items: "", auto_message_enabled: false, auto_message: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "seller" });
      setIsSeller(!!data);
      if (!data) {
        toast.error("Satıcı statusunuz təsdiqlənməyib");
        navigate({ to: "/seller" });
      }
    })();
  }, [user, navigate]);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("products").select("*").eq("seller_id", user.id).order("created_at", { ascending: false });
    setItems((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { if (isSeller) refresh(); }, [isSeller]);

  function resetForm() {
    setForm({ title: "", description: "", price: "", old_price: "", stock: "1", category: "Games", platform: "Steam", delivery: "Instant", image_url: "" });
    setEditing(null);
  }

  function startEdit(p: Product) {
    setEditing(p);
    setForm({
      title: p.title, description: p.description ?? "",
      price: String(p.price), old_price: p.old_price ? String(p.old_price) : "",
      stock: String(p.stock), category: p.category, platform: p.platform,
      delivery: p.delivery, image_url: p.image_url ?? "",
    });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        seller_id: user.id,
        title: form.title.trim(),
        slug: editing ? editing.slug : slugify(form.title),
        description: form.description.trim() || null,
        price: Number(form.price),
        old_price: form.old_price ? Number(form.old_price) : null,
        stock: Number(form.stock),
        category: form.category,
        platform: form.platform,
        delivery: form.delivery,
        image_url: form.image_url.trim() || null,
      };
      const { error } = editing
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
      toast.success(editing ? "Məhsul yeniləndi" : "Məhsul əlavə edildi");
      setShowForm(false);
      resetForm();
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Xəta");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`"${p.title}" silinsin?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Silindi"); await refresh(); }
  }

  if (isSeller === null) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>;
  }
  if (!isSeller) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-3">
                <Package className="h-7 w-7 text-neon" /> Satıcı Paneli
              </h1>
              <p className="text-muted-foreground mt-2">Məhsullarınızı idarə edin.</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(s => !s); }}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-neon text-background font-semibold neon-ring hover:opacity-95"
            >
              <Plus className="h-4 w-4" /> {showForm ? "Bağla" : "Yeni məhsul"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={submit} className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow mb-8 grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Başlıq *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Təsvir</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Qiymət (AZN) *</label>
                <input required type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Köhnə qiymət</label>
                <input type="number" step="0.01" min="0" value={form.old_price} onChange={e => setForm(f => ({ ...f, old_price: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Stok *</label>
                <input required type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kateqoriya</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Platforma</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm">
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Çatdırılma</label>
                <select value={form.delivery} onChange={e => setForm(f => ({ ...f, delivery: e.target.value as any }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm">
                  <option value="Instant">Anında (avto)</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Şəkil URL</label>
                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="h-11 px-5 rounded-lg border border-border text-sm font-semibold hover:bg-surface">
                  Ləğv et
                </button>
                <button disabled={saving} type="submit"
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-neon text-background font-semibold neon-ring disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Yenilə" : "Əlavə et"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Hələ məhsul yoxdur. İlk məhsulunuzu əlavə edin.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(p => (
                <div key={p.id} className="rounded-xl border border-border bg-card-gradient p-4 flex items-center gap-4">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-surface grid place-items-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link to="/product/$slug" params={{ slug: p.slug }} className="font-semibold hover:text-neon truncate block">{p.title}</Link>
                    <p className="text-xs text-muted-foreground">
                      {p.category} · {p.platform} · {p.price} AZN · stok: {p.stock}
                      {!p.is_active && <span className="ml-2 text-destructive">(deaktiv)</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(p)} className="h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-surface" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(p)} className="h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-destructive hover:text-destructive-foreground" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
