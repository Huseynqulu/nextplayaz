import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ShoppingCart, Trash2, Tag, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Səbət — NextPlay.az" }] }),
});

function CartPage() {
  const { items, subtotal, setQty, remove, clear } = useCart();
  const { format } = useCurrency();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function checkout() {
    if (!user) { toast.info("Daxil olun"); navigate({ to: "/login" }); return; }
    if (!items.length) return;
    setBusy(true);
    const results: { ok: number; fail: { title: string; msg: string }[] } = { ok: 0, fail: [] };
    for (const it of items) {
      const { error } = await supabase.rpc("create_order", {
        p_product_id: it.id,
        p_quantity: it.qty,
        p_discount_code: code.trim() || null,
      } as any);
      if (error) results.fail.push({ title: it.title, msg: error.message });
      else results.ok += 1;
    }
    setBusy(false);
    if (results.ok > 0) {
      toast.success(`${results.ok} sifariş yaradıldı`);
      if (results.fail.length === 0) clear();
      else items.filter(i => !results.fail.find(f => f.title === i.title)).forEach(i => remove(i.id));
    }
    if (results.fail.length) {
      results.fail.forEach(f => toast.error(`${f.title}: ${f.msg}`));
    } else {
      navigate({ to: "/orders" });
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 grid place-items-center rounded-xl bg-neon/15 text-neon"><ShoppingCart className="h-5 w-5" /></div>
          <h1 className="font-display text-3xl font-bold">Səbət</h1>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Səbətin boşdur"
            description="Bəyəndiyin oyun, hesab və ya açarı səbətə əlavə et və bir kliklə ödə."
            ctaLabel="Marketə keç"
            ctaTo="/marketplace"
            secondaryLabel="Hədiyyə kartları"
            secondaryTo="/gift-cards"
          />
        ) : (
          <div className="grid lg:grid-cols-[1fr,360px] gap-6">
            <div className="space-y-3">
              {items.map(it => (
                <div key={it.id} className="rounded-2xl border border-border bg-card-gradient p-4 flex gap-4 items-center">
                  <img src={it.image} alt={it.title} className="h-20 w-20 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link to="/product/$slug" params={{ slug: it.slug }} className="font-semibold hover:text-neon line-clamp-2">{it.title}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5">Satıcı: {it.sellerName}</p>
                    <p className="text-sm font-display font-bold text-gradient mt-1">{format(it.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setQty(it.id, it.qty - 1)} className="h-8 w-8 grid place-items-center rounded-lg border border-border hover:bg-surface" aria-label="Azalt"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center font-semibold">{it.qty}</span>
                    <button onClick={() => setQty(it.id, it.qty + 1)} disabled={it.qty >= it.stock} className="h-8 w-8 grid place-items-center rounded-lg border border-border hover:bg-surface disabled:opacity-50" aria-label="Artır"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="text-right shrink-0 w-24">
                    <div className="font-display font-bold">{format(it.price * it.qty)}</div>
                    <button onClick={() => remove(it.id)} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1 mt-1">
                      <Trash2 className="h-3 w-3" /> Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="rounded-2xl border border-border bg-card-gradient p-5 h-fit lg:sticky lg:top-24">
              <h3 className="font-display font-bold text-lg mb-4">Ümumi məbləğ</h3>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Məhsullar ({items.length})</span>
                <span>{format(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-muted-foreground">Komissiya</span>
                <span className="text-success">Pulsuz</span>
              </div>

              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1.5 inline-flex items-center gap-1"><Tag className="h-3 w-3" /> Endirim kodu (istəyə görə)</label>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="PROMO2026"
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-neon"
                />
              </div>

              <div className="border-t border-border pt-3 flex items-center justify-between mb-4">
                <span className="font-semibold">Cəmi</span>
                <span className="font-display text-2xl font-bold text-gradient">{format(subtotal)}</span>
              </div>

              <button
                disabled={busy}
                onClick={checkout}
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-neon text-background font-bold neon-ring disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                {busy ? "Sifariş edilir..." : "Sifariş ver"}
              </button>
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Hər məhsul ayrı sifariş kimi yaradılacaq. Eyni satıcı ilə əvvəlki söhbət üzərindən danışılacaq.
              </p>
              <button onClick={clear} className="w-full mt-3 text-xs text-muted-foreground hover:text-destructive">Səbəti təmizlə</button>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
