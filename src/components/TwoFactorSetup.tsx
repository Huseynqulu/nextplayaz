import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2, KeyRound, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Factor = { id: string; friendly_name?: string | null; status: string; factor_type: string };

export function TwoFactorSetup({ recommended }: { recommended?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [pending, setPending] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) toast.error(error.message);
    setFactors(((data?.totp ?? []) as Factor[]));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function startEnroll() {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `NextPlay ${new Date().toLocaleDateString("az")}`,
    });
    setEnrolling(false);
    if (error) { toast.error(error.message); return; }
    setPending({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify() {
    if (!pending || code.length < 6) return;
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: pending.factorId });
    if (chErr) { setBusy(false); toast.error(chErr.message); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId: pending.factorId, challengeId: ch.id, code });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("2FA aktivləşdirildi");
    setPending(null); setCode("");
    void load();
  }

  async function cancelEnroll() {
    if (!pending) return;
    await supabase.auth.mfa.unenroll({ factorId: pending.factorId });
    setPending(null); setCode("");
  }

  async function remove(id: string) {
    if (!confirm("2FA-nı silmək istədiyinizdən əminsinizmi?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) { toast.error(error.message); return; }
    toast.success("2FA silindi");
    void load();
  }

  const verified = factors.filter(f => f.status === "verified");

  return (
    <div className="rounded-2xl border border-border bg-card-gradient p-7 card-shadow">
      <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-neon" /> İki addımlı doğrulama (2FA)
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Hesabınızı Google Authenticator, Authy və ya 1Password kimi tətbiqlərlə qoruyun.
        {recommended && <span className="text-warning"> Satıcılar və admin üçün xüsusilə tövsiyə olunur.</span>}
      </p>

      {loading ? (
        <div className="py-6 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-neon" /></div>
      ) : verified.length > 0 ? (
        <div className="space-y-2">
          {verified.map(f => (
            <div key={f.id} className="flex items-center justify-between rounded-xl border border-success/30 bg-success/10 p-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-medium">{f.friendly_name || "Authenticator"}</span>
                <span className="text-xs text-muted-foreground">· aktiv</span>
              </div>
              <button onClick={() => remove(f.id)} className="text-xs text-destructive hover:underline flex items-center gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Sil
              </button>
            </div>
          ))}
        </div>
      ) : pending ? (
        <div className="space-y-4">
          <p className="text-sm">1. Authenticator tətbiqində QR kodu skan edin:</p>
          <div className="grid place-items-center rounded-xl bg-white p-4 w-fit mx-auto">
            <img src={pending.qr} alt="QR" className="h-44 w-44" />
          </div>
          <div className="text-xs text-muted-foreground text-center">
            və ya manual açar: <code className="px-2 py-0.5 bg-surface rounded">{pending.secret}</code>
          </div>
          <p className="text-sm">2. Tətbiqdə görünən 6 rəqəmli kodu daxil edin:</p>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric" placeholder="000000"
            className="w-full h-12 px-4 rounded-xl bg-background border border-border text-center font-mono text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex gap-2">
            <button onClick={verify} disabled={busy || code.length !== 6}
              className="flex-1 h-11 rounded-xl bg-neon text-background font-semibold neon-ring disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Təsdiqlə
            </button>
            <button onClick={cancelEnroll} className="h-11 px-4 rounded-xl border border-border hover:bg-surface text-sm">
              Ləğv et
            </button>
          </div>
        </div>
      ) : (
        <button onClick={startEnroll} disabled={enrolling}
          className="h-11 px-5 rounded-xl bg-neon text-background font-semibold neon-ring disabled:opacity-50 flex items-center gap-2">
          {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          2FA-nı aktivləşdir
        </button>
      )}
    </div>
  );
}
