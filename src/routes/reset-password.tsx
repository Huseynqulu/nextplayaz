import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Lock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Şifrəni yenilə — NextPlay.az" },
      { name: "description", content: "NextPlay.az hesabınız üçün yeni şifrə təyin edin." },
      { property: "og:title", content: "Şifrəni yenilə — NextPlay.az" },
      { property: "og:description", content: "NextPlay.az hesabınız üçün yeni şifrə təyin edin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Şifrə ən az 6 simvol olmalıdır"); return; }
    if (password !== confirm) { toast.error("Şifrələr uyğun gəlmir"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Şifrə yeniləndi");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-bold text-center mb-6">Yeni şifrə təyin et</h1>
          {!ready ? (
            <div className="rounded-2xl border border-border bg-card-gradient p-7 card-shadow text-sm text-muted-foreground text-center">
              Bu səhifəni emailinizdəki şifrə sıfırlama linki ilə açın. Link etibarsız və ya vaxtı keçmiş ola bilər.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card-gradient p-7 card-shadow space-y-4">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="h-4 w-4" /></div>
                <input type="password" placeholder="Yeni şifrə" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="h-4 w-4" /></div>
                <input type="password" placeholder="Yeni şifrəni təkrarla" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-11 rounded-xl bg-neon text-background font-semibold neon-ring disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Şifrəni yenilə
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
