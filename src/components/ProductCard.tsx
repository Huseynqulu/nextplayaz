import { Link } from "@tanstack/react-router";
import { Star, Zap, Heart, ShoppingCart, BadgeCheck, Flame } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { Product } from "@/lib/marketplace-data";
import { useFavorites, isRealProductId } from "@/lib/favorites";
import { useAuth } from "@/hooks/use-auth";
import { SellerTierBadge } from "@/components/SellerTierBadge";
import { useCurrency } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { SmartImage } from "@/components/SmartImage";
import { ProductCoverPlaceholder } from "@/components/ProductCoverPlaceholder";
import { PRODUCT_PLACEHOLDER } from "@/lib/products";

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
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const { isFav, toggle } = useFavorites();
  const { user } = useAuth();
  const { add } = useCart();
  const canFav = !!user && isRealProductId(p.id);
  const canCart = isRealProductId(p.id) && p.stock > 0;
  const fav = canFav && isFav(p.id);
  const soldAgo = formatSoldAgo(p.lastSoldAt);

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
        className="group flex gap-3 p-2.5 rounded-xl bg-card-gradient border border-border card-shadow hover:border-primary/60 transition"
      >
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
          {!p.image || p.image === PRODUCT_PLACEHOLDER ? (
            <ProductCoverPlaceholder title={p.title} />
          ) : (
            <SmartImage
              src={p.image}
              alt={p.title}
              width={96}
              widths={[96, 192]}
              wrapperClassName="absolute inset-0"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {p.delivery === "Instant" && (
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-neon/90 text-background flex items-center gap-0.5">
              <Zap className="h-2 w-2" />Anında
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-neon transition">{p.title}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              {p.seller.verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400 fill-sky-500/25 shrink-0" strokeWidth={2.5} />}
              <span className="truncate max-w-[140px]">{p.seller.name}</span>
              <span>·</span>
              <Star className="h-2.5 w-2.5 fill-warning text-warning" />
              <span>{p.rating} ({p.reviews})</span>
              <span>·</span>
              <span>{p.platform}</span>
            </div>
            {soldAgo && (
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-orange-400">
                <Flame className="h-3 w-3" />
                <span>{soldAgo}</span>
              </div>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg font-bold text-gradient leading-none">{format(p.price)}</span>
              {p.oldPrice && <span className="text-[11px] text-muted-foreground line-through">{format(p.oldPrice)}</span>}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.stock} stok</span>
          </div>
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
      <div className="relative aspect-[4/5] overflow-hidden">
        <SmartImage
          src={p.image}
          alt={p.title}
          width={isCompact ? 220 : 360}
          widths={isCompact ? [220, 440] : [320, 480, 720]}
          sizes={isCompact ? "(max-width: 768px) 45vw, 220px" : "(max-width: 768px) 50vw, 25vw"}
          wrapperClassName="absolute inset-0"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        {p.tag && (
          <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider
            ${p.tag === "HOT" ? "bg-destructive text-destructive-foreground" :
              p.tag === "NEW" ? "bg-success text-background" :
              p.tag === "TOP" ? "bg-warning text-background" :
              "bg-neon text-background"}`}>
            {p.tag}
          </span>
        )}
        {discount > 0 && !p.tag && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive text-destructive-foreground">
            -{discount}%
          </span>
        )}

        {canFav && (
          <button
            type="button"
            aria-label={fav ? "İstək siyahısından çıxar" : "İstək siyahısına əlavə et"}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(p.id); }}
            className={`absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-md backdrop-blur transition ${
              fav ? "bg-destructive/90 text-destructive-foreground" : "bg-background/70 hover:bg-background text-foreground"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${fav ? "fill-current" : ""}`} />
          </button>
        )}

        <div className="absolute bottom-2 left-2 flex gap-1">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-0.5 backdrop-blur border ${
            p.delivery === "Instant" ? "bg-neon/20 border-neon/40 text-neon" : "bg-background/70 border-border"
          }`}>
            {p.delivery === "Instant" && <Zap className="h-2 w-2" />}
            {p.delivery === "Instant" ? "Anında" : "Əllə"}
          </span>
        </div>

        {p.seller.verified && (
          <div className="absolute bottom-2 right-2">
            <VerifiedBadge verified={p.seller.verified} variant="floating" size={11} label="Doğrulanmış" />
          </div>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${isCompact ? "p-2.5 gap-1.5" : "p-3 gap-2"}`}>
        <h3 className={`font-display font-semibold ${isCompact ? "text-xs" : "text-sm"} leading-snug line-clamp-2 group-hover:text-neon transition`}>
          {p.title}
        </h3>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
          {p.seller.verified && <BadgeCheck className="h-3 w-3 text-sky-400 fill-sky-500/25 shrink-0" strokeWidth={2.5} />}
          <span className="truncate max-w-[90px]">{p.seller.name}</span>
          <span>·</span>
          <Star className="h-2.5 w-2.5 fill-warning text-warning" />
          <span>{p.rating}</span>
        </div>

        {soldAgo && (
          <div className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/25 rounded px-1.5 py-0.5 self-start animate-pulse">
            <Flame className="h-3 w-3" />
            <span>{soldAgo}</span>
          </div>
        )}


        <div className="flex items-end justify-between mt-auto pt-1">
          <div className="flex flex-col">
            {p.oldPrice && (
              <span className="text-[10px] text-muted-foreground line-through">{format(p.oldPrice)}</span>
            )}
            <span className={`font-display ${isCompact ? "text-sm" : "text-base"} font-bold text-gradient leading-none`}>
              {format(p.price)}
            </span>
          </div>
          {canCart && (
            <button
              type="button"
              onClick={addToCart}
              aria-label="Səbətə əlavə et"
              className="grid h-7 w-7 place-items-center rounded-md bg-neon/15 hover:bg-neon hover:text-background text-neon transition"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
