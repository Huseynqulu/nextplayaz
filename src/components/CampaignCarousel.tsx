import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Copy, ChevronLeft, ChevronRight, Gift, Tag, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

// Placeholder data structure for campaign
type Campaign = {
  id: string;
  badge: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaDest: string;
  code?: string;
  type: "brand" | "campaign" | "deals";
};

export function CampaignCarousel() {
  const t = useT();
  const [idx, setIdx] = useState(0);
  
  // Default brand slide is always index 0
  const slides: Campaign[] = [
    {
      id: "brand",
      type: "brand",
      badge: "NextPlay Marketplace",
      headline: t("hero.title1") + " " + t("hero.title2"),
      description: t("hero.sub"),
      ctaLabel: t("hero.cta1"),
      ctaDest: "/marketplace"
    }
  ];

  // Logic to fetch active campaigns and weekly deals would go here and populate 'slides'
  // Auto-advance logic
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section className="relative w-full h-[560px] overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 flex items-center"
        >
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <span className="inline-block px-3 py-1 rounded-full bg-neon/10 text-neon text-xs font-bold uppercase tracking-wider border border-neon/20">
                {slides[idx].badge}
              </span>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                {slides[idx].headline}
              </h1>
              <p className="text-muted-foreground text-lg">{slides[idx].description}</p>
              <div className="flex gap-4">
                <Link to={slides[idx].ctaDest as any} className="h-12 px-8 rounded-xl bg-neon text-background font-bold flex items-center gap-2 hover:opacity-90 transition">
                  {slides[idx].ctaLabel} <ArrowRight className="h-4 w-4" />
                </Link>
                {slides[idx].type === "brand" && (
                  <Link to="/seller" className="h-12 px-8 rounded-xl border border-border font-bold flex items-center hover:bg-surface transition">
                    Satıcı ol
                  </Link>
                )}
              </div>
            </div>
            {/* Visual Placeholder */}
            <div className="hidden md:flex justify-center items-center h-full">
              <div className="w-full max-w-md aspect-square rounded-full bg-gradient-to-tr from-neon/20 to-primary/20 animate-pulse" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {slides.length > 1 && (
        <>
          <button onClick={() => setIdx(i => (i - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface/50 hover:bg-surface backdrop-blur">
            <ChevronLeft />
          </button>
          <button onClick={() => setIdx(i => (i + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface/50 hover:bg-surface backdrop-blur">
            <ChevronRight />
          </button>
        </>
      )}
    </section>
  );
}
