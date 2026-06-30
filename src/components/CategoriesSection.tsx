import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gamepad2, KeyRound, UserCircle2, Sparkles, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT, useI18n } from "@/lib/i18n";

export function CategoriesSection() {
  const t = useT();
  const { lang } = useI18n();
  const cats = [
    { id: "Games", label: t("home.cat.games"), desc: t("home.cat.games.desc"), icon: Gamepad2 },
    { id: "Accounts", label: t("home.cat.accounts"), desc: t("home.cat.accounts.desc"), icon: UserCircle2 },
    { id: "Keys", label: t("home.cat.keys"), desc: t("home.cat.keys.desc"), icon: KeyRound },
    { id: "Services", label: t("home.cat.services"), desc: t("home.cat.services.desc"), icon: Sparkles },
  ];
  const [counts, setCounts] = useState<Record<string, number>>({});
  const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "az-AZ";

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_category_counts");
      if (data) {
        const map: Record<string, number> = {};
        (data as { category: string; count: number }[]).forEach(r => {
          map[r.category] = Number(r.count);
        });
        setCounts(map);
      }
    })();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-10 sm:py-14 lg:py-16 lg:py-20">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold">{t("home.catsTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("home.catsSub")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cats.map((c, i) => {
          const count = counts[c.id] ?? 0;
          return (
            <Link
              key={c.id}
              to="/marketplace"
              search={{ cat: c.id }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card-gradient p-6 card-shadow hover:border-primary/60 transition-all hover:-translate-y-1"
              style={{ animation: `rise 0.6s ${i * 0.08}s both` }}
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-neon opacity-0 blur-3xl group-hover:opacity-20 transition" />
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon/15 border border-neon/30 mb-5 group-hover:bg-neon/25 transition">
                <c.icon className="h-6 w-6 text-neon" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display text-lg font-semibold">{c.label}</h3>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-neon group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
              <p className="text-xs text-neon font-semibold mt-3">{count.toLocaleString(locale)}+ {t("home.cat.productsSuffix")}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
