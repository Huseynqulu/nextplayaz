import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import psLogo from "@/assets/playstation-logo.png";
import gtaHero from "@/assets/gta-vi-hero.webp";
import gtaCollage from "@/assets/gta-vi-collage.jpg";
import { useT } from "@/lib/i18n";

export function GiftCardPromo() {
  const t = useT();
  return (
    <section className="container py-8 sm:py-10 lg:py-12">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium mb-2">
            <Sparkles className="h-3 w-3" /> {t("home.gift.kicker")}
          </div>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight">
            {t("home.gift.title")}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            {t("home.gift.sub")}
          </p>
        </div>
        <Link
          to="/gift-cards"
          className="text-xs sm:text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          {t("home.gift.all")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/gift-cards/$platform"
          params={{ platform: "playstation" }}
          className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-blue-950 via-blue-700 to-cyan-500 p-4 sm:p-6 min-h-[160px] sm:min-h-[200px] flex flex-col justify-between transition-transform hover:scale-[1.01]"
        >
          <div className="absolute -right-8 -bottom-8 opacity-30 group-hover:opacity-50 transition-opacity">
            <img src={psLogo} alt="PlayStation" width={240} height={240} loading="lazy" className="w-52 h-52 object-contain" />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur text-white text-[10px] font-medium mb-2">
              <Zap className="h-2.5 w-2.5" /> {t("home.gift.instant")}
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight">
              {t("home.gift.psTitle1")}
              <br />
              <span className="text-white/90">{t("home.gift.psTitle2")}</span>
            </h3>
            <p className="text-white/80 mt-1.5 max-w-xs text-xs sm:text-sm">
              {t("home.gift.psSub")}
            </p>
          </div>
          <div className="relative z-10 inline-flex items-center gap-1.5 text-white font-medium text-sm">
            {t("home.gift.psCta")} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/marketplace"
          search={{ q: "GTA" } as never}
          className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 sm:p-6 min-h-[160px] sm:min-h-[200px] flex flex-col justify-between transition-transform hover:scale-[1.01]"
        >
          <img src={gtaHero} alt="GTA VI" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-background/10" />
          <div className="absolute right-3 bottom-3 hidden sm:block overflow-hidden rounded-xl border border-white/20 shadow-2xl max-w-[160px] rotate-2 group-hover:rotate-0 transition-transform">
            <img src={gtaCollage} alt="GTA VI" loading="lazy" className="h-20 w-full object-cover" />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur text-white text-[10px] font-medium mb-2">
              <Sparkles className="h-2.5 w-2.5" /> {t("home.gift.gtaBadge")}
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight">
              {t("home.gift.gtaTitle1")}
              <br />
              <span className="text-white/90">{t("home.gift.gtaTitle2")}</span>
            </h3>
            <p className="text-white/80 mt-1.5 max-w-xs text-xs sm:text-sm">
              {t("home.gift.gtaSub")}
            </p>
          </div>
          <div className="relative z-10 inline-flex items-center gap-1.5 text-white font-medium text-sm">
            {t("home.gift.gtaCta")} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </section>
  );
}
