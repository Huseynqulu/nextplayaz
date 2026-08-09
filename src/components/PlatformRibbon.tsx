import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useT, Lang } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Gamepad, Key, Gift, CreditCard, Monitor, Layout, MonitorPlay, Zap } from "lucide-react";

export function PlatformRibbon() {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = [
    { label: t("hero.ribbon.playstation"), icon: MonitorPlay, color: "hover:text-[#0070d1]", filter: "platform=PlayStation" },
    { label: t("hero.ribbon.xbox"), icon: Layout, color: "hover:text-[#107c10]", filter: "platform=Xbox" },
    { label: t("hero.ribbon.steam"), icon: Gamepad, color: "hover:text-[#00adee]", filter: "platform=Steam" },
    { label: t("hero.ribbon.epic"), icon: Zap, color: "hover:text-white", filter: "platform=Epic Games" },
    { label: t("hero.ribbon.ea"), icon: Key, color: "hover:text-[#ff4747]", filter: "platform=EA" },
    { label: t("hero.ribbon.pc"), icon: Monitor, color: "hover:text-neon", filter: "platform=PC" },
    { label: t("hero.ribbon.keys"), icon: Key, color: "hover:text-yellow-500", filter: "category=Keys" },
    { label: t("hero.ribbon.subs"), icon: CreditCard, color: "hover:text-primary", filter: "category=Subscriptions" },
  ];

  return (
    <div className="border-b border-white/5 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div 
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {items.map((item, i) => (
            <Link
              key={i}
              to="/marketplace"
              search={{ 
                platform: item.filter.startsWith('platform=') ? item.filter.split('=')[1] : undefined,
                category: item.filter.startsWith('category=') ? item.filter.split('=')[1] : undefined
              } as any}
              className={`flex-none flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-muted-foreground transition-all hover:bg-white/5 whitespace-nowrap ${item.color}`}
            >
              <item.icon className="h-4 w-4 opacity-70" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
