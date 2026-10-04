import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useT, Lang } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Flame, Clock } from "lucide-react";

export function AnnouncementBar() {
  const t = useT();
  const lang = ((typeof document !== "undefined" && document.documentElement.lang) || "az") as Lang;
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  const { data: campaign } = useQuery({
    queryKey: ["announcement-campaign", lang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("active_hero_campaigns" as any)
        .select("*")
        .eq("hero_placement", "announcement")
        .order("hero_priority", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) return null;
      return data as any;
    }
  });

  useEffect(() => {
    if (!campaign?.ends_at || !campaign?.hero_countdown_enabled) {
      setTimeLeft(null);
      return;
    }

    const target = new Date(campaign.ends_at).getTime();
    
    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [campaign?.ends_at, campaign?.hero_countdown_enabled]);

  if (!campaign) return null;

  const headline = campaign[`hero_headline_${lang}`] || campaign.hero_headline_az;

  return (
    <div className="bg-gradient-to-r from-primary/20 via-neon/20 to-primary/20 border-b border-white/5 py-2.5 overflow-hidden">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Flame className="h-4 w-4 text-neon animate-pulse" />
          <span className="text-white/90">{headline}</span>
          {campaign.code && (
            <span className="ml-1 px-2 py-0.5 rounded bg-neon/10 border border-neon/30 text-neon font-mono text-[11px] tracking-wider uppercase">
              {campaign.code}
            </span>
          )}
        </div>

        {timeLeft && (
          <div className="flex items-center gap-3 text-xs font-mono font-bold text-muted-foreground border-l border-white/10 pl-6 hidden sm:flex">
            <Clock className="h-3.5 w-3.5 text-neon/60" />
            <div className="flex gap-2">
              <span className="text-white">{timeLeft.d} {t("hero.promo.countdown.days")}</span>
              <span className="text-white">{timeLeft.h}{t("hero.promo.countdown.hours")}</span>
              <span className="text-white">{timeLeft.m}{t("hero.promo.countdown.mins")}</span>
              <span className="text-white">{timeLeft.s}{t("hero.promo.countdown.secs")}</span>
            </div>
          </div>
        )}

        <Link 
          to={campaign.hero_cta_dest as any}
          className="text-[11px] font-black uppercase tracking-widest text-neon hover:text-white transition-colors"
        >
          {campaign[`hero_cta_${lang}`] || campaign.hero_cta_az}
        </Link>
      </div>
    </div>
  );
}
