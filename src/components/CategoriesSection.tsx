import { Link } from "@tanstack/react-router";
import { Gamepad2, KeyRound, UserCircle2, Sparkles, ArrowUpRight } from "lucide-react";

const cats = [
  { id: "Games", label: "Oyunlar", desc: "PC, PlayStation, Xbox", icon: Gamepad2, count: "1,200+" },
  { id: "Accounts", label: "Hesablar", desc: "Premium gaming hesabları", icon: UserCircle2, count: "850+" },
  { id: "Keys", label: "Açarlar", desc: "Steam, EA, Battle.net", icon: KeyRound, count: "3,400+" },
  { id: "Services", label: "Xidmətlər", desc: "Boost, coaching, dəstək", icon: Sparkles, count: "200+" },
];

export function CategoriesSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Populyar kateqoriyalar</h2>
          <p className="mt-2 text-muted-foreground">Bütün gaming ehtiyaclarınız bir yerdə</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cats.map((c, i) => (
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
            <p className="text-xs text-neon font-semibold mt-3">{c.count} məhsul</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
