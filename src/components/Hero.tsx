import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Zap, Trophy } from "lucide-react";
import { useT } from "@/lib/i18n";

const HERO_COVERS = [
  271590,   // GTA V
  1551360,  // Forza Horizon 5
  1091500,  // Cyberpunk 2077
  1245620,  // Elden Ring
  1174180,  // Red Dead Redemption 2
  2669320,  // EA FC 25
  1086940,  // Baldur's Gate 3
  730,      // CS2
];

export function Hero() {
  const t = useT();
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -right-20 top-0 bottom-0 w-[60%] grid grid-cols-4 gap-3 opacity-60 rotate-6 scale-110"
          aria-hidden
        >
          {HERO_COVERS.map((id, i) => (
            <img
              key={id}
              src={`https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`}
              alt=""
              loading="eager"
              className="aspect-[2/3] w-full object-cover rounded-xl border border-white/10"
              style={{ transform: `translateY(${i % 2 === 0 ? "-20px" : "20px"})` }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
      </div>


      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
        <div className="max-w-2xl" style={{ animation: "rise 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neon/40 bg-neon/10 text-xs font-medium text-neon mb-6 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse" />
            {t("hero.badge")}
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            {t("hero.title1")} <br />
            <span className="text-gradient">{t("hero.title2")}</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            {t("hero.sub")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/marketplace"
              className="inline-flex h-12 items-center gap-2 px-6 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.02] transition"
            >
              {t("hero.cta1")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/seller"
              className="inline-flex h-12 items-center px-6 rounded-xl border border-border bg-surface/60 backdrop-blur font-semibold hover:border-primary hover:bg-surface transition"
            >
              {t("hero.cta2")}
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg">
            <Stat icon={<Trophy className="h-4 w-4" />} value="5000+" label={t("hero.stat1")} />
            <Stat icon={<ShieldCheck className="h-4 w-4" />} value="100%" label={t("hero.stat2")} />
            <Stat icon={<Zap className="h-4 w-4" />} value="24/7" label={t("hero.stat3")} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="border-l-2 border-neon/40 pl-3">
      <div className="flex items-center gap-1.5 text-neon mb-1">{icon}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}
