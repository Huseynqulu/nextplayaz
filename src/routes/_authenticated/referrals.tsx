import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Gift, Loader2, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/referrals")({
  component: ReferralsPage,
  head: () => ({ meta: [{ title: "Referal proqramı — NextPlay.az" }] }),
});

type RefRow = { id: string; referee_id: string; status: string; reward_amount: number; created_at: string; rewarded_at: string | null };

function ReferralsPage() {
  const { format } = useCurrency();
  const [stats, setStats] = useState<{ total_invited: number; rewarded_count: number; total_earned: number; code: string } | null>(null);
  const [rows, setRows] = useState<RefRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, r] = await Promise.all([
        supabase.rpc("get_referral_stats"),
        supabase.from("referrals").select("id,referee_id,status,reward_amount,created_at,rewarded_at").order("created_at", { ascending: false }),
      ]);
      if (s.data && s.data[0]) setStats({
        total_invited: Number(s.data[0].total_invited),
        rewarded_count: Number(s.data[0].rewarded_count),
        total_earned: Number(s.data[0].total_earned),
        code: s.data[0].code,
      });
      setRows((r.data ?? []) as RefRow[]);
      setLoading(false);
    })();
  }, []);

  const link = stats ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${stats.code}` : "";

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast.success("Kopyalandı"); }
    catch { toast.error("Kopyalanmadı"); }
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "NextPlay.az", text: "NextPlay-ə qoşul, 2 ₼ bonus qazan!", url: link }); }
      catch {/* user cancelled */}
    } else copy(link);
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Header /><main className="flex-1 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-neon" /></main><Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold inline-flex items-center gap-3">
            <Gift className="h-8 w-8 text-neon" /> Referal proqramı
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Dostlarını NextPlay-ə dəvət et — onlar ilk sifarişlərini tamamladıqda həm sən, həm də onlar <span className="text-neon font-semibold">2 ₼</span> bonus qazanırsız.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Stat label="Dəvət edilən" value={stats?.total_invited ?? 0} />
          <Stat label="Aktivləşmiş" value={stats?.rewarded_count ?? 0} />
          <Stat label="Qazandığın bonus" value={format(stats?.total_earned ?? 0)} highlight />
        </div>

        <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Referal kodun</div>
            <div className="flex gap-2">
              <code className="flex-1 h-12 grid place-items-start px-4 py-3 rounded-xl bg-background border border-border font-mono text-lg font-bold tracking-wider">{stats?.code}</code>
              <button onClick={() => copy(stats?.code ?? "")} className="h-12 px-4 rounded-xl bg-surface border border-border hover:bg-background transition inline-flex items-center gap-2 text-sm font-medium">
                <Copy className="h-4 w-4" /> Kopyala
              </button>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Dəvət linki</div>
            <div className="flex gap-2">
              <input readOnly value={link} className="flex-1 h-12 px-4 rounded-xl bg-background border border-border text-sm" />
              <button onClick={() => copy(link)} className="h-12 px-4 rounded-xl bg-surface border border-border hover:bg-background transition inline-flex items-center gap-2 text-sm font-medium">
                <Copy className="h-4 w-4" /> Kopyala
              </button>
              <button onClick={share} className="h-12 px-4 rounded-xl bg-neon text-background neon-ring font-semibold inline-flex items-center gap-2 text-sm">
                <Share2 className="h-4 w-4" /> Paylaş
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow">
          <h2 className="font-semibold mb-4 inline-flex items-center gap-2"><Users className="h-4 w-4 text-neon" /> Dəvət etdiyin istifadəçilər</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Hələ ki dəvətin yoxdur. Linki paylaş və qazanmağa başla!</p>
          ) : (
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/40 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-mono truncate">{r.referee_id.slice(0,8)}…</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("az-AZ")}</p>
                  </div>
                  {r.status === "rewarded" ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neon/15 text-neon">+{format(r.reward_amount)}</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-muted-foreground">Sifariş gözlənir</span>
                  )}
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

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-neon/40 bg-neon/5" : "border-border bg-card-gradient"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold font-display ${highlight ? "text-neon" : ""}`}>{value}</div>
    </div>
  );
}
