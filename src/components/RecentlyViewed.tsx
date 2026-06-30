import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { clearRecent, fetchProductsByIds, getRecentIds } from "@/lib/recently-viewed";
import type { Product } from "@/lib/marketplace-data";

export function RecentlyViewed({ excludeId, title = "Son baxdıqlarınız" }: { excludeId?: string; title?: string }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const ids = getRecentIds().filter((id) => id !== excludeId);
      if (!ids.length) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      const products = await fetchProductsByIds(ids);
      if (!cancelled) {
        setItems(products);
        setLoading(false);
      }
    }
    load();
    function onUpdate() {
      load();
    }
    window.addEventListener("nextplay:recent-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("nextplay:recent-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [excludeId]);

  function scrollBy(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  }

  if (loading || items.length === 0) return null;

  return (
    <section className="mt-14">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neon/10 ring-1 ring-neon/30">
            <Clock className="h-4 w-4 text-neon" />
          </div>
          <h2 className="truncate font-display text-xl font-bold sm:text-2xl">{title}</h2>
          <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
            {items.length}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => {
              clearRecent();
              setItems([]);
            }}
            title="Təmizlə"
            aria-label="Təmizlə"
            className="hidden h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-muted-foreground transition hover:bg-white/5 hover:text-foreground sm:inline-flex"
          >
            <X className="h-3.5 w-3.5" />
            Təmizlə
          </button>
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Sola"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Sağa"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((p) => (
          <div key={p.id} className="w-[180px] shrink-0 snap-start sm:w-[220px]">
            <ProductCard p={p} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  );
}
