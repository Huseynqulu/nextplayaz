import { Link } from "@tanstack/react-router";
import { Star, Zap, Heart, ShoppingCart, BadgeCheck, Flame } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { Product } from "@/lib/marketplace-data";
import { useFavorites, isRealProductId } from "@/lib/favorites";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

function formatSoldAgo(iso?: string | null): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return null;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "indicə satıldı";
  if (mins < 60) return `${mins} dəq əvvəl satıldı`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat əvvəl satıldı`;
  const days = Math.floor(hours / 24);
  if (days <= 14) return `${days} gün əvvəl satıldı`;
  return null;
}

export function ProductCard({ p, variant = "default" }: { p: Product; variant?: "default" | "compact" | "list" }) {
  const { format } = useCurrency();
  const t = useT();
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const { isFav, toggle } = useFavorites();
  const { user } = useAuth();
  const { add } = useCart();
  const canFav = !!user && isRealProductId(p.id);
  const canCart = isRealProductId(p.id) && p.stock > 0;
  const fav = canFav && isFav(p.id);
  const soldAgo = formatSoldAgo(p.lastSoldAt);
  const sellerRating = Number(p.seller.rating || p.rating || 0);
  const sellerReviews = p.seller.reviewsCount ?? p.reviews ?? 0;
  const sellerRatingText = sellerRating > 0 ? (Number.isInteger(sellerRating) ? String(sellerRating) : sellerRating.toFixed(1)) : null;

  function addToCart(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    add({ id: p.id, slug: p.slug, title: p.title, image: p.image, price: p.price, sellerName: p.seller.name, stock: p.stock });
    toast.success("Səbətə əlavə edildi");
  }

  if (variant === "list") {
    return (
      <Link
        to="/product/$slug"
        params={{ slug: p.slug }}
        className="group flex items-center gap-3 p-3 rounded-xl bg-card-gradient border border-border card-shadow hover:border-primary/60 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 break-words group-hover:text-neon transition">{p.title}</h3>
            {p.delivery === "Instant" && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neon/15 text-neon border border-neon/30 inline-flex items-center gap-0.5">
                <Zap className="h-2.5 w-2.5" />Anında
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground flex-wrap">
            {p.seller.verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400 fill-sky-500/25 shrink-0" strokeWidth={2.5} />}
            <span className="truncate max-w-[140px]">{p.seller.name}</span>
            <span>·</span>
            {sellerRating > 0 && (
              <>
                <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                <span>{sellerRatingText} ({sellerReviews})</span>
              </>
            )}
            <span>·</span>
            <span>{p.platform}</span>
            {soldAgo && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-orange-400"><Flame className="h-3 w-3" />{soldAgo}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold text-gradient leading-none">{format(p.price)}</span>
            {p.oldPrice && <span className="text-[11px] text-muted-foreground line-through">{format(p.oldPrice)}</span>}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.stock} stok</span>
        </div>
      </Link>
    );
  }

  const isCompact = variant === "compact";
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-card-gradient border border-border card-shadow hover:border-primary/60 transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className={`flex flex-1 flex-col ${isCompact ? "p-3 gap-2" : "p-4 gap-2.5"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-1 flex-wrap">
            {p.tag && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider
                ${p.tag === "HOT" ? "bg-destructive text-destructive-foreground" :
                  p.tag === "NEW" ? "bg-success text-background" :
                  p.tag === "TOP" ? "bg-warning text-background" :
                  "bg-neon text-background"}`}>
                {p.tag}
              </span>
            )}
            {discount > 0 && !p.tag && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive text-destructive-foreground">
                -{discount}%
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-0.5 border ${
              p.delivery === "Instant" ? "bg-neon/15 border-neon/30 text-neon" : "bg-surface border-border text-muted-foreground"
            }`}>
              {p.delivery === "Instant" && <Zap className="h-2 w-2" />}
              {p.delivery === "Instant" ? t("product.delivery.instant") : t("product.delivery.manual")}
            </span>
          </div>
          {canFav && (
            <button
              type="button"
              aria-label={fav ? "İstək siyahısından çıxar" : "İstək siyahısına əlavə et"}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(p.id); }}
              className={`grid h-7 w-7 place-items-center rounded-md transition ${
                fav ? "bg-destructive/90 text-destructive-foreground" : "bg-surface hover:bg-background text-foreground"
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${fav ? "fill-current" : ""}`} />
            </button>
          )}
        </div>

        <h3 className={`font-display font-semibold ${isCompact ? "text-sm" : "text-base"} leading-snug line-clamp-2 group-hover:text-neon transition`}>
          {p.title}
        </h3>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
          {p.seller.verified && <BadgeCheck className="h-3 w-3 text-sky-400 fill-sky-500/25 shrink-0" strokeWidth={2.5} />}
          <span className="truncate max-w-[110px]">{p.seller.name}</span>
          <span>·</span>
          {sellerRating > 0 && (
            <>
              <Star className="h-2.5 w-2.5 fill-warning text-warning" />
              <span>{sellerRatingText} ({sellerReviews})</span>
            </>
          )}
          <span>·</span>
          <span className="truncate">{p.platform}</span>
        </div>

        {soldAgo && (
          <div className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/25 rounded px-1.5 py-0.5 self-start">
            <Flame className="h-3 w-3" />
            <span>{soldAgo}</span>
          </div>
        )}

        {sellerRating > 0 ? (
          <div className="flex items-center gap-1 text-[11px] bg-warning/10 border border-warning/25 rounded px-1.5 py-1 self-start">
            <Star className="h-3 w-3 fill-warning text-warning" />
            <span className="font-bold text-warning">{sellerRatingText}</span>
            <span className="text-muted-foreground">/ 5 · {sellerReviews} {t("product.reviews")}</span>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground italic px-0.5">
            {t("product.noReviews")}
          </div>
        )}


        <div className="flex items-end justify-between mt-auto pt-1">
          <div className="flex flex-col">
            {p.oldPrice && (
              <span className="text-[10px] text-muted-foreground line-through">{format(p.oldPrice)}</span>
            )}
            <span className={`font-display ${isCompact ? "text-base" : "text-lg"} font-bold text-gradient leading-none`}>
              {format(p.price)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{p.stock} stok</span>
          </div>
          {canCart && (
            <button
              type="button"
              onClick={addToCart}
              aria-label="Səbətə əlavə et"
              className="grid h-8 w-8 place-items-center rounded-md bg-neon/15 hover:bg-neon hover:text-background text-neon transition"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
