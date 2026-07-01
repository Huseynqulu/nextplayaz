import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { useT } from "@/lib/i18n";
import forzaHorizon6Cover from "@/assets/forza-horizon-6.jpg";

type Game = {
  title: string;
  tag: string;
  appid: number;
  query: string;
};

// Official Steam CDN cover art (library_600x900). Public, stable URLs.
const GAMES: Game[] = [
  { title: "GTA V", tag: "Online hesab", appid: 271590, query: "GTA" },
  { title: "Forza Horizon 6", tag: "Steam açar", appid: 0, query: "Forza", cover: forzaHorizon6Cover },
  { title: "Cyberpunk 2077", tag: "Phantom Liberty", appid: 1091500, query: "Cyberpunk" },
  { title: "Red Dead Redemption 2", tag: "Ultimate", appid: 1174180, query: "Red Dead" },
  { title: "EA SPORTS FC 26", tag: "Ultimate Team", appid: 2669320, query: "FC 26" },
  { title: "Elden Ring", tag: "Shadow of the Erdtree", appid: 1245620, query: "Elden Ring" },
  { title: "Counter-Strike 2", tag: "Prime hesab", appid: 730, query: "CS2" },
  { title: "Baldur's Gate 3", tag: "Deluxe Edition", appid: 1086940, query: "Baldur" },
  { title: "Valorant", tag: "Hesab + skinlər", appid: 0, query: "Valorant" },
  { title: "PUBG: BATTLEGROUNDS", tag: "UC & hesablar", appid: 578080, query: "PUBG" },
];

function coverUrl(g: Game) {
  if (g.appid > 0) {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`;
  }
  // Valorant fallback — Riot's public press image
  return "https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt2a99c61c8b770acd/65d6b96f7e0aac1043f24229/Valorant_2024_E8A1_PlayVALORANT_ContentStackThumbnail_1200x625_MB01.png";
}

export function FeaturedGames() {
  const t = useT();
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-10 sm:py-14 lg:py-16 lg:py-20">
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon/40 bg-neon/10 text-xs font-semibold text-neon mb-3">
            <Flame className="h-3.5 w-3.5" /> {t("home.featTrend")}
          </div>
          <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold">{t("home.featTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("home.featSub")}</p>
        </div>
        <Link to="/marketplace" className="hidden sm:inline text-sm text-neon hover:underline">
          {t("home.viewAll")} →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {GAMES.map((g, i) => (
          <Link
            key={g.title}
            to="/marketplace"
            search={{ q: g.query }}
            className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-border bg-surface card-shadow hover:border-neon/60 transition-all hover:-translate-y-1"
            style={{ animation: `rise 0.5s ${i * 0.05}s both` }}
          >
            <img
              src={coverUrl(g)}
              alt={g.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="text-[10px] uppercase tracking-wider text-neon font-bold mb-0.5">
                {g.tag}
              </div>
              <div className="font-display text-sm font-bold leading-tight drop-shadow">
                {g.title}
              </div>
            </div>
            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_currentColor]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
