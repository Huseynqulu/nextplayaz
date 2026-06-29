import { Link } from "@tanstack/react-router";
import { Star, Zap, ShieldCheck, Heart, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/marketplace-data";
import { useFavorites, isRealProductId } from "@/lib/favorites";
import { useAuth } from "@/hooks/use-auth";
import { SellerTierBadge } from "@/components/SellerTierBadge";
import { useCurrency } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export function ProductCard({ p }: { p: Product }) {
  const { format } = useCurrency();
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const { isFav, toggle } = useFavorites();
  const { user } = useAuth();
  const { add } = useCart();
  const canFav = !!user && isRealProductId(p.id);
  const canCart = isRealProductId(p.id) && p.stock > 0;
  const fav = canFav && isFav(p.id);

  function addToCart(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    add({ id: p.id, slug: p.slug, title: p.title, image: p.image, price: p.price, sellerName: p.seller.name, stock: p.stock });
    toast.success("Səbətə əlavə edildi");
  }

  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-card-gradient border border-border card-shadow hover:border-primary/60 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={p.image}
          alt={p.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        {p.tag && (
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider
            ${p.tag === "HOT" ? "bg-destructive text-destructive-foreground" :
              p.tag === "NEW" ? "bg-success text-background" :
              p.tag === "TOP" ? "bg-warning text-background" :
              "bg-neon text-background"}`}>
            {p.tag}
          </span>
        )}
        {discount > 0 && !p.tag && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold bg-destructive text-destructive-foreground">
            -{discount}%
          </span>
        )}

        {canFav && (
          <button
            type="button"
            aria-label={fav ? "İstək siyahısından çıxar" : "İstək siyahısına əlavə et"}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(p.id); }}
            className={`absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-md backdrop-blur transition ${
              fav ? "bg-destructive/90 text-destructive-foreground" : "bg-background/70 hover:bg-background text-foreground"
            }`}
          >
            <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
          </button>
        )}

        <div className={`absolute ${canFav ? "top-12" : "top-3"} right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-background/70 backdrop-blur text-[11px]`}>
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span className="font-semibold">{p.rating}</span>
          <span className="text-muted-foreground">({p.reviews})</span>
        </div>


        <div className="absolute bottom-3 left-3 flex gap-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-background/70 backdrop-blur border border-border">
            {p.platform}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 backdrop-blur border ${
            p.delivery === "Instant" ? "bg-neon/20 border-neon/40 text-neon" : "bg-background/70 border-border"
          }`}>
            {p.delivery === "Instant" && <Zap className="h-2.5 w-2.5" />}
            {p.delivery}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 gap-3">
        <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2 group-hover:text-neon transition">
          {p.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          {p.seller.verified && <ShieldCheck className="h-3.5 w-3.5 text-neon" />}
          <span className="truncate">{p.seller.name}</span>
          <span>·</span>
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span>{p.seller.rating}</span>
          {(p as any).sellerId && <SellerTierBadge sellerId={(p as any).sellerId} />}
        </div>

        <div className="flex items-end justify-between mt-auto pt-2">
          <div className="flex flex-col">
            {p.oldPrice && (
              <span className="text-xs text-muted-foreground line-through">{format(p.oldPrice)}</span>
            )}
            <span className="font-display text-xl font-bold text-gradient leading-none">
              {format(p.price)}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {p.stock} stok
          </span>
        </div>
      </div>
    </Link>
  );
}
