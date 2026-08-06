import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Copy, ChevronLeft, ChevronRight, Gift, Tag, Sparkles, ShieldCheck, Zap, Trophy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useT, Lang } from "@/lib/i18n";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type Campaign = {
  id: string;
  code: string;
  badge: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaDest: string;
  imageUrl: string | null;
  theme: string;
  type: "brand" | "campaign" | "deals";
};

export function CampaignCarousel() {
  const t = useT();
  const [idx, setIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const lang = (document.documentElement.lang || "az") as Lang;

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["hero-campaigns", lang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("active_hero_campaigns" as any)
        .select("*")
        .order("hero_priority", { ascending: false });
      
      if (error) return [];
      
      return (data as any[]).map(c => ({
        id: c.id,
        code: c.code,
        badge: c[`hero_badge_${lang}`] || c.hero_badge_az,
        headline: c[`hero_headline_${lang}`] || c.hero_headline_az,
        description: c[`hero_description_${lang}`] || c.hero_description_az,
        ctaLabel: c[`hero_cta_${lang}`] || c.hero_cta_az,
        ctaDest: c.hero_cta_dest,
        imageUrl: c.hero_image_url,
        theme: c.hero_theme,
        type: "campaign"
      }));
    }
  });

  const slides: Campaign[] = [
    {
      id: "brand",
      code: "",
      type: "brand",
      badge: t("hero.badge"),
      headline: t("hero.title1") + " " + t("hero.title2"),
      description: t("hero.sub"),
      ctaLabel: t("hero.cta1"),
      ctaDest: "/marketplace",
      imageUrl: null,
      theme: "cyan"
    },
    ...campaigns
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
    <section 
      className="relative w-full h-[580px] sm:h-[620px] overflow-hidden bg-hero group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 flex items-center"
        >
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 z-10">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-surface/40 backdrop-blur text-xs font-bold uppercase tracking-wider ${
                  current.theme === "cyan" ? "border-neon/40 text-neon" : "border-primary/40 text-primary"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${current.theme === "cyan" ? "bg-neon" : "bg-primary"}`} />
                {current.badge}
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]"
              >
                {current.headline.split(' ').map((word, i) => (
                   <span key={i} className={i >= current.headline.split(' ').length - 2 ? "text-gradient" : ""}>
                     {word}{" "}
                   </span>
                ))}
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-lg sm:text-xl max-w-xl leading-relaxed"
              >
                {current.description}
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-4 items-center"
              >
                <Link 
                  to={current.ctaDest as any} 
                  className={`h-12 px-8 rounded-xl font-bold flex items-center gap-2 transition neon-ring hover:scale-[1.02] ${
                    current.theme === "cyan" ? "bg-neon text-background" : "bg-primary text-white"
                  }`}
                >
                  {current.ctaLabel} <ArrowRight className="h-4 w-4" />
                </Link>
                
                {current.type === "brand" ? (
                  <Link to="/seller" className="h-12 px-8 rounded-xl border border-border bg-surface/60 backdrop-blur font-bold flex items-center hover:bg-surface transition">
                    {t("hero.cta2")}
                  </Link>
                ) : current.code ? (
                  <button 
                    onClick={() => copyCode(current.code)}
                    className="h-12 px-6 rounded-xl border border-dashed border-neon/50 bg-neon/10 font-mono font-bold flex items-center gap-3 hover:bg-neon/20 transition group/code"
                  >
                    <span className="text-neon">{current.code}</span>
                    <Copy className={`h-4 w-4 text-neon transition-transform ${copied ? "scale-125" : "group-hover/code:scale-110"}`} />
                  </button>
                ) : null}
              </motion.div>

              {current.type === "brand" && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="pt-8 grid grid-cols-3 gap-6 max-w-lg border-t border-border/50"
                >
                  <div className="flex flex-col gap-1">
                    <Trophy className="h-4 w-4 text-neon" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t("hero.trust1")}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <ShieldCheck className="h-4 w-4 text-neon" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t("hero.trust2")}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Zap className="h-4 w-4 text-neon" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t("hero.trust3")}</span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="hidden md:flex justify-end items-center h-full relative">
              <div className={`absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 animate-pulse ${
                current.theme === "cyan" ? "bg-neon" : "bg-primary"
              }`} />
              
              <AnimatePresence mode="wait">
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotate: 5 }}
                  className="relative z-10"
                >
                  {current.imageUrl ? (
                    <img src={current.imageUrl} alt="" className="w-full max-w-md rounded-2xl shadow-2xl border border-white/10" />
                  ) : current.type === "brand" ? (
                    <div className="relative w-80 h-80 grid place-items-center">
                       <Sparkles className="w-full h-full text-neon opacity-20 absolute animate-slow-spin" />
                       <div className="w-48 h-48 rounded-3xl bg-card-gradient border border-neon/30 flex items-center justify-center rotate-12 neon-ring">
                          <Gift className="w-20 h-20 text-neon" />
                       </div>
                    </div>
                  ) : (
                    <div className="w-80 h-80 rounded-2xl bg-card-gradient border border-border p-8 flex flex-col justify-center gap-4">
                       <div className="h-4 w-3/4 bg-surface rounded" />
                       <div className="h-12 w-full bg-neon/20 rounded-lg border border-neon/30" />
                       <div className="h-4 w-1/2 bg-surface rounded" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 transition-all rounded-full ${i === idx ? "w-8 bg-neon" : "w-2 bg-white/20 hover:bg-white/40"}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          
          <button 
            onClick={() => setIdx(i => (i - 1 + slides.length) % slides.length)} 
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-surface/20 hover:bg-surface/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex border border-white/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setIdx(i => (i + 1) % slides.length)} 
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-surface/20 hover:bg-surface/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex border border-white/5"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </section>
  );
}
