import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, Lock, Gamepad2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Daxil ol — NextPlay.az" }] }),
});

function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-neon neon-ring mb-4">
              <Gamepad2 className="h-7 w-7 text-background" />
            </div>
            <h1 className="font-display text-3xl font-bold">Yenidən xoş gəlmisən</h1>
            <p className="mt-2 text-muted-foreground text-sm">Gaming aləminə davam et</p>
          </div>

          <form className="rounded-2xl border border-border bg-card-gradient p-7 card-shadow space-y-4" onSubmit={e => e.preventDefault()}>
            <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="Email" />
            <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Şifrə" />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" className="accent-primary" /> Məni xatırla</label>
              <a href="#" className="text-neon hover:underline">Şifrəni unutdun?</a>
            </div>

            <button type="submit" className="w-full h-11 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.01] transition">
              Daxil ol
            </button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="flex-1 h-px bg-border" /> və ya <div className="flex-1 h-px bg-border" /></div>

            <button type="button" className="w-full h-11 rounded-xl border border-border bg-background hover:bg-surface transition font-medium text-sm">
              Google ilə davam et
            </button>
          </form>

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
