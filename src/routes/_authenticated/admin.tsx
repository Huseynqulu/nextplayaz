import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Package, Users, FileText, Ticket, Wallet, Trash2, Plus, Eye, X, FileImage } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin Panel — NextPlay.az" }] }),
});

type Application = {
  id: string; user_id: string; first_name: string; last_name: string; email: string; phone: string;
  category: string; status: "pending" | "approved" | "rejected"; created_at: string;
  id_front_url: string | null; id_back_url: string | null; selfie_url: string | null;
};
type ProductRow = { id: string; title: string; price: number; stock: number; category: string; is_active: boolean; seller_id: string; created_at: string };
type AdminUser = { id: string; email: string | null; display_name: string | null; username: string | null; wallet_balance: number; roles: ("user"|"seller"|"admin")[]; created_at: string };
type DiscountCode = { id: string; code: string; percent: number; max_uses: number | null; used_count: number; is_active: boolean; expires_at: string | null; created_at: string };

type Tab = "applications" | "users" | "codes" | "products";

function AdminPage() {
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("applications");
  const [apps, setApps] = useState<Application[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [stats, setStats] = useState({ users: 0, sellers: 0, products: 0, orders: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [appFilter, setAppFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [viewing, setViewing] = useState<Application | null>(null);
  const [signed, setSigned] = useState<{ front?: string; back?: string; selfie?: string }>({});


  // new code form
  const [newCode, setNewCode] = useState({ code: "", percent: "10", max_uses: "", expires_at: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      if (!data) { toast.error("Admin icazəniz yoxdur"); navigate({ to: "/profile" }); }
    })();
  }, [user, navigate]);

  async function refresh() {
    setLoading(true);
    const [{ data: a }, { data: p }, { data: u }, { data: dc }, { count: uc }, { count: sc }, { count: pc }, { count: oc }] = await Promise.all([
      supabase.from("seller_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, title, price, stock, category, is_active, seller_id, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.rpc("admin_list_users"),
      supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "seller"),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
    ]);
    setApps((a as any) ?? []);
    setProducts((p as any) ?? []);
    setUsers((u as any) ?? []);
    setCodes((dc as any) ?? []);
    setStats({ users: uc ?? 0, sellers: sc ?? 0, products: pc ?? 0, orders: oc ?? 0 });
    setLoading(false);
  }

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function decide(app: Application, status: "approved" | "rejected") {
    setBusy(app.id);
    try {
      const { error: e1 } = await supabase.from("seller_applications").update({ status }).eq("id", app.id);
      if (e1) throw e1;
      if (status === "approved") {
        const { error: e2 } = await supabase.rpc("admin_grant_role", { p_user_id: app.user_id, p_role: "seller" });
        if (e2) throw e2;
      }
      toast.success(status === "approved" ? "Satıcı təsdiqləndi" : "Müraciət rədd edildi");
      await refresh();
    } catch (e: any) { toast.error(e.message ?? "Xəta"); } finally { setBusy(null); }
  }

  async function toggleProduct(p: ProductRow) {
    setBusy(p.id);
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Yeniləndi"); await refresh(); }
    setBusy(null);
  }

  async function setBalance(u: AdminUser) {
    const val = prompt(`${u.display_name ?? u.email} üçün yeni balans (AZN):`, String(u.wallet_balance));
    if (val === null) return;
    const num = Number(val);
    if (!Number.isFinite(num) || num < 0) { toast.error("Etibarsız məbləğ"); return; }
    setBusy(u.id);
    const { error } = await supabase.rpc("admin_set_wallet_balance", { p_user_id: u.id, p_balance: num });
    if (error) toast.error(error.message); else { toast.success("Balans yeniləndi"); await refresh(); }
    setBusy(null);
  }

  async function toggleRole(u: AdminUser, role: "seller" | "admin") {
    setBusy(u.id + role);
    const has = u.roles.includes(role);
    const { error } = await supabase.rpc(has ? "admin_revoke_role" : "admin_grant_role", { p_user_id: u.id, p_role: role });
    if (error) toast.error(error.message); else { toast.success(has ? "Vəzifə alındı" : "Vəzifə verildi"); await refresh(); }
    setBusy(null);
  }

  async function createCode() {
    if (!newCode.code.trim() || !newCode.percent) { toast.error("Kod və faiz tələb olunur"); return; }
    setBusy("new-code");
    const payload: any = {
      code: newCode.code.trim().toUpperCase(),
      percent: Number(newCode.percent),
      max_uses: newCode.max_uses ? Number(newCode.max_uses) : null,
      expires_at: newCode.expires_at ? new Date(newCode.expires_at).toISOString() : null,
      created_by: user!.id,
    };
    const { error } = await supabase.from("discount_codes").insert(payload);
    if (error) toast.error(error.message); else {
      toast.success("Endirim kodu yaradıldı");
      setNewCode({ code: "", percent: "10", max_uses: "", expires_at: "" });
      await refresh();
    }
    setBusy(null);
  }

  async function toggleCode(c: DiscountCode) {
    setBusy(c.id);
    const { error } = await supabase.from("discount_codes").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Yeniləndi"); await refresh(); }
    setBusy(null);
  }

  async function deleteCode(c: DiscountCode) {
    if (!confirm(`"${c.code}" kodu silinsin?`)) return;
    setBusy(c.id);
    const { error } = await supabase.from("discount_codes").delete().eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Silindi"); await refresh(); }
    setBusy(null);
  }

  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-7 w-7 text-neon" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground mb-8">Platforma idarəetməsi və moderasiya.</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "İstifadəçi", value: stats.users, icon: Users },
              { label: "Satıcı", value: stats.sellers, icon: ShieldCheck },
              { label: "Məhsul", value: stats.products, icon: Package },
              { label: "Sifariş", value: stats.orders, icon: FileText },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-border bg-card-gradient p-5 card-shadow">
                <s.icon className="h-5 w-5 text-neon mb-3" />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
            {([
              ["applications", `Müraciətlər (${apps.filter(a => a.status === "pending").length})`],
              ["users", "İstifadəçilər"],
              ["codes", "Endirim kodları"],
              ["products", "Məhsullar"],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key as Tab)}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap ${
                  tab === key ? "border-neon text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>{label}</button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
          ) : tab === "applications" ? (
            <div className="space-y-3">
              {apps.length === 0 && <p className="text-muted-foreground text-center py-12">Müraciət yoxdur.</p>}
              {apps.map(a => (
                <div key={a.id} className="rounded-2xl border border-border bg-card-gradient p-5 card-shadow">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{a.first_name} {a.last_name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface">{a.category}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.status === "approved" ? "bg-success/20 text-success" :
                          a.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                        }`}>{a.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{a.email} · {a.phone}</p>
                      <p className="text-[11px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString("az-AZ")}</p>
                    </div>
                    {a.status === "pending" && (
                      <div className="flex gap-2">
                        <button disabled={busy === a.id} onClick={() => decide(a, "approved")}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-success text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                          <CheckCircle2 className="h-4 w-4" /> Təsdiq
                        </button>
                        <button disabled={busy === a.id} onClick={() => decide(a, "rejected")}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                          <XCircle className="h-4 w-4" /> Rədd
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "users" ? (
            <div className="space-y-2">
              {users.length === 0 && <p className="text-muted-foreground text-center py-12">İstifadəçi yoxdur.</p>}
              {users.map(u => (
                <div key={u.id} className="rounded-xl border border-border bg-card-gradient p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{u.display_name ?? u.username ?? "—"}</p>
                        {u.roles.map(r => (
                          <span key={r} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r === "admin" ? "bg-neon/20 text-neon" : r === "seller" ? "bg-success/20 text-success" : "bg-surface text-muted-foreground"
                          }`}>{r}</span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{u.email}</p>
                      <p className="text-sm mt-1 inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-neon" /> <span className="font-semibold">{Number(u.wallet_balance).toFixed(2)} ₼</span></p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy === u.id} onClick={() => setBalance(u)}
                        className="h-9 px-3 rounded-md text-xs font-semibold bg-surface border border-border hover:border-primary disabled:opacity-50">Balans</button>
                      <button disabled={busy === u.id + "seller"} onClick={() => toggleRole(u, "seller")}
                        className={`h-9 px-3 rounded-md text-xs font-semibold disabled:opacity-50 ${u.roles.includes("seller") ? "bg-success/20 text-success" : "bg-surface border border-border"}`}>
                        {u.roles.includes("seller") ? "Satıcı ✓" : "Satıcı et"}
                      </button>
                      <button disabled={busy === u.id + "admin" || u.id === user!.id} onClick={() => toggleRole(u, "admin")}
                        className={`h-9 px-3 rounded-md text-xs font-semibold disabled:opacity-50 ${u.roles.includes("admin") ? "bg-neon/20 text-neon" : "bg-surface border border-border"}`}>
                        {u.roles.includes("admin") ? "Admin ✓" : "Admin et"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "codes" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card-gradient p-5 card-shadow">
                <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><Plus className="h-4 w-4 text-neon" /> Yeni endirim kodu</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <input value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value})} placeholder="KOD (məs. SUMMER25)" className="h-10 px-3 rounded-lg bg-background border border-border text-sm uppercase" />
                  <input type="number" min="1" max="100" value={newCode.percent} onChange={e => setNewCode({...newCode, percent: e.target.value})} placeholder="Faiz %" className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                  <input type="number" min="1" value={newCode.max_uses} onChange={e => setNewCode({...newCode, max_uses: e.target.value})} placeholder="Maks istifadə (boş = limitsiz)" className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                  <input type="datetime-local" value={newCode.expires_at} onChange={e => setNewCode({...newCode, expires_at: e.target.value})} className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                  <button disabled={busy === "new-code"} onClick={createCode} className="h-10 rounded-lg bg-neon text-background font-semibold disabled:opacity-50">Yarat</button>
                </div>
              </div>

              {codes.length === 0 && <p className="text-muted-foreground text-center py-12">Endirim kodu yoxdur.</p>}
              {codes.map(c => (
                <div key={c.id} className="rounded-xl border border-border bg-card-gradient p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Ticket className="h-4 w-4 text-neon" />
                      <span className="font-mono font-bold">{c.code}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neon/20 text-neon">-{c.percent}%</span>
                      {!c.is_active && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">DEAKTIV</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      İstifadə: {c.used_count}{c.max_uses ? `/${c.max_uses}` : " (limitsiz)"}
                      {c.expires_at && ` · son: ${new Date(c.expires_at).toLocaleDateString("az-AZ")}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={busy === c.id} onClick={() => toggleCode(c)}
                      className={`h-8 px-3 rounded-md text-xs font-semibold ${c.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                      {c.is_active ? "Aktiv" : "Deaktiv"}
                    </button>
                    <button disabled={busy === c.id} onClick={() => deleteCode(c)}
                      className="h-8 w-8 grid place-items-center rounded-md text-xs bg-destructive/15 text-destructive hover:bg-destructive/25">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {products.length === 0 && <p className="text-muted-foreground text-center py-12">Məhsul yoxdur.</p>}
              {products.map(p => (
                <div key={p.id} className="rounded-xl border border-border bg-card-gradient p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.category} · {p.price} AZN · stok: {p.stock}</p>
                  </div>
                  <button disabled={busy === p.id} onClick={() => toggleProduct(p)}
                    className={`h-8 px-3 rounded-md text-xs font-semibold ${p.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                    {p.is_active ? "Aktiv" : "Deaktiv"}
                  </button>
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
