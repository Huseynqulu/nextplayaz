import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Plus, Package, Trash2, Pencil, Rocket, ShoppingBag, Sparkles, ArrowDown } from "lucide-react";
import { SellerAnalytics } from "@/components/SellerAnalytics";
import { BoostDialog } from "@/components/BoostDialog";

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
  image_urls?: string[] | null;
  is_active: boolean;
  boost_expires_at?: string | null;
  boost_tier?: number | null;
};

const CATEGORIES = ["Games", "Accounts", "Keys", "Services"] as const;


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
  const [uploadingImg, setUploadingImg] = useState(false);
  const [boosting, setBoosting] = useState<Product | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", price: "", old_price: "",
    stock: "1", category: "Games" as Product["category"], subcategory: "",
    platform: "", platform_subcategory: "",
    delivery: "Instant" as "Instant" | "Manual", image_urls: [] as string[],
    stock_items: "", auto_message_enabled: false, auto_message: "",
    is_gift_card: false, gift_platform_id: "", gift_denomination_id: "",
  });
  const [subcats, setSubcats] = useState<{ slug: string; label_az: string; category_slug: string }[]>([]);
  const [platformList, setPlatformList] = useState<{ slug: string; label_az: string }[]>([]);
  const [psubs, setPsubs] = useState<{ slug: string; label_az: string; platform_slug: string }[]>([]);
  const [giftPlatforms, setGiftPlatforms] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [giftDenoms, setGiftDenoms] = useState<{ id: string; platform_id: string; face_value: number; currency: string; region: string | null; label: string | null }[]>([]);
  useEffect(() => {
    supabase.from("subcategories" as any).select("slug,label_az,category_slug").eq("is_active", true).order("sort_order")
      .then(({ data }) => setSubcats(((data as any) ?? []) as any));
    supabase.from("platforms" as any).select("slug,label_az").eq("is_active", true).order("sort_order")
      .then(({ data }) => {
        const list = ((data as any) ?? []) as { slug: string; label_az: string }[];
        setPlatformList(list);
        setForm(f => f.platform ? f : { ...f, platform: list[0]?.label_az ?? "" });
      });
    supabase.from("platform_subcategories" as any).select("slug,label_az,platform_slug").eq("is_active", true).order("sort_order")
      .then(({ data }) => setPsubs(((data as any) ?? []) as any));
    supabase.from("gift_platforms" as any).select("id,name,slug").eq("is_active", true).order("sort_order").order("name")
      .then(({ data }) => setGiftPlatforms(((data as any) ?? []) as any));
    supabase.from("gift_denominations" as any).select("id,platform_id,face_value,currency,region,label").eq("is_active", true).order("sort_order").order("face_value")
      .then(({ data }) => setGiftDenoms(((data as any) ?? []) as any));
  }, []);
  const currentSubs = subcats.filter(s => s.category_slug === form.category);
  const currentPlatformSlug = platformList.find(p => p.label_az === form.platform)?.slug;
  const currentPsubs = currentPlatformSlug ? psubs.filter(p => p.platform_slug === currentPlatformSlug) : [];

  useEffect(() => {
    if (!user) return;
    // Anyone authenticated can list products now
    setIsSeller(true);
  }, [user]);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("products").select("*").eq("seller_id", user.id).order("created_at", { ascending: false });
    setItems((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { if (isSeller) refresh(); }, [isSeller]);

  function resetForm() {
    setForm({ title: "", description: "", price: "", old_price: "", stock: "1", category: "Games", subcategory: "", platform: platformList[0]?.label_az ?? "", platform_subcategory: "", delivery: "Instant", image_urls: [], stock_items: "", auto_message_enabled: false, auto_message: "", is_gift_card: false, gift_platform_id: "", gift_denomination_id: "" });
    setEditing(null);
  }

  async function startEdit(p: Product) {
    setEditing(p);
    // Load existing undelivered stock items + auto-message fields
    const [{ data: items }, { data: full }] = await Promise.all([
      supabase.from("product_stock_items" as any).select("content").eq("product_id", p.id).is("delivered_at", null).order("created_at"),
      supabase.from("products").select("auto_message_enabled, auto_message, subcategory, platform_subcategory, gift_denomination_id").eq("id", p.id).maybeSingle(),
    ]);
    const giftDenomId = (full as any)?.gift_denomination_id ?? "";
    const giftPlatId = giftDenomId ? (giftDenoms.find(d => d.id === giftDenomId)?.platform_id ?? "") : "";
    setForm({
      title: p.title, description: p.description ?? "",
      price: String(p.price), old_price: p.old_price ? String(p.old_price) : "",
      stock: String(p.stock), category: p.category, subcategory: (full as any)?.subcategory ?? "",
      platform: p.platform, platform_subcategory: (full as any)?.platform_subcategory ?? "",
      delivery: p.delivery, image_urls: (p.image_urls && p.image_urls.length ? p.image_urls : (p.image_url ? [p.image_url] : [])),
      stock_items: ((items as any) ?? []).map((i: any) => i.content).join("\n"),
      auto_message_enabled: !!(full as any)?.auto_message_enabled,
      auto_message: (full as any)?.auto_message ?? "",
      is_gift_card: !!giftDenomId,
      gift_platform_id: giftPlatId,
      gift_denomination_id: giftDenomId,
    });
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const isInstant = form.delivery === "Instant";
      const lines = form.stock_items.split("\n").map(s => s.trim()).filter(Boolean);
      const stockNum = isInstant ? lines.length : Number(form.stock);
      if (isInstant && lines.length === 0) {
        throw new Error("Anında çatdırılma üçün ən azı 1 stok elementi əlavə edin");
      }
      if (form.is_gift_card && !form.gift_denomination_id) {
        throw new Error("Hədiyyə kartı üçün platforma və nominal seçin");
      }
      const payload = {
        seller_id: user.id,
        title: form.title.trim(),
        slug: editing ? editing.slug : slugify(form.title),
        description: form.description.trim() || null,
        price: Number(form.price),
        old_price: form.old_price ? Number(form.old_price) : null,
        stock: stockNum,
        category: form.category,
        subcategory: form.subcategory || null,
        platform: form.platform,
        platform_subcategory: form.platform_subcategory || null,
        delivery: form.delivery,
        image_url: form.image_urls[0] ?? null,
        image_urls: form.image_urls,
        auto_message_enabled: form.auto_message_enabled,
        auto_message: form.auto_message_enabled ? (form.auto_message.trim() || null) : null,
        gift_denomination_id: form.is_gift_card ? form.gift_denomination_id : null,
      };
      let productId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = ins.id;
      }

      if (isInstant && productId) {
        // Replace undelivered items
        await supabase.from("product_stock_items" as any).delete().eq("product_id", productId).is("delivered_at", null);
        if (lines.length > 0) {
          const { error: insErr } = await supabase.from("product_stock_items" as any).insert(
            lines.map(content => ({ product_id: productId, content }))
          );
          if (insErr) throw insErr;
        }
      }

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
            <div className="flex gap-2 flex-wrap">
              <Link
                to="/seller-orders"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-border bg-surface font-semibold hover:border-neon"
              >
                <ShoppingBag className="h-4 w-4" /> Gələn sifarişlər
              </Link>
              <button
                onClick={() => { resetForm(); setShowForm(s => !s); }}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-neon text-background font-semibold neon-ring hover:opacity-95"
              >
                <Plus className="h-4 w-4" /> {showForm ? "Bağla" : "Yeni məhsul"}
              </button>
            </div>
          </div>
          {user && <SellerAnalytics sellerId={user.id} />}

          {showForm && (
            <form onSubmit={submit} className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow mb-8 grid sm:grid-cols-2 gap-4">
              {/* Gift Card mode */}
              <div className="sm:col-span-2 rounded-xl border border-border bg-surface/40 p-3 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_gift_card} onChange={e => setForm(f => ({ ...f, is_gift_card: e.target.checked, gift_platform_id: "", gift_denomination_id: "" }))} className="h-4 w-4" />
                  <span className="text-sm font-semibold">🎁 Bu məhsul Hədiyyə Kartıdır</span>
                  <span className="text-[11px] text-muted-foreground">— PlayStation, Steam, Xbox, Netflix və s.</span>
                </label>
                {form.is_gift_card && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Platforma *</label>
                      <select required={form.is_gift_card} value={form.gift_platform_id}
                        onChange={e => setForm(f => ({ ...f, gift_platform_id: e.target.value, gift_denomination_id: "" }))}
                        className="mt-1 w-full h-11 px-3 rounded-lg bg-background border border-border text-sm">
                        <option value="">— Seçin —</option>
                        {giftPlatforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Nominal *</label>
                      <select required={form.is_gift_card} value={form.gift_denomination_id}
                        disabled={!form.gift_platform_id}
                        onChange={e => setForm(f => ({ ...f, gift_denomination_id: e.target.value }))}
                        className="mt-1 w-full h-11 px-3 rounded-lg bg-background border border-border text-sm disabled:opacity-60">
                        <option value="">— Seçin —</option>
                        {giftDenoms.filter(d => d.platform_id === form.gift_platform_id).map(d => (
                          <option key={d.id} value={d.id}>
                            {Number(d.face_value).toFixed(0)} {d.currency}{d.region ? ` (${d.region})` : ""}{d.label ? ` — ${d.label}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                      Hədiyyə kartı məhsullar `/gift-cards` bölməsində seçilmiş nominalın altında — ən ucuz qiymətdən bahaya doğru — göstərilir. Adi marketplace siyahısında görünməz.
                    </p>
                  </div>
                )}
              </div>

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
                <label className="text-xs font-medium text-muted-foreground">Stok {form.delivery === "Instant" ? "(avtomatik)" : "*"}</label>
                <input
                  required={form.delivery !== "Instant"}
                  disabled={form.delivery === "Instant"}
                  type="number" min="0"
                  value={form.delivery === "Instant" ? String(form.stock_items.split("\n").map(s => s.trim()).filter(Boolean).length) : form.stock}
                  onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kateqoriya</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any, subcategory: "" }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Alt-kateqoriya {currentSubs.length === 0 && <span className="opacity-60">(yoxdur)</span>}
                </label>
                <select
                  value={form.subcategory}
                  onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                  disabled={currentSubs.length === 0}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm disabled:opacity-60">
                  <option value="">— Seçilməyib —</option>
                  {currentSubs.map(s => <option key={s.slug} value={s.slug}>{s.label_az}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Platforma</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value, platform_subcategory: "" }))}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm">
                  {platformList.length === 0 && <option value="">— Yoxdur —</option>}
                  {platformList.map(p => <option key={p.slug} value={p.label_az}>{p.label_az}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Platforma alt-kateqoriyası {currentPsubs.length === 0 && <span className="opacity-60">(yoxdur)</span>}
                </label>
                <select value={form.platform_subcategory}
                  onChange={e => setForm(f => ({ ...f, platform_subcategory: e.target.value }))}
                  disabled={currentPsubs.length === 0}
                  className="mt-1 w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm disabled:opacity-60">
                  <option value="">— Seçilməyib —</option>
                  {currentPsubs.map(p => <option key={p.slug} value={p.slug}>{p.label_az}</option>)}
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
                <label className="text-xs font-medium text-muted-foreground">Məhsul şəkilləri ({form.image_urls.length})</label>
                <div className="mt-1 flex flex-wrap gap-3">
                  {form.image_urls.map((url, idx) => (
                    <div key={url + idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border bg-surface group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && <span className="absolute bottom-0 inset-x-0 text-[10px] text-center bg-primary/80 text-primary-foreground py-0.5">Əsas</span>}
                      <button type="button" onClick={() => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, i) => i !== idx) }))}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-background flex items-center justify-center">
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                  <label className={`w-24 h-24 rounded-lg border border-dashed border-border bg-surface/50 hover:bg-surface flex flex-col items-center justify-center cursor-pointer text-[11px] gap-1 ${uploadingImg ? "opacity-50 pointer-events-none" : ""}`}>
                    {uploadingImg ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                    <span>{uploadingImg ? "Yüklənir..." : "Şəkil əlavə et"}</span>
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (!files.length || !user) return;
                        setUploadingImg(true);
                        try {
                          const uploaded: string[] = [];
                          for (const file of files) {
                            if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: maksimum 5MB`); continue; }
                            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                            const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
                            const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
                            if (upErr) { toast.error(upErr.message); continue; }
                            const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
                            if (signed?.signedUrl) uploaded.push(signed.signedUrl);
                          }
                          if (uploaded.length) {
                            setForm(f => ({ ...f, image_urls: [...f.image_urls, ...uploaded] }));
                            toast.success(`${uploaded.length} şəkil yükləndi`);
                          }
                        } finally {
                          setUploadingImg(false);
                          e.target.value = "";
                        }
                      }} />
                  </label>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Birinci şəkil əsas şəkil olacaq. JPG / PNG / WEBP — hər biri maks 5MB. Bir neçə şəkil eyni anda seçə bilərsiniz.</p>
              </div>


              {form.delivery === "Instant" && (
                <div className="sm:col-span-2 rounded-xl border border-neon/30 bg-neon/5 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div>
                      <label className="text-sm font-semibold text-neon">Anında çatdırılma — stok elementləri</label>
                      <p className="text-xs text-muted-foreground mt-0.5">Hər sətirə bir kod / akkaunt / açar yazın. Hər sətir = 1 stok. Alıcıya sifariş anında avtomatik göndəriləcək.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neon/15 text-neon">
                      {form.stock_items.split("\n").map(s => s.trim()).filter(Boolean).length} stok
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={form.stock_items}
                    onChange={e => setForm(f => ({ ...f, stock_items: e.target.value }))}
                    placeholder={"email@test.com:parol123\nKEY-AAAA-BBBB-CCCC\nlogin:password"}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y" />
                  <p className="text-[11px] text-muted-foreground mt-2">⚠ Yenilədikdə təhvil verilməmiş köhnə elementlər silinib bu siyahı ilə əvəzlənəcək. Artıq satılmış elementlər toxunulmaz qalır.</p>
                </div>
              )}

              <div className="sm:col-span-2 rounded-xl border border-border bg-surface/40 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.auto_message_enabled}
                    onChange={e => setForm(f => ({ ...f, auto_message_enabled: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-border bg-background" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Avtomatik mesaj göndər</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Hər alış-verişdən sonra alıcıya bu mesaj avtomatik göndəriləcək (təlimatlar, təşəkkür, və s.).</p>
                  </div>
                </label>
                {form.auto_message_enabled && (
                  <textarea
                    rows={4}
                    value={form.auto_message}
                    onChange={e => setForm(f => ({ ...f, auto_message: e.target.value }))}
                    maxLength={2000}
                    placeholder="Salam! Alış-verişiniz üçün təşəkkür edirik. Hər hansı problem olarsa, bu söhbətdən yazın."
                    className="mt-3 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y" />
                )}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to="/product/$slug" params={{ slug: p.slug }} className="font-semibold hover:text-neon truncate">{p.title}</Link>
                      {p.boost_expires_at && new Date(p.boost_expires_at) > new Date() && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-neon/15 text-neon border border-neon/30">
                          <Rocket className="h-3 w-3" /> BOOST
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.category} · {p.platform} · {p.price} AZN · stok: {p.stock}
                      {!p.is_active && <span className="ml-2 text-destructive">(deaktiv)</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setBoosting(p)} className="h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-neon/15 hover:text-neon hover:border-neon/40" aria-label="Boost" title="Boost et">
                      <Rocket className="h-4 w-4" />
                    </button>
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
      {boosting && (
        <BoostDialog
          productId={boosting.id}
          productTitle={boosting.title}
          currentExpiry={boosting.boost_expires_at ?? null}
          onClose={() => setBoosting(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
