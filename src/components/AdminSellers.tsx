import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Ban, ShieldCheck, Percent, Send, Store } from "lucide-react";

type Seller = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  shop_name: string | null;
  avatar_url: string | null;
  seller_tier: string | null;
  sales_count: number | null;
  sales_total: number | null;
  verified_at: string | null;
  wallet_balance: number;
  commission_rate_override: number | null;
  effective_rate: number;
  suspended_until: string | null;
  suspend_reason: string | null;
  active_products: number;
  last_seen_at: string | null;
  created_at: string;
};

export function AdminSellers() {
  const [rows, setRows] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bTitle, setBTitle] = useState("");
  const [bBody, setBBody] = useState("");
  const [bLink, setBLink] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_sellers" as any);
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.shop_name ?? "").toLowerCase().includes(s) ||
      (r.display_name ?? "").toLowerCase().includes(s) ||
      (r.username ?? "").toLowerCase().includes(s) ||
      (r.email ?? "").toLowerCase().includes(s));
  }, [rows, q]);

  async function setRate(seller: Seller) {
    const input = window.prompt(
      `Yeni komissiya faizi (0-50) — boş qoysanız tier default (${(seller.effective_rate * 100).toFixed(1)}%) qayıdır:`,
      seller.commission_rate_override !== null ? (seller.commission_rate_override * 100).toString() : ""
    );
    if (input === null) return;
    const trimmed = input.trim();
    let rate: number | null = null;
    if (trimmed.length) {
      const pct = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(pct) || pct < 0 || pct > 50) { toast.error("0-50 arası dəyər"); return; }
      rate = pct / 100;
    }
    setBusy(seller.id);
    const { error } = await supabase.rpc("admin_set_commission_rate" as any, { p_seller_id: seller.id, p_rate: rate });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Komissiya yeniləndi");
    load();
  }

  async function suspend(seller: Seller) {
    const hoursStr = window.prompt("Neçə saat dayandırılsın? (məs. 24, 72, 168)");
    if (!hoursStr) return;
    const hours = Number(hoursStr);
    if (!Number.isFinite(hours) || hours < 1) { toast.error("Düzgün saat daxil edin"); return; }
    const reason = window.prompt("Səbəb (satıcıya bildiriləcək):");
    if (!reason || reason.trim().length < 3) { toast.error("Səbəb ən azı 3 simvol"); return; }
    setBusy(seller.id);
    const { error } = await supabase.rpc("admin_suspend_seller" as any, { p_seller_id: seller.id, p_hours: hours, p_reason: reason });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${hours} saat dayandırıldı`);
    load();
  }

  async function unsuspend(seller: Seller) {
    if (!window.confirm("Dayandırma ləğv edilsin?")) return;
    setBusy(seller.id);
    const { error } = await supabase.rpc("admin_unsuspend_seller" as any, { p_seller_id: seller.id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Dayandırma ləğv edildi");
    load();
  }

  async function notifyOne(seller: Seller) {
    const title = window.prompt(`"${seller.shop_name || seller.display_name}" — bildiriş başlığı:`);
    if (!title) return;
    const body = window.prompt("Mətn:") ?? "";
    setBusy(seller.id);
    const { error } = await supabase.rpc("admin_notify_sellers" as any, { p_seller_id: seller.id, p_title: title, p_body: body, p_link: null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Bildiriş göndərildi");
  }

  async function broadcast() {
    if (!bTitle.trim()) { toast.error("Başlıq lazımdır"); return; }
    setBusy("broadcast");
    const { data, error } = await supabase.rpc("admin_notify_sellers" as any, {
      p_seller_id: null, p_title: bTitle, p_body: bBody, p_link: bLink.trim() || null
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${data} satıcıya göndərildi`);
    setBTitle(""); setBBody(""); setBLink(""); setShowBroadcast(false);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Satıcı axtar (ad, mağaza, email)"
            className="w-full h-10 pl-9 pr-3 rounded-md bg-secondary border border-border text-sm" />
        </div>
        <button onClick={() => setShowBroadcast(v => !v)}
          className="h-10 px-4 rounded-md bg-neon/10 hover:bg-neon/20 text-neon text-sm font-semibold inline-flex items-center gap-2">
          <Send className="h-4 w-4" /> Bütün satıcılara bildiriş
        </button>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} satıcı</span>
      </div>

      {showBroadcast && (
        <div className="rounded-xl border border-border bg-card-gradient p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4 text-neon" /> Satıcılara bildiriş</h3>
          <input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="Başlıq" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
          <textarea value={bBody} onChange={e => setBBody(e.target.value)} placeholder="Mətn (optional)" rows={3} className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm" />
          <input value={bLink} onChange={e => setBLink(e.target.value)} placeholder="Link (optional, məs. /seller-dashboard)" className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm" />
          <div className="flex gap-2">
            <button disabled={busy === "broadcast"} onClick={broadcast} className="h-10 px-4 rounded-md bg-neon text-black font-semibold text-sm">
              {busy === "broadcast" ? "Göndərilir..." : "Göndər"}
            </button>
            <button onClick={() => setShowBroadcast(false)} className="h-10 px-4 rounded-md bg-secondary text-sm">Ləğv et</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(s => {
          const isSuspended = !!s.suspended_until && new Date(s.suspended_until) > new Date();
          return (
            <div key={s.id} className={`rounded-xl border p-4 ${isSuspended ? "border-destructive/50 bg-destructive/5" : "border-border bg-card-gradient"}`}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {s.avatar_url ? <img src={s.avatar_url} className="h-11 w-11 rounded-full object-cover" alt="" /> :
                    <div className="h-11 w-11 rounded-full bg-secondary grid place-items-center"><Store className="h-5 w-5 text-muted-foreground" /></div>}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{s.shop_name || s.display_name || s.username || "Satıcı"}</p>
                      {s.verified_at && <ShieldCheck className="h-4 w-4 text-neon" />}
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{s.seller_tier}</span>
                      {isSuspended && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-semibold">Suspended</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{s.email} · @{s.username}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Stat label="Satış" value={String(s.sales_count ?? 0)} />
                  <Stat label="Ciro" value={`${(s.sales_total ?? 0).toFixed(0)} ₼`} />
                  <Stat label="Balans" value={`${s.wallet_balance.toFixed(2)} ₼`} />
                  <Stat label="Aktiv məhsul" value={String(s.active_products)} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary">
                  <Percent className="h-3 w-3" /> Komissiya: <b>{(s.effective_rate * 100).toFixed(1)}%</b>
                  {s.commission_rate_override !== null && <span className="text-neon">(fərdi)</span>}
                </span>
                {isSuspended && (
                  <span className="px-2 py-1 rounded bg-destructive/10 text-destructive">
                    ⏳ {new Date(s.suspended_until!).toLocaleString("az-AZ")} — {s.suspend_reason}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={busy === s.id} onClick={() => setRate(s)}
                  className="h-8 px-3 rounded-md bg-secondary hover:bg-muted text-xs font-medium inline-flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5" /> Komissiya
                </button>
                {isSuspended ? (
                  <button disabled={busy === s.id} onClick={() => unsuspend(s)}
                    className="h-8 px-3 rounded-md bg-success/20 hover:bg-success/30 text-success text-xs font-semibold inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Bərpa et
                  </button>
                ) : (
                  <button disabled={busy === s.id} onClick={() => suspend(s)}
                    className="h-8 px-3 rounded-md bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs font-semibold inline-flex items-center gap-1.5">
                    <Ban className="h-3.5 w-3.5" /> Suspend et
                  </button>
                )}
                <button disabled={busy === s.id} onClick={() => notifyOne(s)}
                  className="h-8 px-3 rounded-md bg-secondary hover:bg-muted text-xs font-medium inline-flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Bildiriş
                </button>
                <a href={`/u/${s.id}`} target="_blank" rel="noreferrer"
                  className="h-8 px-3 rounded-md bg-secondary hover:bg-muted text-xs font-medium inline-flex items-center gap-1.5">
                  Profilə bax
                </a>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Satıcı tapılmadı.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[80px]">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

export default AdminSellers;
