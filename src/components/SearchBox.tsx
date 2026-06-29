import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/lib/currency";

type Hit = {
  id: string;
  title: string;
  slug: string;
  price: number;
  image_url: string | null;
};

export function SearchBox({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id,title,slug,price,image_url")
        .ilike("title", `%${term}%`)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8)
        .abortSignal(ctrl.signal);
      setHits((data as any) ?? []);
      setLoading(false);
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    setOpen(false);
    navigate({ to: "/marketplace", search: term ? { q: term } : {} });
  }

  const widthCls = variant === "desktop" ? "hidden md:flex flex-1 max-w-md ml-auto" : "flex";

  return (
    <div ref={wrapRef} className={`${widthCls} relative`}>
      <form onSubmit={submit} className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder=""
          aria-label="Axtar"
          className="w-full h-10 pl-10 pr-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
        />
      </form>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 rounded-xl border border-border bg-popover shadow-xl card-shadow overflow-hidden max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Axtarılır...
            </div>
          ) : hits.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nəticə tapılmadı</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 p-2">
                {hits.map((h) => (
                  <Link
                    key={h.id}
                    to="/product/$slug"
                    params={{ slug: h.slug }}
                    onClick={() => { setOpen(false); setQ(""); }}
                    className="flex flex-col rounded-lg border border-border bg-card-gradient p-2 hover:border-neon hover:bg-neon/5 transition"
                  >
                    {h.image_url ? (
                      <img src={h.image_url} alt="" className="h-20 w-full rounded-md object-cover mb-2" />
                    ) : (
                      <div className="h-20 w-full rounded-md bg-surface grid place-items-center mb-2">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-xs font-medium line-clamp-2 mb-1 min-h-[2rem]">{h.title}</p>
                    <span className="text-sm font-bold text-gradient">{format(h.price)}</span>
                  </Link>
                ))}
              </div>
              <button
                onClick={submit as any}
                className="w-full px-4 py-2.5 text-center text-xs font-semibold text-neon hover:bg-surface transition border-t border-border"
              >
                "{q.trim()}" üçün bütün nəticələrə bax →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
