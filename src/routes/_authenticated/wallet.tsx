import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Wallet, Loader2, Upload, Receipt, Copy, CheckCircle2, XCircle, Clock, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { GiftCardRedeem } from "@/components/GiftCardRedeem";
import { LoyaltyCard } from "@/components/LoyaltyCard";

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
type Withdraw = {
  id: string; amount: number; fee: number; net_amount: number;
  method: string; destination: string; account_holder: string | null;
  status: "pending" | "approved" | "rejected"; admin_notes: string | null; created_at: string;
};

const WITHDRAW_METHODS: { value: string; label: string; hint: string }[] = [
  { value: "card", label: "Bank kartı (Visa/Master)", hint: "16 rəqəmli kart nömrəsi" },
  { value: "m10", label: "m10", hint: "m10 telefon nömrəsi (+994...)" },
  { value: "bank_transfer", label: "Bank köçürməsi (IBAN)", hint: "AZxx XXXX XXXX XXXX XXXX XXXX XXXX" },
];

function WalletPage() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [balance, setBalance] = useState<number>(0);
  const [pending, setPending] = useState<{ total: number; items: { id: string; seller_net: number; funds_release_at: string | null }[] }>({ total: 0, items: [] });
  const [showPending, setShowPending] = useState(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [history, setHistory] = useState<TopUp[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"topup" | "withdraw">("topup");

  // Top-up form
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Withdraw form
  const [wAmount, setWAmount] = useState("");
  const [wMethod, setWMethod] = useState<string>("card");
  const [wDest, setWDest] = useState("");
  const [wHolder, setWHolder] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: m }, { data: h }, { data: w }, { data: pend }] = await Promise.all([
      supabase.rpc("get_my_wallet_balance"),
      supabase.from("payment_settings").select("*").eq("is_active", true).order("label"),
      supabase.from("wallet_topups").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallet_withdrawals" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("id, seller_net, funds_release_at")
        .eq("seller_id", user.id).eq("status", "completed").is("funds_released_at", null)
        .order("funds_release_at", { ascending: true }),
    ]);
    setBalance(Number(p ?? 0));
    setMethods((m as any) ?? []);
    if (!method && m && m.length > 0) setMethod((m as any)[0].method);
    setHistory((h as any) ?? []);
    setWithdrawals((w as any) ?? []);
    const items = ((pend as any) ?? []) as { id: string; seller_net: number; funds_release_at: string | null }[];
    setPending({ total: items.reduce((s, i) => s + Number(i.seller_net ?? 0), 0), items });
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  async function submit() {
    if (!user) return;
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 5) { toast.error("Minimum 5 ₼ əlavə edə bilərsiniz"); return; }
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

  async function submitWithdraw() {
    if (!user) return;
    const num = Number(wAmount);
    if (!Number.isFinite(num) || num < 20) { toast.error("Minimum 20 AZN çıxara bilərsiniz"); return; }
    if (num > balance) { toast.error("Balansda kifayət qədər vəsait yoxdur"); return; }
    if (wDest.trim().length < 4) { toast.error("Hesab məlumatını daxil edin"); return; }

    setWSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_withdrawal" as any, {
        p_amount: num, p_method: wMethod, p_destination: wDest.trim(),
        p_account_holder: wHolder.trim() || null,
      });
      if (error) throw error;
      toast.success("Pul çıxarma müraciəti göndərildi. Admin təsdiqindən sonra hesabınıza köçürüləcək.");
      setWAmount(""); setWDest(""); setWHolder("");
      await refresh();
    } catch (e: any) { toast.error(e.message ?? "Xəta"); }
    finally { setWSubmitting(false); }
  }

  const selected = methods.find(m => m.method === method);
  const wMethodMeta = WITHDRAW_METHODS.find(m => m.value === wMethod)!;
  const wNum = Number(wAmount) || 0;
  const wFee = Math.round(wNum * 0.05 * 100) / 100;
  const wNet = Math.max(0, wNum - wFee);

  function StatusBadge({ s }: { s: "pending" | "approved" | "rejected" }) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
        s === "approved" ? "bg-success/20 text-success" :
        s === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
      }`}>
        {s === "approved" ? <CheckCircle2 className="h-3 w-3" /> : s === "rejected" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
        {s === "approved" ? "Təsdiqli" : s === "rejected" ? "Rədd" : "Gözləyir"}
      </span>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-7 w-7 text-neon" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Cüzdan</h1>
          </div>
          <p className="text-muted-foreground mb-8">Balansınızı artırın, pul çıxarın və əməliyyat tarixçəsinə baxın.</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Mövcud balans</p>
              <p className="font-display text-4xl font-bold text-neon mt-2">{format(balance)}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPending((v) => !v)}
              className="text-left rounded-2xl border border-border bg-surface p-6 card-shadow hover:border-neon/40 transition"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> Gözləyən balans (48 saat)
              </p>
              <p className="font-display text-4xl font-bold mt-2">{format(pending.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pending.items.length} sifariş — {showPending ? "gizlət" : "detallara bax"}
              </p>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <GiftCardRedeem onRedeemed={() => refresh()} />
            <LoyaltyCard onChanged={() => refresh()} />
          </div>



          {showPending && pending.items.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 mb-8">
              <h3 className="font-semibold mb-3 text-sm">Gözləyən köçürmələr</h3>
              <ul className="divide-y divide-border">
                {pending.items.map((it) => {
                  const date = it.funds_release_at ? new Date(it.funds_release_at) : null;
                  const hours = date ? Math.max(0, Math.round((date.getTime() - Date.now()) / 3600000)) : null;
                  return (
                    <li key={it.id} className="py-2 flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-muted-foreground">#{it.id.slice(0, 8)}</span>
                      <span className="text-muted-foreground">
                        {date ? `${date.toLocaleString("az-AZ")} (${hours} saat qaldı)` : "—"}
                      </span>
                      <span className="font-semibold text-neon">+{format(it.seller_net)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Tabs */}
          <div className="inline-flex rounded-xl bg-surface border border-border p-1 mb-6">
            <button onClick={() => setTab("topup")}
              className={`inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold ${tab === "topup" ? "bg-neon text-background" : "text-muted-foreground hover:text-foreground"}`}>
              <ArrowDownToLine className="h-4 w-4" /> Balans artır
            </button>
            <button onClick={() => setTab("withdraw")}
              className={`inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold ${tab === "withdraw" ? "bg-neon text-background" : "text-muted-foreground hover:text-foreground"}`}>
              <ArrowUpFromLine className="h-4 w-4" /> Pul çıxar
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {tab === "topup" ? (
                <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow space-y-4">
                  <h2 className="font-semibold text-lg inline-flex items-center gap-2"><Upload className="h-4 w-4 text-neon" /> Balans artır</h2>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Məbləğ (AZN)</label>
                    <input type="number" min="5" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="Min. 5" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-background border border-border" />
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
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Qəbz şəkli (tövsiyə olunur)</label>
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
              ) : (
                <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow space-y-4">
                  <h2 className="font-semibold text-lg inline-flex items-center gap-2">
                    <ArrowUpFromLine className="h-4 w-4 text-neon" /> Pul çıxar
                  </h2>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Məbləğ (AZN)</label>
                    <input type="number" min="5" step="0.01" value={wAmount} onChange={e => setWAmount(e.target.value)}
                      placeholder="Min. 5"
                      className="mt-1.5 w-full h-11 px-3 rounded-lg bg-background border border-border" />
                  </div>

                  <div className="rounded-lg border border-border bg-surface/40 p-3 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Tələb edilən</span><span className="font-mono">{wNum.toFixed(2)} ₼</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Komissya (5%)</span><span className="font-mono text-warning">−{wFee.toFixed(2)} ₼</span></div>
                    <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-semibold">Sizə çatacaq</span><span className="font-mono font-bold text-success">{wNet.toFixed(2)} ₼</span></div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Çıxarış üsulu</label>
                    <select value={wMethod} onChange={e => setWMethod(e.target.value)}
                      className="mt-1.5 w-full h-11 px-3 rounded-lg bg-background border border-border">
                      {WITHDRAW_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Hesab məlumatı</label>
                    <input value={wDest} onChange={e => setWDest(e.target.value)}
                      placeholder={wMethodMeta.hint}
                      className="mt-1.5 w-full h-11 px-3 rounded-lg bg-background border border-border font-mono text-sm" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Hesab sahibinin adı</label>
                    <input value={wHolder} onChange={e => setWHolder(e.target.value)}
                      placeholder="Ad Soyad"
                      className="mt-1.5 w-full h-11 px-3 rounded-lg bg-background border border-border text-sm" />
                  </div>

                  <button disabled={wSubmitting || balance < 20} onClick={submitWithdraw}
                    className="w-full h-11 rounded-lg bg-neon text-background font-semibold neon-ring disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    {wSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
                    Çıxarış müraciəti göndər
                  </button>

                  <p className="text-[11px] text-muted-foreground">
                    Müraciət göndərildiyi anda məbləğ balansdan tutulur. Admin rədd etsə tam məbləğ geri qaytarılır. Adətən 24 saat ərzində icra edilir.
                  </p>
                </div>
              )}

              {/* History combined */}
              <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow">
                <h2 className="font-semibold text-lg mb-4 inline-flex items-center gap-2"><Receipt className="h-4 w-4 text-neon" /> Tarixçə</h2>

                {tab === "topup" ? (
                  history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Hələ artırma müraciəti yoxdur.</p>
                  ) : (
                    <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                      {history.map(t => (
                        <div key={t.id} className="rounded-lg border border-border bg-surface/40 p-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-success">+{format(t.amount)}</span>
                            <StatusBadge s={t.status} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{t.method} · {new Date(t.created_at).toLocaleString("az-AZ")}</p>
                          {t.admin_notes && <p className="text-xs mt-1.5 bg-background/50 px-2 py-1 rounded">Admin: {t.admin_notes}</p>}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  withdrawals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Hələ çıxarış müraciəti yoxdur.</p>
                  ) : (
                    <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                      {withdrawals.map(w => (
                        <div key={w.id} className="rounded-lg border border-border bg-surface/40 p-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <span className="font-bold text-destructive">−{format(w.amount)}</span>
                              <span className="text-xs text-muted-foreground ml-2">→ alacaq: {format(w.net_amount)}</span>
                            </div>
                            <StatusBadge s={w.status} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{w.method} · {w.destination} · {new Date(w.created_at).toLocaleString("az-AZ")}</p>
                          {w.admin_notes && <p className="text-xs mt-1.5 bg-background/50 px-2 py-1 rounded">Admin: {w.admin_notes}</p>}
                        </div>
                      ))}
                    </div>
                  )
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
