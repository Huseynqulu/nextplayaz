import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, Lock, User, Gamepad2, Loader2, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ ref: z.string().optional() });

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Qeydiyyat — NextPlay.az" }] }),
});

async function redeemIfAny(code: string | undefined) {
  if (!code) return;
  try { await supabase.rpc("redeem_referral_signup", { p_code: code }); } catch {/* ignore */}
}

function RegisterPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ref, setRef] = useState(search.ref ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.ref) {
      try { sessionStorage.setItem("nextplay_ref", search.ref); } catch {/* ignore */}
    } else {
      try {
        const v = sessionStorage.getItem("nextplay_ref");
        if (v) setRef(v);
      } catch {/* ignore */}
    }
  }, [search.ref]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Şifrələr uyğun gəlmir");
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username, display_name: username },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (data.session) await redeemIfAny(ref.trim() || undefined);
    setLoading(false);
    toast.success("Hesab yaradıldı! Xoş gəlmisən!");
    try { sessionStorage.removeItem("nextplay_ref"); } catch {/* ignore */}
    navigate({ to: "/" });
  }

  async function handleGoogle() {
    setLoading(true);
    if (ref.trim()) try { sessionStorage.setItem("nextplay_ref", ref.trim()); } catch {/* ignore */}
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { setLoading(false); toast.error("Google ilə qeydiyyat alınmadı"); return; }
    if (result.redirected) return;
    navigate({ to: "/" });
  }


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-neon neon-ring mb-4">
              <Gamepad2 className="h-7 w-7 text-background" />
            </div>
            <h1 className="font-display text-3xl font-bold">Hesab yarat</h1>
            <p className="mt-2 text-muted-foreground text-sm">NextPlay-ə qoşul və indi başla</p>
          </div>

          <form className="rounded-2xl border border-border bg-card-gradient p-7 card-shadow space-y-4" onSubmit={handleSubmit}>
            <Field icon={<User className="h-4 w-4" />} placeholder="İstifadəçi adı" required minLength={2} value={username} onChange={e => setUsername(e.target.value)} />
            <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
            <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Şifrə (min 6)" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
            <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Şifrəni təsdiqlə" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} />
            <Field icon={<Gift className="h-4 w-4" />} placeholder="Referal kodu (istəyə görə)" value={ref} onChange={e => setRef(e.target.value.toUpperCase())} />
            {ref && <p className="text-xs text-neon -mt-2">🎁 Qeydiyyatdan sonra ilk sifarişdə 2 ₼ bonus qazanacaqsan!</p>}

            <label className="flex gap-2 text-xs text-muted-foreground">
              <input type="checkbox" required className="accent-primary mt-0.5" />
              <span>Mən <a href="#" className="text-neon hover:underline">istifadə şərtləri</a> ilə razıyam</span>
            </label>

            <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.01] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Hesab yarat
            </button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="flex-1 h-px bg-border" /> və ya <div className="flex-1 h-px bg-border" /></div>

            <button type="button" onClick={handleGoogle} disabled={loading} className="w-full h-11 rounded-xl border border-border bg-background hover:bg-surface transition font-medium text-sm disabled:opacity-60">
              Google ilə davam et
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Artıq hesabın var? <Link to="/login" className="text-neon font-semibold hover:underline">Daxil ol</Link>
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
