import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Upload, ShieldCheck, TrendingUp, Wallet, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/seller")({
  component: SellerPage,
  head: () => ({ meta: [{ title: "Satıcı ol — NextPlay.az" }] }),
});

function SellerPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-hero border-b border-border">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
            <span className="text-xs font-semibold tracking-[0.2em] text-neon uppercase">Satıcı ol</span>
            <h1 className="mt-3 font-display text-4xl sm:text-6xl font-bold">
              Gaming məhsulların ilə <br /><span className="text-gradient">qazanmağa başla</span>
            </h1>
            <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
              Sadəcə bir neçə addımda yoxlanılmış satıcı statusu qazan və minlərlə alıcıya çıxış əldə et.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_1.4fr] gap-10">
          <div className="space-y-5">
            <h2 className="font-display text-2xl font-bold">Niyə NextPlay-də satmalısan?</h2>
            {[
              { icon: TrendingUp, t: "Yüksək qazanc", d: "Orta aylıq satıcı qazancı 800-2500 AZN" },
              { icon: Wallet, t: "Sürətli ödəniş", d: "Tamamlanmış sifariş — 24 saata balansda" },
              { icon: ShieldCheck, t: "Tam qorunma", d: "Escrow sistem fraud-dan qoruyur" },
            ].map((f, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl border border-border bg-card-gradient">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-neon/15 border border-neon/30 shrink-0">
                  <f.icon className="h-5 w-5 text-neon" />
                </div>
                <div>
                  <h4 className="font-semibold">{f.t}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{f.d}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={e => e.preventDefault()} className="rounded-2xl border border-border bg-card-gradient p-7 card-shadow">
            <h3 className="font-display text-xl font-bold mb-2">Satıcı müraciəti</h3>
            <p className="text-sm text-muted-foreground mb-6">Yoxlamadan sonra hesabın 24 saat ərzində aktivləşir.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Ad" placeholder="Eyvaz" />
              <Field label="Soyad" placeholder="Məmmədov" />
              <Field label="Email" type="email" placeholder="you@example.com" />
              <Field label="Telefon" placeholder="+994 50 123 45 67" />
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">Hansı kateqoriyada satacaqsan?</label>
              <select className="w-full h-11 px-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Oyunlar</option>
                <option>Hesablar</option>
                <option>Açarlar</option>
                <option>Xidmətlər</option>
              </select>
            </div>

            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              <FileUpload label="Vəsiqə ön" />
              <FileUpload label="Vəsiqə arxa" />
              <FileUpload label="Selfie" />
            </div>

            <label className="flex gap-2 text-xs text-muted-foreground mt-5">
              <input type="checkbox" className="accent-primary mt-0.5" />
              <span>Bütün məlumatların doğru olduğunu təsdiq edirəm</span>
            </label>

            <button className="mt-6 w-full h-12 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.005] transition">
              Müraciət göndər
            </button>

            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Sənin məlumatların şifrələnir və yalnız yoxlama üçün istifadə olunur
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <input {...props} className="w-full h-11 px-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function FileUpload({ label }: { label: string }) {
  return (
    <label className="cursor-pointer flex flex-col items-center justify-center h-28 rounded-xl border border-dashed border-border bg-background hover:border-primary hover:bg-surface transition text-center px-2">
      <Upload className="h-5 w-5 text-neon mb-1.5" />
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground">PNG, JPG · max 5MB</span>
      <input type="file" className="hidden" accept="image/*" />
    </label>
  );
}
