import { Link } from "@tanstack/react-router";
import { TrendingUp, Wallet, ShieldCheck } from "lucide-react";

export function SellerCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card-gradient p-10 lg:p-16 card-shadow">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-neon/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-semibold tracking-[0.2em] text-neon uppercase">Satıcılar üçün</span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 leading-tight">
              Gaming məhsullarını <br /><span className="text-gradient">sat və qazan</span>
            </h2>
            <p className="mt-5 text-muted-foreground text-lg max-w-md">
              Minlərlə alıcı səni gözləyir. Sadəcə doğrula, məhsulunu əlavə et və qazanmağa başla.
            </p>
            <Link
              to="/seller"
              className="inline-flex mt-8 h-12 items-center px-6 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.02] transition"
            >
              Satıcı müraciəti
            </Link>
          </div>

          <div className="grid gap-4">
            {[
              { icon: TrendingUp, title: "Yüksək qazanc", desc: "Aylıq orta satıcı qazancı 800-2500 AZN" },
              { icon: Wallet, title: "Sürətli ödəniş", desc: "Sifariş tamamlandıqdan 24 saat sonra balansda" },
              { icon: ShieldCheck, title: "Tam qorunma", desc: "Escrow sistemi həm alıcını, həm satıcını qoruyur" },
            ].map((f, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl border border-border bg-background/40 backdrop-blur">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-neon/15 border border-neon/30 shrink-0">
                  <f.icon className="h-5 w-5 text-neon" />
                </div>
                <div>
                  <h4 className="font-semibold">{f.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
