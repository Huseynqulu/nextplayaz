import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Wallet, Loader2, Upload, Receipt, Copy, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "Cüzdan — NextPlay.az" }] }),
});

type Method = { method: string; label: string; instructions: string; is_active: boolean };
type TopUp = {
  id: string; amount: number; method: string; sender_note: string | null;
  receipt_url: string | null; status: "pending" | "approved" | "rejected";
  admin_notes: string | null; created_at: string;
};

function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [methods, setMethods] = useState<Method[]>([]);
  const [history, setHistory] = useState<TopUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: m }, { data: h }] = await Promise.all([
      supabase.from("profiles").select("wallet_balance").eq("id", user.id).maybeSingle(),
      supabase.from("payment_settings").select("*").eq("is_active", true).order("label"),
      supabase.from("wallet_topups").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setBalance(Number(p?.wallet_balance ?? 0));
    setMethods((m as any) ?? []);
    if (!method && m && m.length > 0) setMethod((m as any)[0].method);
    setHistory((h as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  async function submit() {
    if (!user) return;
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 1) { toast.error("Düzgün məbləğ daxil edin (≥ 1 ₼)"); return; }
    if (!method) { toast.error("Ödəniş üsulunu seçin"); return; }

    setSubmitting(true);
    try {
      let receipt_url: string | null = null;
      if (receipt) {
        const ext = receipt.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: ue } = await supabase.storage.from("topup-receipts").upload(path, receipt, { upsert: false });
        if (ue) throw ue;
        receipt_url = path;
      }
      const { error } = await supabase.from("wallet_topups").insert({
        user_id: user.id, amount: num, method: method as any, sender_note: note || null, receipt_url, status: "pending",
      });
      if (error) throw error;
      toast.success("Müraciət göndərildi. Admin təsdiqindən sonra balans artırılacaq.");
      setAmount(""); setNote(""); setReceipt(null);
      await refresh();
    } catch (e: any) { toast.error(e.message ?? "Xəta"); }
    finally { setSubmitting(false); }
  }

  const selected = methods.find(m => m.method === method);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-7 w-7 text-neon" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Cüzdan</h1>
          </div>
          <p className="text-muted-foreground mb-8">Balansınızı artırın və tarixçəyə baxın.</p>

          <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow mb-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Mövcud balans</p>
            <p className="font-display text-4xl font-bold text-neon mt-2">{balance.toFixed(2)} ₼</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow space-y-4">
                <h2 className="font-semibold text-lg inline-flex items-center gap-2"><Upload className="h-4 w-4 text-neon" /> Balans artır</h2>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Məbləğ (AZN)</label>
                  <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="Məs. 50" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-background border border-border" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Ödəniş üsulu</label>
                  <select value={method} onChange={e => setMethod(e.target.value)} className="mt-1.5 w-full h-11 px-3 rounded-lg bg-background border border-border">
                    {methods.map(m => <option key={m.method} value={m.method}>{m.label}</option>)}
                  </select>
                </div>

                {selected && (
                  <div className="rounded-lg border border-neon/30 bg-neon/5 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="whitespace-pre-wrap text-foreground/90">{selected.instructions}</p>
                      <button onClick={() => { navigator.clipboard.writeText(selected.instructions); toast.success("Kopyalandı"); }}
                        className="shrink-0 grid h-8 w-8 place-items-center rounded-md hover:bg-surface"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Qəbz şəkli (ixtiyari, tövsiyə olunur)</label>
                  <input type="file" accept="image/*" onChange={e => setReceipt(e.target.files?.[0] ?? null)}
                    className="mt-1.5 w-full text-sm file:mr-3 file:h-9 file:px-3 file:rounded-md file:border-0 file:bg-surface file:text-foreground file:font-semibold" />
                  {receipt && <p className="text-xs text-muted-foreground mt-1">✓ {receipt.name}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Qeyd (ixtiyari)</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                    placeholder="Ödəniş haqqında əlavə məlumat"
                    className="mt-1.5 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm resize-none" />
                </div>

                <button disabled={submitting} onClick={submit}
                  className="w-full h-11 rounded-lg bg-neon text-background font-semibold neon-ring disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Müraciət göndər
                </button>

                <p className="text-[11px] text-muted-foreground">
                  Müraciətiniz admin tərəfindən yoxlanıldıqdan sonra balansa avtomatik əlavə olunacaq. Adətən 24 saat ərzində.
                </p>
              </div>

              {/* History */}
              <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow">
                <h2 className="font-semibold text-lg mb-4 inline-flex items-center gap-2"><Receipt className="h-4 w-4 text-neon" /> Tarixçə</h2>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Hələ müraciət yoxdur.</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {history.map(t => (
                      <div key={t.id} className="rounded-lg border border-border bg-surface/40 p-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold">{Number(t.amount).toFixed(2)} ₼</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.status === "approved" ? "bg-success/20 text-success" :
                            t.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                          }`}>
                            {t.status === "approved" ? <CheckCircle2 className="h-3 w-3" /> : t.status === "rejected" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {t.status === "approved" ? "Təsdiqli" : t.status === "rejected" ? "Rədd" : "Gözləyir"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{t.method} · {new Date(t.created_at).toLocaleString("az-AZ")}</p>
                        {t.admin_notes && <p className="text-xs mt-1.5 bg-background/50 px-2 py-1 rounded">Admin: {t.admin_notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
