import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  bg_color: string | null;
  text_color: string | null;
};

export function BannerCarousel() {
  const [items, setItems] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    supabase.from("banners")
      .select("id,title,subtitle,image_url,link_url,bg_color,text_color")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setItems(data ?? []));
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const b = items[idx];
  const inner = (
    <div
      className="relative overflow-hidden rounded-2xl border border-border card-shadow min-h-[140px] sm:min-h-[180px] flex items-center px-6 sm:px-10 py-6"
      style={{ background: b.image_url ? `linear-gradient(90deg, ${b.bg_color || "#0a0a0a"}cc, ${b.bg_color || "#0a0a0a"}77), url(${b.image_url}) center/cover` : (b.bg_color || "#0a0a0a"), color: b.text_color || "#fff" }}
    >
      <div className="flex-1">
        <h3 className="font-display text-xl sm:text-3xl font-bold leading-tight">{b.title}</h3>
        {b.subtitle && <p className="mt-2 text-sm sm:text-base opacity-90 max-w-2xl">{b.subtitle}</p>}
      </div>
      {items.length > 1 && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
          {items.map((_, i) => (
            <button key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx(i); }}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} aria-label={`Banner ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
      <div className="relative group">
        {b.link_url ? (
          b.link_url.startsWith("http")
            ? <a href={b.link_url} target="_blank" rel="noreferrer">{inner}</a>
            : <Link to={b.link_url}>{inner}</Link>
        ) : inner}
        {items.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + items.length) % items.length)}
              className="hidden sm:grid absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 place-items-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition" aria-label="Prev">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setIdx(i => (i + 1) % items.length)}
              className="hidden sm:grid absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 place-items-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition" aria-label="Next">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
