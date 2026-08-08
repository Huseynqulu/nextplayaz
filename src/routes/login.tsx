import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, Lock, Loader2 } from "lucide-react";
import nextplayLogo from "@/assets/nextplay-logo.png";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Daxil ol — NextPlay.az" },
      { name: "description", content: "NextPlay.az hesabınıza daxil olun və gaming marketplace-də alqı-satqıya davam edin." },
      { property: "og:title", content: "Daxil ol — NextPlay.az" },
      { property: "og:description", content: "NextPlay.az hesabınıza daxil olun." },
      { property: "og:url", content: "https://nextplay.az/login" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://nextplay.az/login" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { toast.error("Email daxil edin"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setResetSent(true);
    toast.success("Şifrə sıfırlama linki emailinizə göndərildi");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); toast.error(error.message); return; }

    // Check if MFA challenge is required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find(f => f.status === "verified");
      if (totp) {
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        setLoading(false);
        if (chErr) { toast.error(chErr.message); return; }
        setMfa({ factorId: totp.id, challengeId: ch.id });
        return;
      }
    }
    setLoading(false);
    toast.success("Xoş gəldin!");
    navigate({ to: "/" });
  }

  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa || mfaCode.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.mfa.verify({ factorId: mfa.factorId, challengeId: mfa.challengeId, code: mfaCode });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Xoş gəldin!");
    navigate({ to: "/" });
  }

  async function cancelMfa() {
    await supabase.auth.signOut();
    setMfa(null); setMfaCode("");
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Google ilə daxil olmaq alınmadı");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={nextplayLogo} alt="NextPlay" className="h-16 w-auto mx-auto mb-4" />

            <h1 className="font-display text-3xl font-bold">Yenidən xoş gəlmisən</h1>
            <p className="mt-2 text-muted-foreground text-sm">Gaming aləminə davam et</p>
          </div>

          {mfa ? (
            <form onSubmit={verifyMfa} className="rounded-2xl border border-border bg-card-gradient p-7 card-shadow space-y-4">
              <div className="text-center">
                <h2 className="font-display text-lg font-bold">İki addımlı doğrulama</h2>
                <p className="text-xs text-muted-foreground mt-1">Authenticator tətbiqindəki 6 rəqəmli kodu daxil edin</p>
              </div>
              <input value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric" autoFocus placeholder="000000"
                className="w-full h-14 px-4 rounded-xl bg-background border border-border text-center font-mono text-3xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" disabled={loading || mfaCode.length !== 6}
                className="w-full h-11 rounded-xl bg-neon text-background font-semibold neon-ring disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Təsdiqlə
              </button>
              <button type="button" onClick={cancelMfa} className="w-full text-xs text-muted-foreground hover:text-foreground">
                Ləğv et və geri qayıt
              </button>
            </form>
          ) : (
          <form className="rounded-2xl border border-border bg-card-gradient p-7 card-shadow space-y-4" onSubmit={handleSubmit}>
            <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
            <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Şifrə" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" className="accent-primary" /> Məni xatırla</label>
              <button type="button" onClick={() => { setForgot(true); setResetSent(false); }} className="text-neon hover:underline">Şifrəni unutdun?</button>
            </div>

            <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.01] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Daxil ol
            </button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="flex-1 h-px bg-border" /> və ya <div className="flex-1 h-px bg-border" /></div>

            <button type="button" onClick={handleGoogle} disabled={loading} className="w-full h-11 rounded-xl border border-border bg-background hover:bg-surface transition font-medium text-sm disabled:opacity-60">
              Google ilə davam et
            </button>
          </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Hesabın yoxdur? <Link to="/register" className="text-neon font-semibold hover:underline">Qeydiyyatdan keç</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ icon, ...props }: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
      <input {...props} className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
