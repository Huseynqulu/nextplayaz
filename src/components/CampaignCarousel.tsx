import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Copy, ChevronLeft, ChevronRight, Gift, Tag, Sparkles, ShieldCheck, Zap, Trophy, Loader2, Gamepad, Key, UserCircle, Star } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  const shouldReduceMotion = useReducedMotion();
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
        type: "campaign" as const
      }));
    }
  });

  const slides: Campaign[] = [
    {
      id: "brand",
      code: "",
      type: "brand",
      badge: t("hero.badge"),
      headline: t("hero.title"),
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
                    <ShieldCheck className="h-4 w-4 text-neon" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t("hero.trustSafeOrder")}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Trophy className="h-4 w-4 text-neon" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t("hero.trustVerifiedSellers")}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Zap className="h-4 w-4 text-neon" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t("hero.trustSupport")}</span>
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
                    <div className="relative w-[420px] h-[360px] hidden md:flex items-center justify-center">
                      {/* Floating Glass Panels */}
                      <motion.div 
                        animate={shouldReduceMotion ? {} : { y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-10 right-10 w-32 h-40 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl z-0"
                      />
                      <motion.div 
                        animate={shouldReduceMotion ? {} : { y: [0, 15, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute bottom-5 left-0 w-40 h-28 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl z-0"
                      />

                      {/* Central Premium Card */}
                      <motion.div 
                        animate={shouldReduceMotion ? {} : { rotateY: [-5, 5, -5], rotateX: [2, -2, 2] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        className="relative w-64 h-40 bg-gradient-to-br from-surface/80 to-background/90 rounded-2xl border border-neon/30 shadow-[0_0_50px_-12px_rgba(0,255,242,0.3)] z-20 flex flex-col p-6 overflow-hidden group/card"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                          <Sparkles className="w-12 h-12 text-neon" />
                        </div>
                        <div className="flex-1">
                          <div className="w-12 h-8 bg-neon/20 rounded border border-neon/30 mb-4" />
                          <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                          <div className="h-4 w-24 bg-white/5 rounded" />
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="text-neon font-mono font-bold tracking-widest">NEXTPLAY</span>
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-neon/40 blur-[2px]" />
                            <div className="w-8 h-8 rounded-full bg-primary/40 blur-[2px]" />
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-neon/5 to-transparent pointer-events-none" />
                      </motion.div>

                      {/* Floating Icons */}
                      <motion.div 
                        animate={shouldReduceMotion ? {} : { y: [-15, 15, -15], x: [-5, 5, -5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-4 left-20 z-30 p-3 bg-surface/90 rounded-xl border border-border shadow-xl"
                      >
                        <Gamepad className="w-8 h-8 text-primary" />
                      </motion.div>

                      <motion.div 
                        animate={shouldReduceMotion ? {} : { y: [10, -10, 10], x: [10, -10, 10] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        className="absolute top-24 -left-6 z-30 p-3 bg-surface/90 rounded-xl border border-border shadow-xl"
                      >
                        <Key className="w-8 h-8 text-neon" />
                      </motion.div>

                      <motion.div 
                        animate={shouldReduceMotion ? {} : { y: [-10, 10, -10], scale: [1, 1.1, 1] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                        className="absolute bottom-10 right-0 z-30 p-3 bg-surface/90 rounded-xl border border-border shadow-xl"
                      >
                        <UserCircle className="w-8 h-8 text-white" />
                      </motion.div>

                      <motion.div 
                        animate={shouldReduceMotion ? {} : { rotate: [0, 360], scale: [1, 1.2, 1] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute -bottom-8 left-32 z-30"
                      >
                        <Star className="w-10 h-10 text-yellow-500 fill-yellow-500/20 blur-[1px]" />
                      </motion.div>
                      
                      {/* Particles/Glow */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-radial-gradient from-neon/10 to-transparent blur-3xl" />
                      </div>
                    </div>
                  ) : current.id === "yeni10" || current.code === "YENI10" ? (
                    <div className="relative w-80 h-80 flex items-center justify-center">
                      <motion.div 
                        animate={shouldReduceMotion ? {} : { scale: [1, 1.05, 1], rotate: [0, 1, 0] }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="w-full h-64 bg-gradient-to-br from-surface to-background rounded-3xl border-2 border-dashed border-neon/40 flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_40px_-15px_rgba(0,255,242,0.5)]"
                      >
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-neon/10 rounded-full blur-2xl" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
                        
                        <Gift className="w-12 h-12 text-neon mb-4" />
                        <span className="text-6xl font-black text-gradient leading-none">10%</span>
                        <div className="mt-4 px-6 py-2 bg-neon/10 border border-neon/30 rounded-full">
                          <span className="text-neon font-mono font-bold tracking-widest text-xl">YENI10</span>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm font-bold uppercase tracking-widest">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          Promo kod
                        </div>
                      </motion.div>
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
