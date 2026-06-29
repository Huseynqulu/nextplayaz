import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, ShieldCheck, Package, Star, Loader2, Camera, Store, Save } from "lucide-react";
import { toast } from "sonner";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profil — NextPlay.az" }] }),
});

type Profile = {
  username: string | null;
  display_name: string | null;
  shop_name: string | null;
  avatar_url: string | null;
  wallet_balance: number;
};

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: "", username: "", shop_name: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!user) return;
    const [{ data: p }, { data: r }, { count }] = await Promise.all([
      supabase.rpc("get_my_profile").then(({ data }) => ({ data: (data as any)?.[0] ?? null })),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("buyer_id", user.id),
    ]);
    setProfile(p);
    setRoles(r?.map(x => x.role) ?? []);
    setOrderCount(count ?? 0);
    if (p) setForm({ display_name: p.display_name ?? "", username: p.username ?? "", shop_name: p.shop_name ?? "" });
    setLoading(false);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user]);

  async function saveProfile() {
    if (!user) return;
    const display_name = form.display_name.trim();
    const username = form.username.trim();
    const shop_name = form.shop_name.trim();
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      toast.error("İstifadəçi adı: 3-20 hərf/rəqəm/_"); return;
    }
    setSaving(true);
    const payload: any = { display_name: display_name || null, username: username || null };
    if (roles.includes("seller") || roles.includes("admin")) payload.shop_name = shop_name || null;
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profil yeniləndi");
    void load();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 4 * 1024 * 1024) { toast.error("Maks 4 MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Yalnız şəkil"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    // Long-lived signed URL (bucket is private)
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    const url = signed?.signedUrl ?? null;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploading(false);
    if (updErr) { toast.error(updErr.message); return; }
    toast.success("Profil şəkli yeniləndi");
    void load();
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-neon" /></main>
        <Footer />
      </div>
    );
  }

  const isSeller = roles.includes("seller") || roles.includes("admin");
  const isAdmin = roles.includes("admin");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-3xl border border-border bg-card-gradient p-8 card-shadow relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl overflow-hidden bg-neon text-background grid place-items-center text-4xl font-bold neon-ring">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  : (profile.display_name ?? profile.username ?? "U")[0].toUpperCase()}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute -bottom-2 -right-2 h-9 w-9 grid place-items-center rounded-full bg-background border border-border hover:border-primary disabled:opacity-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold">{profile.display_name ?? profile.username}</h1>
              <p className="text-muted-foreground text-sm">@{profile.username} · {user!.email}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {isAdmin && <Badge color="destructive">ADMIN</Badge>}
                {isSeller && <Badge color="success">SELLER</Badge>}
                <Badge color="neutral">USER</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={Wallet} label="Cüzdan balansı" value={`${Number(profile.wallet_balance).toFixed(2)} ₼`} accent />
          <StatCard icon={Package} label="Sifarişlər" value={orderCount.toString()} />
          <StatCard icon={Star} label="Reytinq" value="—" />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card-gradient p-7 card-shadow">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-neon" /> Profil tənzimləmələri
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Ad (görünən)">
              <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Ad Soyad" maxLength={50}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm" />
            </Field>
            <Field label="İstifadəçi adı (@username)">
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="username" maxLength={20}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm" />
            </Field>
            {isSeller && (
              <Field label={<span className="inline-flex items-center gap-1.5"><Store className="h-3.5 w-3.5 text-neon" /> Mağaza adı</span>}>
                <input value={form.shop_name} onChange={e => setForm(f => ({ ...f, shop_name: e.target.value }))}
                  placeholder="Məs: NextShop Games" maxLength={50}
                  className="w-full h-11 px-3 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm" />
                <p className="text-[11px] text-muted-foreground mt-1">Mağaza adı təyin edilərsə alıcılar bunu görəcək.</p>
              </Field>
            )}
            <Field label="Email"><div className="h-11 px-3 grid items-center rounded-lg bg-surface border border-border text-sm text-muted-foreground">{user!.email}</div></Field>
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={saveProfile} disabled={saving}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-neon text-background font-semibold neon-ring disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Yadda saxla
            </button>
          </div>
        </div>
        <div className="mt-6">
          <TwoFactorSetup recommended={isSeller || isAdmin} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "destructive" | "success" | "neutral" }) {
  const cls = color === "destructive" ? "bg-destructive/15 text-destructive border-destructive/30"
    : color === "success" ? "bg-success/15 text-success border-success/30"
    : "bg-surface border-border text-muted-foreground";
  return <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border ${cls}`}>{children}</span>;
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 card-shadow ${accent ? "border-neon/40 bg-card-gradient" : "border-border bg-card-gradient"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
        <Icon className="h-4 w-4 text-neon" /> {label}
      </div>
      <p className="font-display text-3xl font-bold text-gradient">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
