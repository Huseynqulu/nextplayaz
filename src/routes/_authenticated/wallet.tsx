import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { burstConfetti } from "@/lib/celebrate";
import { Wallet, Loader2, Receipt, CheckCircle2, XCircle, Clock, ArrowDownToLine, ArrowUpFromLine, ExternalLink, Zap, Upload, X } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { GiftCardRedeem } from "@/components/GiftCardRedeem";
import { LoyaltyCard } from "@/components/LoyaltyCard";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "Cüzdan — NextPlay.az" }] }),
});

type Method = { method: string; label: string; instructions: string; is_active: boolean };
type TopupLink = { id: string; amount: number; url: string; is_active: boolean };
type TopUp = {
  id: string; amount: number; method: string; sender_note: string | null;
  receipt_url: string | null; reference_code: string | null; status: "pending" | "approved" | "rejected";
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
  const [links, setLinks] = useState<TopupLink[]>([]);
  const [history, setHistory] = useState<TopUp[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"topup" | "withdraw">("topup");

  // Top-up form
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastRef, setLastRef] = useState<string | null>(null);
  const [step, setStep] = useState<"amount" | "receipt">("amount");
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Withdraw form
  const [wAmount, setWAmount] = useState("");
  const [wMethod, setWMethod] = useState<string>("card");
  const [wDest, setWDest] = useState("");
  const [wHolder, setWHolder] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: m }, { data: lk }, { data: h }, { data: w }, { data: pend }] = await Promise.all([
      supabase.rpc("get_my_wallet_balance"),
      supabase.from("payment_settings").select("*").eq("is_active", true).order("label"),
      supabase.from("topup_payment_links" as any).select("*").eq("is_active", true).order("amount"),
      supabase.from("wallet_topups").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallet_withdrawals" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("id, seller_net, funds_release_at")
        .eq("seller_id", user.id).eq("status", "completed").is("funds_released_at", null)
        .order("funds_release_at", { ascending: true }),
    ]);
    setBalance(Number(p ?? 0));
    setMethods((m as any) ?? []);
    setLinks((lk as any) ?? []);
    setHistory((h as any) ?? []);
    setWithdrawals((w as any) ?? []);
    const items = ((pend as any) ?? []) as { id: string; seller_net: number; funds_release_at: string | null }[];
    setPending({ total: items.reduce((s, i) => s + Number(i.seller_net ?? 0), 0), items });
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  const matchedLink = links.find(l => Math.abs(Number(l.amount) - Number(amount || 0)) < 0.005) || null;

  function openBirbankLink() {
    if (!matchedLink) return;
    setLastRef(null);
    setPendingAmount(Number(matchedLink.amount));
    setStep("receipt");
    window.open(matchedLink.url, "_blank", "noopener,noreferrer");
    toast.success("BirBank açıldı. Ödənişdən sonra qəbzi yükləyin.");
  }

  function onPickReceipt(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Yalnız şəkil"); return; }
    if (f.size > 6 * 1024 * 1024) { toast.error("Maks 6 MB"); return; }
    setReceiptFile(f);
    setReceiptPreview(URL.createObjectURL(f));
  }

  async function submitReceipt() {
    if (!user || !lastRef) return;
    if (!receiptFile) { toast.error("Qəbz şəklini yükləyin"); return; }
    setSubmitting(true);
    try {
      const ext = receiptFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/topups/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("topup-receipts").upload(path, receiptFile, { contentType: receiptFile.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("wallet_topups").insert({
        user_id: user.id,
        amount: pendingAmount,
        method: "birbank" as any,
        sender_note: `BirBank link ödənişi · Ref: ${lastRef}`,
        reference_code: lastRef,
        receipt_url: path,
        status: "pending",
      } as any);
      if (error) throw error;
      toast.success("Ödəniş qəbziniz qəbul edildi. Admin təsdiqindən sonra balansınıza yüklənəcək.");
      burstConfetti();
      setStep("amount");
      setAmount("");
      setReceiptFile(null);
      setReceiptPreview(null);
      setLastRef(null);
      setPendingAmount(0);
      await refresh();
    } catch (e: any) { toast.error(e.message ?? "Xəta"); }
    finally { setSubmitting(false); }
  }

  function cancelReceiptStep() {
    setStep("amount");
    setReceiptFile(null);
    setReceiptPreview(null);
    setLastRef(null);
    setPendingAmount(0);
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
      burstConfetti();
      setWAmount(""); setWDest(""); setWHolder("");
      await refresh();
    } catch (e: any) { toast.error(e.message ?? "Xəta"); }
    finally { setWSubmitting(false); }
  }

  const _unusedMethods = methods; // kept for potential future methods; suppresses unused warning
  void _unusedMethods;

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
            <>
            <div>
              {tab === "topup" ? (
                <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow space-y-4">
                  <h2 className="font-semibold text-lg inline-flex items-center gap-2"><Zap className="h-4 w-4 text-neon" /> BirBank ilə balans artır</h2>

                  {step === "amount" ? (
                    <>
                      <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                        ⚠️ Yalnız tam məbləğlər qəbul olunur (məs: 5, 10, 15 AZN). Qəpiklə (məs: 5.50 AZN) balans artırmaq mümkün deyil.
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Məbləğ (AZN)</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={amount}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === "" || /^\d+$/.test(v)) setAmount(v);
                          }}
                          placeholder="Məs: 15"
                          className="mt-1.5 w-full h-11 px-3 rounded-lg bg-background border border-border"
                        />
                      </div>

                      {amount && !matchedLink && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                          Bu məbləğ üçün hazır ödəniş linki yoxdur. Zəhmət olmasa başqa tam məbləğ daxil edin və ya dəstəklə əlaqə saxlayın.
                        </div>
                      )}

                      {matchedLink && (
                        <div className="rounded-lg border border-neon/30 bg-neon/5 p-3 text-xs space-y-1">
                          <p className="font-semibold text-foreground">{format(Number(matchedLink.amount))} ödənişi hazırdır</p>
                          <p className="text-muted-foreground">Düyməyə basdıqda BirBank yeni tabda açılacaq. Ödədikdən sonra qəbz şəkli yükləyəcəksiniz.</p>
                        </div>
                      )}

                      <button disabled={!matchedLink} onClick={openBirbankLink}
                        className="w-full h-11 rounded-lg bg-neon text-background font-semibold neon-ring disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        BirBank-a keç və ödə
                      </button>

                      <p className="text-[11px] text-muted-foreground">
                        Ödəniş etdikdən sonra bu səhifəyə qayıdıb qəbz şəkilini yükləyin. Admin təsdiqindən sonra balans avtomatik yüklənir.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border border-neon/30 bg-neon/5 p-3 text-xs space-y-2">
                        <p className="font-semibold text-foreground">Ödəniş məlumatları</p>
                        <div className="flex justify-between"><span className="text-muted-foreground">Məbləğ</span><span className="font-mono font-bold">{format(pendingAmount)}</span></div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Referans:</span>
                          <code className="flex-1 font-mono font-bold text-sm bg-background/60 px-2 py-1 rounded">{lastRef}</code>
                          <button onClick={() => { if (lastRef) { navigator.clipboard.writeText(lastRef); toast.success("Kopyalandı"); } }}
                            className="grid h-7 w-7 place-items-center rounded-md hover:bg-background/60"><Copy className="h-3.5 w-3.5" /></button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">BirBank ödənişinin “izahat/qeyd” sahəsinə referansı yazın.</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Ödəniş qəbzi (şəkil)</label>
                        {receiptPreview ? (
                          <div className="mt-1.5 relative rounded-lg border border-border overflow-hidden">
                            <img src={receiptPreview} alt="Qəbz" className="w-full max-h-64 object-contain bg-background" />
                            <button onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                              className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 border border-border hover:border-destructive">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="mt-1.5 flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-border hover:border-neon cursor-pointer bg-background/40">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Qəbz şəkilini seçin (maks 6 MB)</span>
                            <input type="file" accept="image/*" hidden onChange={e => onPickReceipt(e.target.files?.[0] ?? null)} />
                          </label>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={cancelReceiptStep} disabled={submitting}
                          className="h-11 px-4 rounded-lg border border-border bg-surface hover:border-destructive text-sm">
                          Ləğv et
                        </button>
                        <button disabled={submitting || !receiptFile} onClick={submitReceipt}
                          className="flex-1 h-11 rounded-lg bg-neon text-background font-semibold neon-ring disabled:opacity-50 inline-flex items-center justify-center gap-2">
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Qəbzi göndər və təsdiqlə
                        </button>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Qəbz göndərildikdən sonra admin BirBank hesabında yoxlayıb balansınıza yükləyəcək. Adətən 15 dəqiqə – 24 saat.
                      </p>
                    </>
                  )}
                </div>

              ) : (
                <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow space-y-4">
                  <h2 className="font-semibold text-lg inline-flex items-center gap-2">
                    <ArrowUpFromLine className="h-4 w-4 text-neon" /> Pul çıxar
                  </h2>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Məbləğ (AZN)</label>
                    <input type="number" min="20" step="0.01" value={wAmount} onChange={e => setWAmount(e.target.value)}
                      placeholder="Min. 20"
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
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <GiftCardRedeem onRedeemed={() => refresh()} />
              <LoyaltyCard onChanged={() => refresh()} />
            </div>

            <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow mt-8">
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
            </>
          )}


        </div>
      </main>
      <Footer />
    </div>
  );
}
