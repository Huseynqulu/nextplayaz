import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, ShieldCheck, Package, Star, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profil — NextPlay.az" }] }),
});

type Profile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  wallet_balance: number;
};

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: r }, { count }] = await Promise.all([
        supabase.from("profiles").select("username, display_name, avatar_url, wallet_balance").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("buyer_id", user.id),
      ]);
      setProfile(p);
      setRoles(r?.map(x => x.role) ?? []);
      setOrderCount(count ?? 0);
      setLoading(false);
    })();
  }, [user]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-neon" />
        </main>
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
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-neon text-background text-3xl font-bold neon-ring">
              {(profile.display_name ?? profile.username ?? "U")[0].toUpperCase()}
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
            <ShieldCheck className="h-5 w-5 text-neon" /> Hesab məlumatları
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Row label="İstifadəçi adı" value={profile.username ?? "—"} />
            <Row label="Email" value={user!.email ?? "—"} />
            <Row label="Ad" value={profile.display_name ?? "—"} />
            <Row label="Qoşulma tarixi" value={new Date(user!.created_at).toLocaleDateString("az")} />
          </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
