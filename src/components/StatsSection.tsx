import { useEffect, useState } from "react";
import { Users, Package, ShoppingBag, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

type Stats = { users: number; sellers: number; products: number; orders: number };

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setVal(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function Stat({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  const v = useCountUp(value);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card-gradient p-6 card-shadow text-center group hover:border-neon/60 transition">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-neon opacity-0 blur-3xl group-hover:opacity-20 transition" />
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-neon/15 border border-neon/30 mb-4">
        <Icon className="h-6 w-6 text-neon" />
      </div>
      <div className="font-display text-xl sm:text-3xl lg:text-4xl font-bold text-gradient">
        {v.toLocaleString("az-AZ")}+
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function StatsSection() {
  const t = useT();
  const [stats, setStats] = useState<Stats>({ users: 0, sellers: 0, products: 0, orders: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_homepage_stats");
      if (data) setStats(data as unknown as Stats);
    })();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      <div className="text-center mb-10">
        <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold">{t("home.statsTitle")}</h2>
        <p className="mt-2 text-muted-foreground">{t("home.statsSub")}</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} value={Math.max(stats.users, 1)} label={t("home.stat.users")} />
        <Stat icon={Store} value={Math.max(stats.sellers, 1)} label={t("home.stat.sellers")} />
        <Stat icon={Package} value={Math.max(stats.products, 1)} label={t("home.stat.products")} />
        <Stat icon={ShoppingBag} value={Math.max(stats.orders, 1)} label={t("home.stat.orders")} />
      </div>
    </section>
  );
}
