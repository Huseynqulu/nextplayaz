import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import psLogo from "@/assets/playstation-logo.png";
import gtaHero from "@/assets/gta-vi-hero.webp.asset.json";
import gtaCollage from "@/assets/gta-vi-collage.jpg.asset.json";

export function GiftCardPromo() {
  return (
    <section className="container py-16">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Tövsiyə olunan
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Oyun dünyana qoşul
          </h2>
          <p className="text-muted-foreground mt-2">
            Ən populyar gift kartlar və oyunlar — anında çatdırılma
          </p>
        </div>
        <Link
          to="/gift-cards"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          Bütün gift kartlar <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PlayStation card */}
        <Link
          to="/gift-cards/$platform"
          params={{ platform: "playstation" }}
          className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-blue-950 via-blue-700 to-cyan-500 p-8 min-h-[280px] flex flex-col justify-between transition-transform hover:scale-[1.01]"
        >
          <div className="absolute -right-10 -bottom-10 opacity-30 group-hover:opacity-50 transition-opacity">
            <img
              src={psLogo}
              alt="PlayStation"
              width={320}
              height={320}
              loading="lazy"
              className="w-72 h-72 object-contain"
            />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-medium mb-4">
              <Zap className="h-3 w-3" /> Anında çatdırılma
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              PlayStation balansını
              <br />
              <span className="text-white/90">indi artır</span>
            </h3>
            <p className="text-white/80 mt-3 max-w-xs">
              PSN cüzdanını doldur, sevimli oyunlarını və əlavələrini al.
            </p>
          </div>
          <div className="relative z-10 inline-flex items-center gap-2 text-white font-medium">
            Kart seç <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* GTA VI card */}
        <Link
          to="/marketplace"
          search={{ q: "GTA" } as never}
          className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 min-h-[280px] flex flex-col justify-between transition-transform hover:scale-[1.01]"
        >
          <img
            src={gtaHero.url}
            alt="GTA VI şəhər görüntüsü"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-background/10" />
          <div className="absolute right-4 bottom-4 hidden sm:block overflow-hidden rounded-xl border border-white/20 shadow-2xl max-w-[210px] rotate-2 group-hover:rotate-0 transition-transform">
            <img
              src={gtaCollage.url}
              alt="GTA VI loqosu və oyun kollajı"
              loading="lazy"
              className="h-28 w-full object-cover"
            />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[11px] font-medium mb-4">
              <Sparkles className="h-3 w-3" /> Yeni nəsil
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              GTA VI oyununu
              <br />
              <span className="text-white/90">özün al</span>
            </h3>
            <p className="text-white/80 mt-3 max-w-xs">
              PlayStation balansını artır, ən sərfəli kartı seç və GTA VI üçün hazır ol.
            </p>
          </div>
          <div className="relative z-10 inline-flex items-center gap-2 text-white font-medium">
            Təkliflərə bax <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </section>
  );
}
