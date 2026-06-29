import { createFileRoute, redirect } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Package, Users, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin Panel — NextPlay.az" }] }),
  beforeLoad: async ({ context }: any) => {
    const user = context?.user;
    if (!user) throw redirect({ to: "/login" });
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/profile" });
  },
});

type Application = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  shop_name: string;
  about: string | null;
  experience: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type ProductRow = {
  id: string;
  title: string;
  price: number;
  stock: number;
  category: string;
  is_active: boolean;
  seller_id: string;
  created_at: string;
};

function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"applications" | "products" | "users">("applications");
  const [apps, setApps] = useState<Application[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stats, setStats] = useState({ users: 0, sellers: 0, products: 0, orders: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const [{ data: a }, { data: p }, { count: uc }, { count: sc }, { count: pc }, { count: oc }] = await Promise.all([
      supabase.from("seller_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, title, price, stock, category, is_active, seller_id, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "seller"),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
    ]);
    setApps((a as any) ?? []);
    setProducts((p as any) ?? []);
    setStats({ users: uc ?? 0, sellers: sc ?? 0, products: pc ?? 0, orders: oc ?? 0 });
    setLoading(false);
  }

  useEffect(() => { if (user) refresh(); }, [user]);

  async function decide(app: Application, status: "approved" | "rejected") {
    setBusy(app.id);
    try {
      const { error: e1 } = await supabase
        .from("seller_applications")
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
        .eq("id", app.id);
      if (e1) throw e1;

      if (status === "approved") {
        const { error: e2 } = await supabase
          .from("user_roles")
          .insert({ user_id: app.user_id, role: "seller" });
        // ignore duplicate-role error
        if (e2 && !e2.message.includes("duplicate")) throw e2;
      }
      toast.success(status === "approved" ? "Satıcı təsdiqləndi" : "Müraciət rədd edildi");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Xəta baş verdi");
    } finally {
      setBusy(null);
    }
  }

  async function toggleProduct(p: ProductRow) {
    setBusy(p.id);
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Yeniləndi"); await refresh(); }
    setBusy(null);
  }

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

          {/* Stats */}
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

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-border">
            {([
              ["applications", `Müraciətlər (${apps.filter(a => a.status === "pending").length})`],
              ["products", "Məhsullar"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                  tab === key ? "border-neon text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{a.shop_name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.status === "approved" ? "bg-success/20 text-success" :
                          a.status === "rejected" ? "bg-destructive/20 text-destructive" :
                          "bg-warning/20 text-warning"
                        }`}>{a.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{a.full_name} · {a.email} {a.phone && `· ${a.phone}`}</p>
                      {a.about && <p className="text-sm mt-2">{a.about}</p>}
                      {a.experience && <p className="text-xs text-muted-foreground mt-1">Təcrübə: {a.experience}</p>}
                      <p className="text-[11px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString("az-AZ")}</p>
                    </div>
                    {a.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          disabled={busy === a.id}
                          onClick={() => decide(a, "approved")}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-success text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Təsdiq
                        </button>
                        <button
                          disabled={busy === a.id}
                          onClick={() => decide(a, "rejected")}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" /> Rədd
                        </button>
                      </div>
                    )}
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
                  <button
                    disabled={busy === p.id}
                    onClick={() => toggleProduct(p)}
                    className={`h-8 px-3 rounded-md text-xs font-semibold ${p.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                  >
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
