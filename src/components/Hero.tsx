import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Copy, ChevronLeft, ChevronRight, Gift, Tag, Sparkles, ShieldCheck, Zap, Trophy, Loader2, Gamepad, Key, UserCircle, Star, ShoppingCart, Percent } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useT, Lang } from "@/lib/i18n";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnnouncementBar } from "./AnnouncementBar";
import { PlatformRibbon } from "./PlatformRibbon";

type Slide = {
  id: string;
  code?: string;
  badge: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaDest: string;
  imageUrl?: string | null;
  theme: string;
  type: "brand" | "campaign" | "product" | "category" | "deals";
  price?: number;
  oldPrice?: number;
};

export function Hero() {
  const t = useT();
  const [idx, setIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const lang = (document.documentElement.lang || "az") as Lang;

  // 1. Fetch Campaigns (Carousel + Right Cards)
  const { data: allHeroData } = useQuery({
    queryKey: ["hero-campaigns-all", lang],
    queryFn: async () => {
      const { data } = await supabase
        .from("active_hero_campaigns" as any)
        .select("*")
        .order("hero_priority", { ascending: false });
      return (data || []) as any[];
    }
  });

  // 2. Fetch Weekly Deals (Products with old_price > price)
  const { data: weeklyDeals } = useQuery({
    queryKey: ["hero-weekly-deals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, old_price, image_url, category, platform")
        .eq("is_active", true)
        .gt("stock", 0)
        .not("old_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(3);
      
      return (data || []).filter(p => p.old_price && p.old_price > p.price);
    }
  });

  const carouselCampaigns = allHeroData?.filter(c => c.hero_placement === "main_carousel") || [];
  const sideTopCampaign = allHeroData?.find(c => c.hero_placement === "side_top");
  const sideBottomCampaign = allHeroData?.find(c => c.hero_placement === "side_bottom");

  // Construct Carousel Slides
  const slides: Slide[] = [
    {
      id: "default",
      type: "brand",
      badge: t("hero.defaultSlide.badge"),
      headline: t("hero.defaultSlide.title"),
      description: t("hero.defaultSlide.desc"),
      ctaLabel: t("hero.defaultSlide.cta1"),
      ctaDest: "/marketplace",
      theme: "cyan"
    },
    ...carouselCampaigns.map(c => ({
      id: c.id,
      code: c.code,
      badge: c[`hero_badge_${lang}`] || c.hero_badge_az,
      headline: c[`hero_headline_${lang}`] || c.hero_headline_az,
      description: c[`hero_description_${lang}`] || c.hero_description_az,
      ctaLabel: c[`hero_cta_${lang}`] || c.hero_cta_az,
      ctaDest: c.hero_cta_dest,
      imageUrl: c.hero_image_url,
      theme: c.hero_theme,
      type: "campaign" as const
    }))
  ];

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("hero.yeni10.copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const current = slides[idx];

  return (
    <div className="flex flex-col">
      <AnnouncementBar />
      <PlatformRibbon />
      
      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-auto lg:h-[460px]">
            
            {/* Main Carousel - 8/12 (~66%) */}
            <div 
              className="lg:col-span-8 relative rounded-[28px] overflow-hidden bg-hero group h-[380px] lg:h-full"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="absolute inset-0 bg-grid opacity-10" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center p-8 sm:p-12"
                >
                  <div className="z-10 max-w-lg space-y-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-surface/40 backdrop-blur text-[10px] font-black uppercase tracking-wider ${
                      current.theme === "cyan" ? "border-neon/40 text-neon" : "border-primary/40 text-primary"
                    }`}>
                      {current.badge}
                    </div>
                    
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
                      {current.headline}
                    </h1>
                    
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed line-clamp-2">
                      {current.description}
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Link 
                        to={current.ctaDest as any} 
                        className={`h-11 px-7 rounded-xl font-bold flex items-center gap-2 transition hover:scale-[1.02] ${
                          current.theme === "cyan" ? "bg-neon text-background" : "bg-primary text-white"
                        }`}
                      >
                        {current.ctaLabel} <ArrowRight className="h-4 w-4" />
                      </Link>
                      
                      {current.type === "brand" && (
                        <Link to="/seller" className="h-11 px-7 rounded-xl border border-white/10 bg-surface/60 backdrop-blur font-bold flex items-center hover:bg-surface transition">
                          {t("hero.defaultSlide.cta2")}
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Decorative Elements for default slide */}
                  {current.type === "brand" && (
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:flex items-center justify-center opacity-40">
                      <div className="relative w-full h-full">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-neon/10 rounded-full"
                        />
                        <Gamepad className="absolute top-1/4 right-1/4 h-24 w-24 text-neon/20 -rotate-12" />
                        <Star className="absolute bottom-1/4 right-1/3 h-16 w-16 text-primary/20 rotate-12" />
                      </div>
                    </div>
                  )}

                  {current.imageUrl && (
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block">
                      <img src={current.imageUrl} alt="" className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 bg-gradient-to-r from-hero via-transparent to-transparent" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Dots */}
              {slides.length > 1 && (
                <div className="absolute bottom-6 left-8 flex gap-1.5 z-20">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className={`h-1 rounded-full transition-all ${i === idx ? "w-6 bg-neon" : "w-1.5 bg-white/20"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - 4/12 (~33%) */}
            <div className="lg:col-span-4 flex flex-col gap-5 h-auto lg:h-full">
              
              {/* Top Promo Card */}
              <div className="flex-1 rounded-[28px] bg-card-gradient border border-white/5 p-7 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                <div className="z-10 space-y-3">
                  <div className="inline-block px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary">
                    {sideTopCampaign ? (sideTopCampaign[`hero_badge_${lang}`] || sideTopCampaign.hero_badge_az) : t("hero.promo.newMember")}
                  </div>
                  <h3 className="text-xl font-black leading-tight">
                    {sideTopCampaign ? (sideTopCampaign[`hero_headline_${lang}`] || sideTopCampaign.hero_headline_az) : t("hero.defaultSlide.title")}
                  </h3>
                  <p className="text-muted-foreground text-xs font-medium">
                    {sideTopCampaign ? (sideTopCampaign[`hero_description_${lang}`] || sideTopCampaign.hero_description_az) : t("hero.defaultSlide.desc")}
                  </p>
                </div>

                <div className="z-10 pt-4">
                  {sideTopCampaign?.code ? (
                    <button 
                      onClick={() => copyCode(sideTopCampaign.code)}
                      className="h-10 px-5 rounded-xl border border-dashed border-neon/50 bg-neon/5 flex items-center gap-3 hover:bg-neon/10 transition group"
                    >
                      <span className="text-neon font-mono font-bold text-sm tracking-wider">{sideTopCampaign.code}</span>
                      <Copy className="h-3.5 w-3.5 text-neon group-hover:scale-110 transition-transform" />
                    </button>
                  ) : (
                    <Link to="/marketplace" className="h-10 px-6 rounded-xl bg-surface/50 border border-white/10 text-xs font-bold inline-flex items-center hover:bg-surface transition">
                      {t("hero.viewAll")}
                    </Link>
                  )}
                </div>

                <Sparkles className="absolute -bottom-4 -right-4 h-24 w-24 text-primary/5 -rotate-12" />
              </div>

              {/* Bottom Promo Card */}
              <div className="flex-1 rounded-[28px] bg-card-gradient border border-white/5 p-7 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                {weeklyDeals && weeklyDeals.length > 0 ? (
                  <>
                    <div className="z-10 space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neon/10 border border-neon/20 text-[9px] font-black uppercase tracking-widest text-neon">
                        <Percent className="h-3 w-3" /> {t("hero.promo.dealsTitle")}
                      </div>
                      <h3 className="text-xl font-black leading-tight line-clamp-2">
                        {weeklyDeals[0].title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white">{weeklyDeals[0].price} AZN</span>
                        <span className="text-xs text-muted-foreground line-through">{weeklyDeals[0].old_price} AZN</span>
                      </div>
                    </div>
                    <div className="z-10 pt-4">
                      <Link to="/product/$slug" params={{ slug: weeklyDeals[0].id }} className="h-10 px-6 rounded-xl bg-neon text-background text-xs font-black inline-flex items-center hover:scale-105 transition">
                        {t("product.buyNow")}
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="z-10 space-y-3">
                      <div className="inline-block px-2.5 py-1 rounded-lg bg-surface border border-white/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        {t("hero.promo.seller")}
                      </div>
                      <h3 className="text-xl font-black leading-tight">
                        {t("hero.promo.sellerTitle")}
                      </h3>
                      <p className="text-muted-foreground text-xs font-medium">
                        {t("hero.promo.sellerDesc")}
                      </p>
                    </div>
                    <div className="z-10 pt-4">
                      <Link to="/seller" className="h-10 px-6 rounded-xl bg-surface/50 border border-white/10 text-xs font-bold inline-flex items-center hover:bg-surface transition">
                        {t("nav.seller")}
                      </Link>
                    </div>
                  </>
                )}
                
                <Trophy className="absolute -bottom-4 -right-4 h-24 w-24 text-neon/5 rotate-12" />
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
